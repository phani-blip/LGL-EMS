/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, MonthlyBreakdown, EmployeeSummary, LCARecord, PayrollRecord, ExpenseTransaction } from "../types";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Returns number of days in a specific month of a specific year
 * (month is 1-indexed, i.e., 1 = Jan, 12 = Dec)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Checks if firstDateStr is on or before secondDateStr
 */
export function isBeforeOrEqual(firstDateStr: string, secondDateStr: string): boolean {
  return new Date(firstDateStr) <= new Date(secondDateStr);
}

/**
 * Formats Date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats YYYY-MM-DD or other date formats into MM/DD/YYYY format.
 */
export function formatDateToMDY(dateStr: string): string {
  if (!dateStr) return "";
  // If already in MM/DD/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const first = parts[0];
    const second = parts[1];
    const third = parts[2];
    if (first.length === 4) {
      return `${second}/${third}/${first}`;
    }
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const yyyy = d.getUTCFullYear();
      return `${mm}/${dd}/${yyyy}`;
    }
  } catch (e) {}
  return dateStr;
}

/**
 * Finds the active LCA Record for a specific date YYYY-MM-DD
 */
export function findActiveLCARecord(lcaRecords: LCARecord[], dateStr: string): LCARecord | null {
  if (!lcaRecords || lcaRecords.length === 0) return null;
  
  // Sort records by effectiveFrom ascending
  const sorted = [...lcaRecords].sort((a, b) => 
    new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime()
  );

  let activeRecord: LCARecord | null = null;
  const targetTime = new Date(dateStr).getTime();

  for (const record of sorted) {
    const recordTime = new Date(record.effectiveFrom).getTime();
    if (recordTime <= targetTime) {
      if (record.tillDate && targetTime > new Date(record.tillDate).getTime()) {
        activeRecord = null;
      } else {
        activeRecord = record;
      }
    } else {
      break;
    }
  }

  return activeRecord;
}

/**
 * Calculates expected prorated LCA wage for a specific month of a specific year
 * based on LCA records and mid-year timing changes.
 */
export function calculateExpectedMonthlyLCA(
  lcaRecords: LCARecord[], 
  year: number, 
  month: number
): { expectedLCA: number; breakdownNotes: string } {
  if (!lcaRecords || lcaRecords.length === 0) {
    return { expectedLCA: 0, breakdownNotes: "No LCA record set" };
  }

  const daysInMonth = getDaysInMonth(year, month);
  let totalMonthlyExpected = 0;
  
  // Track continuous segments of different rates
  const segments: { rate: number; days: number; startDay: number; endDay: number }[] = [];
  let currentSegmentRate: number | null = null;
  let segmentStartDay = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const active = findActiveLCARecord(lcaRecords, dateStr);
    const rate = active ? active.annualWage : 0;

    if (day === 1) {
      currentSegmentRate = rate;
    } else if (rate !== currentSegmentRate) {
      segments.push({
        rate: currentSegmentRate || 0,
        days: day - segmentStartDay,
        startDay: segmentStartDay,
        endDay: day - 1,
      });
      currentSegmentRate = rate;
      segmentStartDay = day;
    }

    if (day === daysInMonth) {
      segments.push({
        rate: currentSegmentRate || 0,
        days: day - segmentStartDay + 1,
        startDay: segmentStartDay,
        endDay: day,
      });
    }
  }

  // Sum up prorated amounts for all segments
  // Formula: Sum of ((AnnualRate / 12) * (DaysInSegment / TotalDaysInMonth))
  const notesList: string[] = [];
  for (const seg of segments) {
    const monthProportion = seg.days / daysInMonth;
    const monthlyRate = seg.rate / 12;
    const proratedAmount = monthlyRate * monthProportion;
    totalMonthlyExpected += proratedAmount;

    if (segments.length > 1 && seg.rate > 0) {
      notesList.push(
        `${seg.days} days @ $${seg.rate.toLocaleString("en-US", { minimumFractionDigits: 2 })} ($${proratedAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })})`
      );
    }
  }

  let finalNotes = "";
  if (segments.length > 1) {
    finalNotes = "Prorated: " + notesList.join(" | ");
  } else if (segments.length === 1 && segments[0].rate > 0) {
    finalNotes = `Standard monthly LCA ($${(segments[0].rate / 12).toLocaleString("en-US", { minimumFractionDigits: 2 })}/mo)`;
  } else {
    finalNotes = "No active LCA rate";
  }

  return {
    expectedLCA: Number(totalMonthlyExpected.toFixed(2)),
    breakdownNotes: finalNotes,
  };
}

/**
 * Computes complete analysis for one employee for a given year
 */
export function calculateEmployeeSummary(
  employee: Employee, 
  year: number,
  calculationMode: "ytd" | "full" = "ytd"
): EmployeeSummary {
  const breakdown: MonthlyBreakdown[] = [];
  let expectedAnnualLCA = 0;
  let actualAnnualPayroll = 0;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-indexed

  for (let m = 1; m <= 12; m++) {
    // Map the row index m (which is the payment/entry month) to the corresponding period month/year (m - 1)
    const periodMonth = m === 1 ? 12 : m - 1;
    const periodYear = m === 1 ? year - 1 : year;

    const { expectedLCA, breakdownNotes } = calculateExpectedMonthlyLCA(employee.lcaRecords, periodYear, periodMonth);
    
    // Find matching payroll entries for this year and month
    const payrollEntries = employee.payrollRecords.filter(
      p => p.year === year && p.month === m
    );
    const actualPayroll = payrollEntries.reduce((sum, p) => sum + p.amount, 0);

    // Get number of days in the period month and calculate active working days (excluding LOA days of payment month)
    const daysInMonth = getDaysInMonth(periodYear, periodMonth);
    const totalLoaDays = Math.min(daysInMonth, payrollEntries.reduce((sum, p) => sum + (p.loaDays || 0), 0));
    const activeWorkingDays = daysInMonth - totalLoaDays;
    
    // Prorate expected LCA wage by the active working days ratio
    const adjustedExpectedLCA = Number((expectedLCA * (activeWorkingDays / daysInMonth)).toFixed(2));

    const difference = actualPayroll - adjustedExpectedLCA;
    const isMatching = difference >= 0; // compliant if payroll matches or exceeds LCA

    // Exclude future months in the current year.
    // E.g. in June (Month 6), the June payroll (covering May period) is completed. We exclude July (Month 7) and later.
    const isPendingOrFuture = (year === currentYear && m > currentMonth) || (year > currentYear);
    const isYtdExcluded = calculationMode === "ytd" && isPendingOrFuture;

    const actualPayrollPercent = adjustedExpectedLCA > 0 ? (actualPayroll / adjustedExpectedLCA) * 100 : 100;

    let notesText = breakdownNotes;
    if (totalLoaDays > 0) {
      notesText = `${notesText} (${totalLoaDays} days LOA)`;
    }
    if (isYtdExcluded) {
      const isActuallyFuture = (year === currentYear && m > (currentMonth + 1)) || (year > currentYear);
      notesText = `${notesText} (${isActuallyFuture ? "Future Excluded" : "Pending Payroll"})`;
    }

    breakdown.push({
      monthName: MONTH_NAMES[m - 1],
      monthNumber: m,
      year,
      expectedLCAWage: adjustedExpectedLCA,
      actualPayroll,
      actualPayrollPercent: Number(actualPayrollPercent.toFixed(1)),
      difference: Number(difference.toFixed(2)),
      isMatching: isYtdExcluded ? true : isMatching,
      notes: notesText,
      isFuture: isYtdExcluded,
    });

    if (!isYtdExcluded) {
      expectedAnnualLCA += adjustedExpectedLCA;
      actualAnnualPayroll += actualPayroll;
    }
  }

  const annualDifference = Number((actualAnnualPayroll - expectedAnnualLCA).toFixed(2));
  const hasDiscrepancies = annualDifference < 0;

  return {
    employee,
    expectedAnnualLCA: Number(expectedAnnualLCA.toFixed(2)),
    actualAnnualPayroll: Number(actualAnnualPayroll.toFixed(2)),
    annualDifference,
    hasDiscrepancies,
    monthlyBreakdown: breakdown,
  };
}

/**
 * /**
 * Formats a Date to YYYY-MM-DD format (ISO style) for internal database uniformity
 */
export function formatDateToISO(dateStr: string): string {
  if (!dateStr) return "";
  // Check if it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const m = parts[0].padStart(2, "0");
    const d = parts[1].padStart(2, "0");
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch (e) {}
  return dateStr;
}

/**
 * Downloads data as a CSV file in the browser
 */
export function downloadCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads data as an Excel file in the browser (HTML Spreadsheet format)
 */
export function downloadExcel(htmlContent: string, fileName: string) {
  const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Native printing handler to show styled reports and trigger PDF Save/Print
 */
export function printReport(htmlContent: string, title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print/export as PDF.");
    return;
  }
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background-color: #fff; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 15px; margin-bottom: 25px; }
          h1 { color: #1e3a8a; font-size: 22px; margin: 0; font-weight: 800; }
          .subtitle { color: #64748b; font-size: 11px; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background-color: #f8fafc; color: #475569; font-weight: 700; border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; }
          td { border: 1px solid #e2e8f0; padding: 10px 12px; vertical-align: top; font-size: 11.5px; color: #334155; }
          tr:nth-child(even) { background-color: #fbfcfd; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .status-compliant { background-color: #dcfce7; color: #15803d; font-weight: bold; text-align: center; border-radius: 4px; padding: 3px 8px; display: inline-block; font-size: 10px; text-transform: uppercase; }
          .status-underpaid { background-color: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; border-radius: 4px; padding: 3px 8px; display: inline-block; font-size: 10px; text-transform: uppercase; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 25px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .meta-item { font-size: 12.5px; }
          .meta-lbl { font-weight: 700; color: #475569; margin-right: 5px; }
          .meta-val { color: #0f172a; }
          .badge { border-radius: 4px; padding: 2px 6px; font-weight: 600; font-size: 10px; display: inline-block; }
          .badge-blue { background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
          .badge-teal { background-color: #f0fdf4; color: #115e59; border: 1px solid #99f6e4; }
          .explanation { font-size: 10px; color: #64748b; margin-top: 3px; font-style: italic; }
          @media print {
            body { padding: 0; }
            @page { margin: 1.6cm; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 350);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Generates the import template CSV content (LCA & Compliance)
 */
export function getCSVTemplate(): string {
  const headers = [
    "Name",
    "LCA Number",
    "Wages",
    "Start Date",
    "End Date",
    "Work Address Line 1",
    "Work Address Line 2",
    "Work City",
    "Work County",
    "Work State",
    "Work Zip",
    "Home Address Line 1",
    "Home Address Line 2",
    "Home City",
    "Home County",
    "Home State",
    "Home Zip"
  ];
  const demoRows = [
    "Alex Rivera,I-200-25310-482091,95000,01/01/2026,06/11/2026,100 Pine St,,San Francisco,San Francisco,CA,94111,450 Sutter St,Apt 12B,San Francisco,San Francisco,CA,94108",
    "Elena Rostova,I-200-26150-983141,112000,01/01/2026,12/31/2026,1 Oracle Way,,Redwood City,San Mateo,CA,94065,123 Main St,,San Jose,Santa Clara,CA,95112"
  ];
  return [headers.join(","), ...demoRows].join("\n");
}

/**
 * Generates the import template CSV content for Expenses
 */
export function getExpenseCSVTemplate(): string {
  const headers = [
    "Name",
    "Date",
    "Details",
    "Amount"
  ];
  const demoRows = [
    "Alex Rivera,05/14/2026,Company disbursed advance cash,-500.00",
    "Alex Rivera,05/17/2026,Employee paid back unused balance,200.00"
  ];
  return [headers.join(","), ...demoRows].join("\n");
}

/**
 * Generates the simple import template CSV content for Employee List only
 */
export function getEmployeeListTemplate(): string {
  const headers = [
    "Name",
    "Email",
    "Job Title",
    "Department"
  ];
  const demoRows = [
    "Marcus Aurelius,marcus.a@globaltech.com,Marketing Strategist,Marketing",
    "Diana Prince,diana.prince@globaltech.com,Legal Counsel,Legal & Compliance"
  ];
  return [headers.join(","), ...demoRows].join("\n");
}

/**
 * Exports multiple employee summaries and their comparison matrix to a CSV file (All Years)
 */
export function exportDashboardToCSV(employees: Employee[], calculationMode: "ytd" | "full" = "ytd"): string {
  const years = [2025, 2026, 2027];
  const rows = [
    "LCA vs Payroll Audit Dashboard Report (All Years)",
    "Generated: " + new Date().toLocaleDateString(),
    "",
    "Employee ID,Full Name,Email,Job Title,Audit Year,Expected Annual LCA,Actual Annual Payroll,Annual Difference,Compliance Status"
  ];

  for (const emp of employees) {
    for (const yr of years) {
      const s = calculateEmployeeSummary(emp, yr, calculationMode);
      if (s.expectedAnnualLCA > 0 || s.actualAnnualPayroll > 0) {
        const status = s.annualDifference >= 0 ? "Compliant" : "Non-Compliant (Underpaid)";
        rows.push(
          [
            emp.employeeId,
            `"${emp.fullName.replace(/"/g, '""')}"`,
            emp.email,
            `"${emp.title.replace(/"/g, '""')}"`,
            yr,
            s.expectedAnnualLCA,
            s.actualAnnualPayroll,
            s.annualDifference,
            status,
          ].join(",")
        );
      }
    }
  }

  return rows.join("\n");
}

/**
 * Exports details of a single employee to CSV (All Years)
 */
export function exportEmployeeDetailToCSV(employee: Employee, calculationMode: "ytd" | "full" = "ytd"): string {
  const e = employee;
  const years = [2025, 2026, 2027];
  
  const rows = [
    "Employee LCA Compliance History Report (All Years)",
    `Employee: ${e.fullName} (${e.employeeId})`,
    `Email: ${e.email}`,
    `Title: ${e.title}`,
    "",
    "LCA RECORDS HISTORY",
    "LCA Case Number,Annual Wage,Effective From,Expiration Date,Client Address,Home Address",
    ...e.lcaRecords.map(r => [
      `"${(r.lcaNumber || "").replace(/"/g, '""')}"`,
      r.annualWage,
      formatDateToMDY(r.effectiveFrom),
      r.tillDate ? formatDateToMDY(r.tillDate) : "N/A",
      `"${(r.clientAddress || "").replace(/"/g, '""')}"`,
      `"${(r.residenceAddress || "").replace(/"/g, '""')}"`
    ].join(",")),
    "",
    "MONTHLY AUDIT BREAKDOWN HISTORY",
    "Year,Month,Expected LCA,Actual Payroll Paid,Monthly Difference,Compliance,Calculation Notes"
  ];

  for (const yr of years) {
    const summary = calculateEmployeeSummary(e, yr, calculationMode);
    const hasData = summary.monthlyBreakdown.some(m => m.expectedLCAWage > 0 || m.actualPayroll > 0);
    if (!hasData) continue;

    for (const m of summary.monthlyBreakdown) {
      const status = m.difference >= 0 ? "Compliant" : "Underpaid";
      rows.push(
        [
          yr,
          m.monthName,
          m.expectedLCAWage,
          m.actualPayroll,
          m.difference,
          status,
          `"${m.notes.replace(/"/g, '""')}"`
        ].join(",")
      );
    }
  }

  return rows.join("\n");
}

/**
 * Generates an explanation message for any automated calculations used within an expense transaction
 */
export function generateCalculationExplanation(txn: ExpenseTransaction): string {
  const custom = txn.customFields || {};
  const hasProject = "Project" in custom && custom["Project"];
  const hasHrs = "Hrs" in custom && custom["Hrs"];
  const hasRate = "Rate" in custom && custom["Rate"];
  const hasTotal = "Total" in custom && custom["Total"];
  
  if (hasHrs || hasRate || hasTotal || hasProject) {
    const project = custom["Project"] || "N/A";
    const hrs = custom["Hrs"] || "0.00";
    const rate = custom["Rate"] || "$0.00";
    const total = custom["Total"] || "$0.00";
    const empTax = custom["Employee Tax"] || "$0.00";
    const erTax = custom["Employer Tax"] || "$0.00";
    const ins = custom["Insurance"] || "$0.00";
    
    return `Worksheet details for Project [${project}]: Base calculation = ${hrs} hrs * ${rate} = ${total}. Deductions applied: Employee Tax (${empTax}), Employer Tax (${erTax}), Insurance (${ins}). Net Transaction Value: $${Math.abs(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}.`;
  }
  
  return "Standard direct entry (no custom calculations worksheet applied).";
}

/**
 * Exports expenses of a single employee to CSV (All Years)
 */
export function exportEmployeeExpensesToCSV(employee: Employee): string {
  const e = employee;
  const txns = e.expenseTransactions || [];
  
  // Split paid vs received
  const paidTxns = txns.filter(txn => txn.amount < 0);
  const receivedTxns = txns.filter(txn => txn.amount > 0);

  // Calculations
  const totalPaid = paidTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReceived = receivedTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netOutstandingBalance = totalPaid - totalReceived;

  const escape = (val: any): string => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = [
    "Employee Activity Expense Advance & Offset Ledger (All Years)",
    `Employee: ${e.fullName} (${e.employeeId})`,
    `Email: ${e.email}`,
    `Job Title: ${e.title}`,
    "Generated: " + new Date().toLocaleDateString(),
    "",
    "EXPENSE LEDGER SUMMARY BALANCE OVERVIEW (USD):",
    `"Total LGL Paid (Disbursed Outwards / Cash Advances)","$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}"`,
    `"Total LGL Received (Returned Inwards / Offset / Recoupment)","$${totalReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}"`,
    `"Final Outstanding Balance (Net Cash Paid Less Received)","$${netOutstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}"`,
    "",
    "SIDE-BY-SIDE LEDGER TRANSACTIONS:",
    [
      "LGL PAID (DISBURSED OUTWARD)", "", "", "", "",
      "",
      "LGL RECEIVED (RETURNED BACK / RECOUPMENT)", "", "", "", ""
    ].join(","),
    [
      "Paid ID", "Paid Date", "Paid Details", "Paid Amount (USD)", "Paid Worksheet & Explanation",
      "",
      "Received ID", "Received Date", "Received Details", "Received Amount (USD)", "Received Worksheet & Explanation"
    ].join(",")
  ];

  const maxRows = Math.max(paidTxns.length, receivedTxns.length);

  for (let i = 0; i < maxRows; i++) {
    const pTx = paidTxns[i];
    const rTx = receivedTxns[i];

    let paidParts: string[];
    if (pTx) {
      paidParts = [
        escape(pTx.id),
        escape(formatDateToMDY(pTx.date)),
        escape(pTx.details),
        escape(`$${Math.abs(pTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`),
        escape(generateCalculationExplanation(pTx))
      ];
    } else {
      paidParts = ["", "", "", "", ""];
    }

    let receivedParts: string[];
    if (rTx) {
      receivedParts = [
        escape(rTx.id),
        escape(formatDateToMDY(rTx.date)),
        escape(rTx.details),
        escape(`$${Math.abs(rTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`),
        escape(generateCalculationExplanation(rTx))
      ];
    } else {
      receivedParts = ["", "", "", "", ""];
    }

    const row = [...paidParts, "", ...receivedParts].join(",");
    rows.push(row);
  }

  return rows.join("\n");
}

/**
 * Parses individual rows of a CSV import
 */
export function parseCSV(text: string): Record<string, any>[] {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let insideQuotes = false;
    let currentValue = "";

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const cleanValues = values.map(v => v.replace(/^"|"$/g, ""));

    const item: Record<string, string> = {};
    headers.forEach((hdr, idx) => {
      if (idx < cleanValues.length) {
        item[hdr] = cleanValues[idx];
      } else {
        item[hdr] = "";
      }
    });
    records.push(item);
  }

  return records;
}

/**
 * Exports all expense transactions across all employees to a CSV file (All Years)
 */
export function exportExpensesToCSV(employees: Employee[]): string {
  interface Item {
    emp: Employee;
    txn: ExpenseTransaction;
  }
  const allTxns: Item[] = [];
  employees.forEach(emp => {
    (emp.expenseTransactions || []).forEach(txn => {
      allTxns.push({ emp, txn });
    });
  });

  allTxns.sort((a, b) => {
    const timeA = new Date(a.txn.date).getTime() || 0;
    const timeB = new Date(b.txn.date).getTime() || 0;
    return timeA - timeB;
  });

  const paidItems = allTxns.filter(item => item.txn.amount < 0);
  const receivedItems = allTxns.filter(item => item.txn.amount > 0);

  const totalPaid = paidItems.reduce((sum, item) => sum + Math.abs(item.txn.amount), 0);
  const totalReceived = receivedItems.reduce((sum, item) => sum + Math.abs(item.txn.amount), 0);
  const netOutstandingBalance = totalPaid - totalReceived;

  const escape = (val: any): string => {
    if (val === undefined || val === null) return "";
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = [
    "All Employees Expense Advance & Offset Compliance Ledger (All Years)",
    "Generated: " + new Date().toLocaleDateString(),
    "",
    "TOTAL COMPLIANCE LEDGER SUMMARY BALANCE OVERVIEW (USD):",
    `"Total LGL Paid (Disbursed Out across all employees)","$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}"`,
    `"Total LGL Received (Returned Back across all employees)","$${totalReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}"`,
    `"Final Outstanding Balance (Total Net Due for all employees)","$${netOutstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}"`,
    "",
    "SIDE-BY-SIDE ALL-EMPLOYEE LEDGER TRANSACTIONS:",
    [
      "LGL PAID (DISBURSED OUTWARDS)", "", "", "", "", "", "",
      "",
      "LGL RECEIVED (RETURNED INWARDS / RECOUPMENTS)", "", "", "", "", "", ""
    ].join(","),
    [
      "Emp ID", "Emp Name", "Paid ID", "Paid Date", "Paid Details", "Paid Amount (USD)", "Paid Worksheet & Explanation",
      "",
      "Emp ID", "Emp Name", "Received ID", "Received Date", "Received Details", "Received Amount (USD)", "Received Worksheet & Explanation"
    ].join(",")
  ];

  const maxRows = Math.max(paidItems.length, receivedItems.length);

  for (let i = 0; i < maxRows; i++) {
    const pItem = paidItems[i];
    const rItem = receivedItems[i];

    let paidParts: string[];
    if (pItem) {
      paidParts = [
        escape(pItem.emp.employeeId),
        escape(pItem.emp.fullName),
        escape(pItem.txn.id),
        escape(formatDateToMDY(pItem.txn.date)),
        escape(pItem.txn.details),
        escape(`$${Math.abs(pItem.txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`),
        escape(generateCalculationExplanation(pItem.txn))
      ];
    } else {
      paidParts = ["", "", "", "", "", "", ""];
    }

    let receivedParts: string[];
    if (rItem) {
      receivedParts = [
        escape(rItem.emp.employeeId),
        escape(rItem.emp.fullName),
        escape(rItem.txn.id),
        escape(formatDateToMDY(rItem.txn.date)),
        escape(rItem.txn.details),
        escape(`$${Math.abs(rItem.txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`),
        escape(generateCalculationExplanation(rItem.txn))
      ];
    } else {
      receivedParts = ["", "", "", "", "", "", ""];
    }

    const row = [...paidParts, "", ...receivedParts].join(",");
    rows.push(row);
  }

  return rows.join("\n");
}

/**
 * Imports CSV and merges it into our Employee state schema (supports LCA, Payroll, and Expenses)
 * Only fullName (Name) is strictly required; other fields are parsed optionally.
 * If employeeId is missing, looks up existing records by full name case-insensitively, or generates unique ID.
 */
export function importEmployeesFromCSV(csvText: string, currentEmployees: Employee[]): {
  successList: string[];
  errors: string[];
  updatedEmployees: Employee[];
} {
  const records = parseCSV(csvText);
  if (records.length === 0) {
    return { successList: [], errors: ["CSV file is empty or missing headers."], updatedEmployees: currentEmployees };
  }

  const errors: string[] = [];
  const successList: string[] = [];
  
  // Create a working map keyed by employeeId (case insensitive)
  const empMap = new Map<string, Employee>();
  currentEmployees.forEach(e => {
    empMap.set(e.employeeId.toUpperCase(), JSON.parse(JSON.stringify(e)));
  });

  let rowNum = 1;
  for (const raw of records) {
    rowNum++;
    
    // Look up variables dynamically by mapping raw fields flexibly
    const empId = (raw["Employee ID"] || raw["employeeId"] || raw["EmployeeID"] || "").trim();
    const fullName = (raw["Name"] || raw["Full Name"] || raw["fullName"] || raw["Employee Name"] || "").trim();
    const email = (raw["Email"] || raw["email"] || "").trim();
    const title = (raw["Job Title"] || raw["JobTitle"] || raw["title"] || "").trim();
    const department = (raw["Department"] || raw["department"] || "").trim();
    
    // LCA fields
    const annualWageStr = (raw["Wages"] || raw["Annual LCA Wage"] || raw["annualWage"] || "").trim();
    const effectiveFromStr = (raw["Start Date"] || raw["LCA Effective From (YYYY-MM-DD)"] || raw["LCA Effective From (MM/DD/YYYY)"] || raw["effectiveFrom"] || "").trim();
    const lcaNumber = (raw["LCA Number"] || raw["LCA Case Number"] || raw["lcaNumber"] || "").trim();
    const lcaExpirationStr = (raw["End Date"] || raw["LCA Expiration Date (YYYY-MM-DD)"] || raw["LCA Expiration Date (MM/DD/YYYY)"] || raw["tillDate"] || "").trim();
    
    // Work Address components
    const clientAddress1 = (raw["Work Address Line 1"] || raw["Work Address line 1"] || raw["Work Address 1"] || raw["clientAddress1"] || "").trim();
    const clientAddress2 = (raw["Work Address Line 2"] || raw["Work Address line 2"] || raw["Work Address 2"] || raw["clientAddress2"] || "").trim();
    const clientCity = (raw["Work City"] || raw["clientCity"] || "").trim();
    const clientCounty = (raw["Work County"] || raw["clientCounty"] || "").trim();
    const clientState = (raw["Work State"] || raw["clientState"] || "").trim();
    const clientZip = (raw["Work Zip"] || raw["clientZip"] || "").trim();

    // Home Address components
    const residenceAddress1 = (raw["Home Address Line 1"] || raw["Home Address line 1"] || raw["Home Address 1"] || raw["residenceAddress1"] || "").trim();
    const residenceAddress2 = (raw["Home Address Line 2"] || raw["Home Address line 2"] || raw["Home Address 2"] || raw["residenceAddress2"] || "").trim();
    const residenceCity = (raw["Home City"] || raw["residenceCity"] || "").trim();
    const residenceCounty = (raw["Home County"] || raw["residenceCounty"] || "").trim();
    const residenceState = (raw["Home State"] || raw["residenceState"] || "").trim();
    const residenceZip = (raw["Home Zip"] || raw["residenceZip"] || "").trim();

    // Compile flat addresses for fallback if components exist
    const compiledClient = clientAddress1 
      ? [clientAddress1, clientAddress2, clientCity, clientState, clientZip].filter(Boolean).join(", ") 
      : (raw["Client Address"] || raw["Work Address"] || raw["clientAddress"] || "").trim();

    const compiledResidence = residenceAddress1 
      ? [residenceAddress1, residenceAddress2, residenceCity, residenceState, residenceZip].filter(Boolean).join(", ") 
      : (raw["Home Address"] || raw["Residence Address"] || raw["residenceAddress"] || "").trim();

    // Payroll fields
    const payrollYearStr = (raw["Payroll Year"] || "").trim();
    const payrollMonthStr = (raw["Payroll Month (1-12)"] || "").trim();
    const payrollAmountStr = (raw["Payroll Amount"] || "").trim();
    const loaDaysStr = (raw["LOA Days"] || raw["loaDays"] || raw["LOA"] || "").trim();

    // Expense fields
    const expenseDateStr = (raw["Date"] || raw["data"] || raw["Expense Date"] || raw["expenseDate"] || "").trim();
    const expenseDetailsStr = (raw["Details"] || raw["Expense Details"] || raw["Expense Description"] || raw["expenseDetails"] || "").trim();
    const expenseAmountStr = (raw["Amount"] || raw["Expense Amount"] || raw["expenseAmount"] || "").trim();

    // Check Name / ID requirement: Except for Name/ID, all other fields are optional
    if (!fullName && !empId) {
      errors.push(`Row ${rowNum}: Employee Name or Employee ID is required.`);
      continue;
    }

    let emp: Employee | undefined = undefined;

    // 1. Try matching by Employee ID if provided
    if (empId) {
      emp = empMap.get(empId.toUpperCase());
    }

    // 2. Try matching by Full Name case-insensitively if not found by ID
    if (!emp && fullName) {
      const searchName = fullName.trim().toLowerCase();
      for (const e of empMap.values()) {
        if (e.fullName.trim().toLowerCase() === searchName) {
          emp = e;
          break;
        }
      }
    }

    // 3. Create a new employee profile if not found
    if (!emp) {
      let resolvedEmpId = empId;
      if (!resolvedEmpId) {
        // Generate unique 6-digit random Employee ID
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 100) {
          const rand = Math.floor(100000 + Math.random() * 900000);
          const candidate = `EMP-${rand}`;
          // Check if candidate is already taken
          let taken = false;
          for (const e of empMap.values()) {
            if (e.employeeId.toUpperCase() === candidate) {
              taken = true;
              break;
            }
          }
          if (!taken) {
            resolvedEmpId = candidate;
            isUnique = true;
          }
          attempts++;
        }
        if (!resolvedEmpId) {
          resolvedEmpId = `EMP-${Date.now()}`;
        }
      }

      emp = {
        id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        employeeId: resolvedEmpId,
        fullName: fullName || "New Employee",
        email: email || "",
        title: title || "Associate",
        department: department || "Operations",
        lcaRecords: [],
        payrollRecords: [],
        expenseTransactions: [],
        expenseColumns: [],
      };
      empMap.set(resolvedEmpId.toUpperCase(), emp);
      successList.push(`Created Employee Profile: ${fullName || resolvedEmpId} (ID: ${resolvedEmpId})`);
    } else {
      // If employee exists, merge metadata fields if provided in row
      if (fullName) emp.fullName = fullName;
      if (email) emp.email = email;
      if (title) emp.title = title;
      if (department) emp.department = department;
    }

    // 4. Process LCA Record (only if wage and start date are provided)
    if (annualWageStr && effectiveFromStr) {
      const wage = parseFloat(annualWageStr.replace(/[^0-9.]/g, ""));
      if (isNaN(wage)) {
        errors.push(`Row ${rowNum}: Invalid LCA Wage format '${annualWageStr}' for ${emp.fullName}`);
      } else {
        const isoStart = formatDateToISO(effectiveFromStr);
        const isoEnd = lcaExpirationStr ? formatDateToISO(lcaExpirationStr) : undefined;
        
        // Find existing record with same effectiveFrom
        const existingLCA = emp.lcaRecords.find(r => r.effectiveFrom === isoStart);
        if (existingLCA) {
          existingLCA.annualWage = wage;
          if (lcaNumber) existingLCA.lcaNumber = lcaNumber;
          if (isoEnd) existingLCA.tillDate = isoEnd;
          
          if (clientAddress1) existingLCA.clientAddress1 = clientAddress1;
          if (clientAddress2) existingLCA.clientAddress2 = clientAddress2;
          if (clientCity) existingLCA.clientCity = clientCity;
          if (clientCounty) existingLCA.clientCounty = clientCounty;
          if (clientState) existingLCA.clientState = clientState;
          if (clientZip) existingLCA.clientZip = clientZip;
          if (compiledClient) existingLCA.clientAddress = compiledClient;

          if (residenceAddress1) existingLCA.residenceAddress1 = residenceAddress1;
          if (residenceAddress2) existingLCA.residenceAddress2 = residenceAddress2;
          if (residenceCity) existingLCA.residenceCity = residenceCity;
          if (residenceCounty) existingLCA.residenceCounty = residenceCounty;
          if (residenceState) existingLCA.residenceState = residenceState;
          if (residenceZip) existingLCA.residenceZip = residenceZip;
          if (compiledResidence) existingLCA.residenceAddress = compiledResidence;
        } else {
          emp.lcaRecords.push({
            id: `lca_${Math.random().toString(36).substr(2, 5)}`,
            annualWage: wage,
            effectiveFrom: isoStart,
            lcaNumber: lcaNumber || undefined,
            tillDate: isoEnd || undefined,
            
            clientAddress: compiledClient || undefined,
            clientAddress1: clientAddress1 || undefined,
            clientAddress2: clientAddress2 || undefined,
            clientCity: clientCity || undefined,
            clientCounty: clientCounty || undefined,
            clientState: clientState || undefined,
            clientZip: clientZip || undefined,

            residenceAddress: compiledResidence || undefined,
            residenceAddress1: residenceAddress1 || undefined,
            residenceAddress2: residenceAddress2 || undefined,
            residenceCity: residenceCity || undefined,
            residenceCounty: residenceCounty || undefined,
            residenceState: residenceState || undefined,
            residenceZip: residenceZip || undefined,
          });
        }
        successList.push(`Configured LCA wage of $${wage.toLocaleString()} / yr (Effective: ${formatDateToMDY(isoStart)}) for ${emp.fullName}`);
      }
    } else if (annualWageStr || effectiveFromStr) {
      errors.push(`Row ${rowNum}: LCA requires both Wages and Start Date.`);
    }

    // 5. Process Payroll Record (if provided)
    if (payrollYearStr && payrollMonthStr && payrollAmountStr) {
      const pYear = parseInt(payrollYearStr);
      const pMonth = parseInt(payrollMonthStr);
      const pAmount = parseFloat(payrollAmountStr.replace(/[^0-9.]/g, ""));
      const loaDaysVal = loaDaysStr ? parseInt(loaDaysStr) : 0;

      if (isNaN(pYear) || isNaN(pMonth) || pMonth < 1 || pMonth > 12 || isNaN(pAmount)) {
        errors.push(`Row ${rowNum}: Invalid payroll record entries (Year/Month/Amount) for ${emp.fullName}`);
      } else {
        const existingPayroll = emp.payrollRecords.find(p => p.year === pYear && p.month === pMonth);
        if (existingPayroll) {
          existingPayroll.amount = pAmount;
          if (!isNaN(loaDaysVal) && loaDaysVal > 0) {
            existingPayroll.loaDays = loaDaysVal;
          }
        } else {
          emp.payrollRecords.push({
            id: `pay_${Math.random().toString(36).substr(2, 5)}`,
            year: pYear,
            month: pMonth,
            amount: pAmount,
            loaDays: (!isNaN(loaDaysVal) && loaDaysVal > 0) ? loaDaysVal : undefined,
          });
        }
        successList.push(`Added Payroll entry for ${pMonth}/${pYear} of $${pAmount.toLocaleString()}${(!isNaN(loaDaysVal) && loaDaysVal > 0) ? ` with ${loaDaysVal} LOA days` : ""} for ${emp.fullName}`);
      }
    }

    // 6. Process Expense Record (only if Amount is provided)
    if (expenseAmountStr) {
      // Support positive and negative amounts
      const expAmt = parseFloat(expenseAmountStr.replace(/[^0-9.-]/g, ""));
      if (isNaN(expAmt)) {
        errors.push(`Row ${rowNum}: Invalid expense amount '${expenseAmountStr}' for ${emp.fullName}`);
      } else {
        const convertedDate = expenseDateStr ? formatDateToMDY(expenseDateStr) : new Date().toLocaleDateString("en-US");
        const detailsVal = expenseDetailsStr || (expAmt < 0 ? "Disbursed advance cash" : "Returned offset / recoupment");

        // Map any dynamic custom columns
        const standardKeys = new Set([
          "Employee ID", "employeeId",
          "Name", "Full Name", "fullName", "Employee Name",
          "Email", "email",
          "Job Title", "title", "JobTitle",
          "Department", "department",
          "Wages", "Annual LCA Wage", "annualWage",
          "Start Date", "LCA Effective From (YYYY-MM-DD)", "effectiveFrom",
          "End Date", "LCA Expiration Date (YYYY-MM-DD)", "tillDate",
          "Client Address", "clientAddress",
          "Home Address", "residenceAddress",
          "Payroll Year", "Payroll Month (1-12)", "Payroll Amount",
          "Date", "data", "Expense Date", "expenseDate",
          "Details", "Expense Details", "Expense Description", "expenseDetails",
          "Amount", "Expense Amount", "expenseAmount"
        ]);

        const customFields: Record<string, string> = {};
        const empCols = emp.expenseColumns || [];
        const newCols = [...empCols];

        Object.keys(raw).forEach(key => {
          if (!standardKeys.has(key)) {
            const val = (raw[key] || "").trim();
            if (val) {
              customFields[key] = val;
              if (!newCols.includes(key)) {
                newCols.push(key);
              }
            }
          }
        });

        emp.expenseColumns = newCols;
        if (!emp.expenseTransactions) {
          emp.expenseTransactions = [];
        }

        emp.expenseTransactions.push({
          id: `exp_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`,
          date: convertedDate,
          details: detailsVal,
          amount: expAmt,
          customFields
        });

        successList.push(`Logged Expense transaction of $${expAmt} on ${convertedDate} for ${emp.fullName}`);
      }
    }
  }

  return {
    successList,
    errors,
    updatedEmployees: Array.from(empMap.values()),
  };
}

/**
 * Wrap Excel content into Microsoft Excel HTML spreadsheet container
 */
function wrapInExcelHtml(bodyContent: string, title: string): string {
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${title.replace(/[:\/\\\?\*\[\]]/g, "").substring(0, 31)}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; }
        h1 { color: #1e3a8a; font-size: 16pt; margin-bottom: 5px; font-weight: bold; }
        h2 { color: #64748b; font-size: 11pt; margin-top: 2px; margin-bottom: 20px; font-weight: normal; }
        h3 { color: #0f172a; font-size: 12pt; margin-top: 25px; margin-bottom: 8px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        table { border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
        th { font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 10pt; color: #0f172a; }
        td { border: 1px solid #e2e8f0; padding: 7px 10px; vertical-align: top; font-size: 9.5pt; }
        .bg-gray { background-color: #f8fafc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .status-compliant { background-color: #dcfce7; color: #15803d; font-weight: bold; text-align: center; }
        .status-underpaid { background-color: #fee2e2; color: #b91c1c; font-weight: bold; text-align: center; }
        .meta-box { border: 1px solid #cbd5e1; margin-bottom: 20px; }
        .meta-lbl { font-weight: bold; color: #475569; background-color: #f8fafc; padding: 6px; }
        .meta-val { padding: 6px; }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `;
}

/**
 * Exports multiple employee summaries to a styled Excel Sheet (All Years)
 */
export function exportDashboardToExcel(employees: Employee[], calculationMode: "ytd" | "full" = "ytd"): string {
  const years = [2025, 2026, 2027];
  let html = `
    <h1>LGL LCA vs Payroll Compliance Audit Report (All Years)</h1>
    <h2>Generated: ${new Date().toLocaleDateString()} | Calculation Mode: ${calculationMode.toUpperCase()}</h2>
    <table>
      <thead>
        <tr>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Employee ID</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Full Name</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Email</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Job Title</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;"><font color="#1e40af">Audit Year</font></th>
          <th class="text-right" style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#1e40af">Expected Annual LCA</font></th>
          <th class="text-right" style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#1e40af">Actual Annual Payroll</font></th>
          <th class="text-right" style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#1e40af">Annual Difference</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;"><font color="#1e40af">Compliance Status</font></th>
        </tr>
      </thead>
      <tbody>
  `;

  let idx = 0;
  for (const emp of employees) {
    for (const yr of years) {
      const s = calculateEmployeeSummary(emp, yr, calculationMode);
      if (s.expectedAnnualLCA > 0 || s.actualAnnualPayroll > 0) {
        const isCompliant = s.annualDifference >= 0;
        const statusText = isCompliant ? "Compliant" : "Underpaid";
        const statusClass = isCompliant ? "status-compliant" : "status-underpaid";
        const rowClass = idx % 2 === 0 ? "bg-gray" : "";
        
        html += `
          <tr class="${rowClass}">
            <td>${emp.employeeId}</td>
            <td class="font-bold">${emp.fullName}</td>
            <td>${emp.email}</td>
            <td>${emp.title}</td>
            <td class="text-center">${yr}</td>
            <td class="text-right">$${s.expectedAnnualLCA.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            <td class="text-right">$${s.actualAnnualPayroll.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-bold" style="color: ${isCompliant ? '#15803d' : '#b91c1c'};">$${s.annualDifference.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
            <td class="${statusClass}">${statusText}</td>
          </tr>
        `;
        idx++;
      }
    }
  }

  html += `
      </tbody>
    </table>
  `;

  return wrapInExcelHtml(html, "LCA Audit Dashboard");
}

/**
 * Exports historical compliance breakdown of a single employee to a styled Excel Sheet (All Years)
 */
export function exportEmployeeDetailToExcel(employee: Employee, calculationMode: "ytd" | "full" = "ytd"): string {
  const e = employee;
  const years = [2025, 2026, 2027];
  
  let html = `
    <h1>Employee LCA Compliance Report</h1>
    <h2>Employee: ${e.fullName} (${e.employeeId}) | Job Title: ${e.title}</h2>
    
    <table class="meta-box">
      <tr>
        <td class="meta-lbl">Full Name</td><td class="meta-val font-bold">${e.fullName}</td>
        <td class="meta-lbl">Employee ID</td><td class="meta-val">${e.employeeId}</td>
      </tr>
      <tr>
        <td class="meta-lbl">Job Title</td><td class="meta-val">${e.title}</td>
        <td class="meta-lbl">Department</td><td class="meta-val">${e.department}</td>
      </tr>
      <tr>
        <td class="meta-lbl">Email Address</td><td class="meta-val" colspan="3">${e.email}</td>
      </tr>
    </table>

    <h3>LCA RECORDS HISTORY</h3>
    <table>
      <thead>
        <tr>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">LCA Case Number</font></th>
          <th class="text-right" style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#1e40af">Annual Wage</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Effective From</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Expiration Date</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Client Address</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Home Address</font></th>
        </tr>
      </thead>
      <tbody>
  `;
  
  e.lcaRecords.forEach((r, idx) => {
    const rowClass = idx % 2 === 0 ? "bg-gray" : "";
    html += `
      <tr class="${rowClass}">
        <td>${r.lcaNumber || "N/A"}</td>
        <td class="text-right font-bold">$${r.annualWage.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        <td>${formatDateToMDY(r.effectiveFrom)}</td>
        <td>${r.tillDate ? formatDateToMDY(r.tillDate) : "N/A"}</td>
        <td>${r.clientAddress || "N/A"}</td>
        <td>${r.residenceAddress || "N/A"}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
    
    <h3>MONTHLY AUDIT BREAKDOWN HISTORY (ALL YEARS)</h3>
    <table>
      <thead>
        <tr>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;"><font color="#1e40af">Year</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Month</font></th>
          <th class="text-right" style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#1e40af">Expected LCA Wage</font></th>
          <th class="text-right" style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#1e40af">Actual Payroll Paid</font></th>
          <th class="text-right" style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#1e40af">Monthly Difference</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center;"><font color="#1e40af">Compliance</font></th>
          <th style="background-color: #dbeafe; color: #1e40af; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#1e40af">Calculation Notes</font></th>
        </tr>
      </thead>
      <tbody>
  `;
  
  let rowIdx = 0;
  for (const yr of years) {
    const summary = calculateEmployeeSummary(e, yr, calculationMode);
    const hasData = summary.monthlyBreakdown.some(m => m.expectedLCAWage > 0 || m.actualPayroll > 0);
    if (!hasData) continue;
    
    for (const m of summary.monthlyBreakdown) {
      const isCompliant = m.difference >= 0;
      const statusText = isCompliant ? "Compliant" : "Underpaid";
      const statusClass = isCompliant ? "status-compliant" : "status-underpaid";
      const rowClass = rowIdx % 2 === 0 ? "bg-gray" : "";
      
      html += `
        <tr class="${rowClass}">
          <td class="text-center font-bold">${yr}</td>
          <td>${m.monthName}</td>
          <td class="text-right">$${m.expectedLCAWage.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td class="text-right">$${m.actualPayroll.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td class="text-right font-bold" style="color: ${isCompliant ? '#15803d' : '#b91c1c'};">$${m.difference.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
          <td class="${statusClass}">${statusText}</td>
          <td style="font-size: 8.5pt; color: #475569;">${m.notes}</td>
        </tr>
      `;
      rowIdx++;
    }
  }
  
  html += `
      </tbody>
    </table>
  `;
  
  return wrapInExcelHtml(html, `${e.fullName} Compliance Report`);
}

/**
 * Exports expense ledger of a single employee to a styled Excel Sheet (All Years)
 */
export function exportEmployeeExpensesToExcel(employee: Employee): string {
  const e = employee;
  const txns = e.expenseTransactions || [];
  
  const paidTxns = txns.filter(txn => txn.amount < 0);
  const receivedTxns = txns.filter(txn => txn.amount > 0);
  
  const totalPaid = paidTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReceived = receivedTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netOutstandingBalance = totalPaid - totalReceived;
  
  let html = `
    <h1>Employee Expense Ledger Audit</h1>
    <h2>Employee: ${e.fullName} (${e.employeeId}) | Email: ${e.email}</h2>
    
    <h3>EXPENSE BALANCE OVERVIEW</h3>
    <table>
      <tr>
        <td style="background-color: #f8fafc; font-weight: bold; color: #475569;">Total LGL Paid (Disbursed Outwards / Cash Advances)</td>
        <td class="text-right font-bold" style="color: #4f46e5; font-size: 11pt;">$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td style="background-color: #f8fafc; font-weight: bold; color: #475569;">Total LGL Received (Returned Inwards / Offset / Recoupment)</td>
        <td class="text-right font-bold" style="color: #0d9488; font-size: 11pt;">$${totalReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr class="bg-gray">
        <td style="background-color: #f8fafc; font-weight: bold; color: #475569; font-size: 11pt;">Final Net Outstanding Balance (Due to LGL)</td>
        <td class="text-right font-bold" style="color: ${netOutstandingBalance >= 0 ? '#b91c1c' : '#15803d'}; font-size: 12pt;">$${netOutstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>
    
    <h3>LEDGER TRANSACTIONS LEDGER</h3>
    <table>
      <thead>
        <tr>
          <th colspan="4" style="background-color: #fca5a5; color: #7f1d1d; text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#7f1d1d">LGL PAID (DISBURSED OUTWARD)</font></th>
          <th colspan="4" style="background-color: #86efac; color: #064e3b; text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#064e3b">LGL RECEIVED (RETURNED BACK / Offset)</font></th>
        </tr>
        <tr>
          <th style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#991b1b">Date</font></th>
          <th style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#991b1b">Transaction ID</font></th>
          <th style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#991b1b">Details</font></th>
          <th class="text-right" style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#991b1b">Amount</font></th>
          <th style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#15803d">Date</font></th>
          <th style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#15803d">Transaction ID</font></th>
          <th style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#15803d">Details</font></th>
          <th class="text-right" style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#15803d">Amount</font></th>
        </tr>
      </thead>
      <tbody>
  `;
  
  const maxRows = Math.max(paidTxns.length, receivedTxns.length);
  for (let i = 0; i < maxRows; i++) {
    const pTx = paidTxns[i];
    const rTx = receivedTxns[i];
    const rowClass = i % 2 === 0 ? "bg-gray" : "";
    
    html += `<tr class="${rowClass}">`;
    
    if (pTx) {
      html += `
        <td>${formatDateToMDY(pTx.date)}</td>
        <td style="font-family: monospace; font-size: 8.5pt;">${pTx.id}</td>
        <td>
          <div>${pTx.details}</div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">${generateCalculationExplanation(pTx)}</div>
        </td>
        <td class="text-right font-bold" style="color: #dc2626;">$${Math.abs(pTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      `;
    } else {
      html += `<td></td><td></td><td></td><td></td>`;
    }
    
    if (rTx) {
      html += `
        <td>${formatDateToMDY(rTx.date)}</td>
        <td style="font-family: monospace; font-size: 8.5pt;">${rTx.id}</td>
        <td>
          <div>${rTx.details}</div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">${generateCalculationExplanation(rTx)}</div>
        </td>
        <td class="text-right font-bold" style="color: #15803d;">$${Math.abs(rTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      `;
    } else {
      html += `<td></td><td></td><td></td><td></td>`;
    }
    
    html += `</tr>`;
  }
  
  html += `
      </tbody>
    </table>
  `;
  
  return wrapInExcelHtml(html, `${e.fullName} Ledger`);
}

/**
 * Exports all expense transactions across all employees to a styled Excel Sheet (All Years)
 */
export function exportExpensesToExcel(employees: Employee[]): string {
  interface Item {
    emp: Employee;
    txn: ExpenseTransaction;
  }
  const allTxns: Item[] = [];
  employees.forEach(emp => {
    (emp.expenseTransactions || []).forEach(txn => {
      allTxns.push({ emp, txn });
    });
  });
  
  allTxns.sort((a, b) => {
    const timeA = new Date(a.txn.date).getTime() || 0;
    const timeB = new Date(b.txn.date).getTime() || 0;
    return timeA - timeB;
  });
  
  const paidItems = allTxns.filter(item => item.txn.amount < 0);
  const receivedItems = allTxns.filter(item => item.txn.amount > 0);
  
  const totalPaid = paidItems.reduce((sum, item) => sum + Math.abs(item.txn.amount), 0);
  const totalReceived = receivedItems.reduce((sum, item) => sum + Math.abs(item.txn.amount), 0);
  const netOutstandingBalance = totalPaid - totalReceived;
  
  let html = `
    <h1>All Employees Expense Compliance Ledger</h1>
    <h2>Total Outstanding Balance Summary across all accounts (All Years)</h2>
    
    <table>
      <tr>
        <td style="background-color: #f8fafc; font-weight: bold; color: #475569;">Total LGL Paid (Disbursed Outward)</td>
        <td class="text-right font-bold" style="color: #4f46e5; font-size: 11pt;">$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td style="background-color: #f8fafc; font-weight: bold; color: #475569;">Total LGL Received (Returned Inwards)</td>
        <td class="text-right font-bold" style="color: #0d9488; font-size: 11pt;">$${totalReceived.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr class="bg-gray">
        <td style="background-color: #f8fafc; font-weight: bold; color: #475569; font-size: 11pt;">Total Net Outstanding Balance</td>
        <td class="text-right font-bold" style="color: ${netOutstandingBalance >= 0 ? '#b91c1c' : '#15803d'}; font-size: 12pt;">$${netOutstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>
    
    <h3>ALL-EMPLOYEE LEDGER TRANSACTIONS</h3>
    <table>
      <thead>
        <tr>
          <th colspan="6" style="background-color: #fca5a5; color: #7f1d1d; text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#7f1d1d">LGL PAID (DISBURSED OUTWARDS)</font></th>
          <th colspan="6" style="background-color: #86efac; color: #064e3b; text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#064e3b">LGL RECEIVED (RETURNED BACK / RECOUPMENT)</font></th>
        </tr>
        <tr>
          <th style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#991b1b">Emp ID</font></th>
          <th style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#991b1b">Emp Name</font></th>
          <th style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#991b1b">Date</font></th>
          <th style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#991b1b">ID</font></th>
          <th style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#991b1b">Details</font></th>
          <th class="text-right" style="background-color: #fee2e2; color: #991b1b; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#991b1b">Amount</font></th>
          <th style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#15803d">Emp ID</font></th>
          <th style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#15803d">Emp Name</font></th>
          <th style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#15803d">Date</font></th>
          <th style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#15803d">ID</font></th>
          <th style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px;"><font color="#15803d">Details</font></th>
          <th class="text-right" style="background-color: #dcfce7; color: #15803d; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right;"><font color="#15803d">Amount</font></th>
        </tr>
      </thead>
      <tbody>
  `;
  
  const maxRows = Math.max(paidItems.length, receivedItems.length);
  for (let i = 0; i < maxRows; i++) {
    const pItem = paidItems[i];
    const rItem = receivedItems[i];
    const rowClass = i % 2 === 0 ? "bg-gray" : "";
    
    html += `<tr class="${rowClass}">`;
    
    if (pItem) {
      html += `
        <td>${pItem.emp.employeeId}</td>
        <td class="font-bold">${pItem.emp.fullName}</td>
        <td>${formatDateToMDY(pItem.txn.date)}</td>
        <td style="font-family: monospace; font-size: 8.5pt;">${pItem.txn.id}</td>
        <td>
          <div>${pItem.txn.details}</div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">${generateCalculationExplanation(pItem.txn)}</div>
        </td>
        <td class="text-right font-bold" style="color: #dc2626;">$${Math.abs(pItem.txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      `;
    } else {
      html += `<td></td><td></td><td></td><td></td><td></td><td></td>`;
    }
    
    if (rItem) {
      html += `
        <td>${rItem.emp.employeeId}</td>
        <td class="font-bold">${rItem.emp.fullName}</td>
        <td>${formatDateToMDY(rItem.txn.date)}</td>
        <td style="font-family: monospace; font-size: 8.5pt;">${rItem.txn.id}</td>
        <td>
          <div>${rItem.txn.details}</div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 3px;">${generateCalculationExplanation(rItem.txn)}</div>
        </td>
        <td class="text-right font-bold" style="color: #15803d;">$${Math.abs(rItem.txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
      `;
    } else {
      html += `<td></td><td></td><td></td><td></td><td></td><td></td>`;
    }
    
    html += `</tr>`;
  }
  
  html += `
      </tbody>
    </table>
  `;
  
  return wrapInExcelHtml(html, "Expenses Ledger");
}

export interface ConsecutiveUnderpaidAlert {
  hasAlert: boolean;
  consecutiveMonths: string[];
}

/**
 * Helper to identify employees with 'Underpaid' status for more than 2 consecutive months (3 or more)
 */
export function detectConsecutiveUnderpaid(summary: EmployeeSummary, limit: number = 3): ConsecutiveUnderpaidAlert {
  let currentStreak: string[] = [];
  let longestStreak: string[] = [];

  for (const month of summary.monthlyBreakdown) {
    const isUnderpaid = !month.isMatching && month.expectedLCAWage > 0;
    if (isUnderpaid) {
      currentStreak.push(month.monthName);
      if (currentStreak.length > longestStreak.length) {
        longestStreak = [...currentStreak];
      }
    } else {
      currentStreak = [];
    }
  }

  return {
    hasAlert: longestStreak.length >= limit,
    consecutiveMonths: longestStreak,
  };
}

export interface ProximityStatus {
  status: "ok" | "warning" | "danger" | "unknown";
  message: string;
  clientState?: string;
  residenceState?: string;
}

/**
 * Extracts a state abbreviation (e.g. TX, CA) from a full address string
 */
export function parseState(addr?: string): string | null {
  if (!addr) return null;
  // Look for State codes like ", TX " or " TX 75001" or ", TX," or " TX " at the end
  const match = addr.match(/\b([A-Z]{2})\b(?:\s+\d{5})?/);
  if (match) {
    const code = match[1];
    // Exclude common abbreviations that aren't states (like US or RD)
    const nonStates = new Set(["US", "RD", "ST", "DR", "LN", "PL", "AV"]);
    if (!nonStates.has(code)) {
      return code;
    }
  }
  return null;
}

/**
 * Extracts a 5-digit ZIP code from a full address string
 */
export function parseZip(addr?: string): string | null {
  if (!addr) return null;
  const match = addr.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

/**
 * Evaluates commuting proximity between Client Address and Residence Address
 */
export function verifyAddressCompliance(rec: {
  clientAddress?: string;
  residenceAddress?: string;
  clientState?: string;
  residenceState?: string;
  clientZip?: string;
  residenceZip?: string;
  workMode?: string;
}): ProximityStatus {
  const wMode = rec.workMode;
  const hasWorkAddress = !!(rec.clientAddress || rec.clientState || rec.clientZip);

  if ((wMode === "On-site" || wMode === "Hybrid") && !hasWorkAddress) {
    return {
      status: "warning",
      message: `Work Mode is set to ${wMode}, but Client Worksite Address is missing.`
    };
  }

  if (wMode === "Remote") {
    return {
      status: "ok",
      message: "Remote work mode. Commute compliance verification not applicable."
    };
  }

  if (wMode === "Hybrid") {
    return {
      status: "ok",
      message: "Hybrid work mode. Commute compliance verification skipped."
    };
  }

  const cState = (rec.clientState || parseState(rec.clientAddress) || "").trim().toUpperCase();
  const rState = (rec.residenceState || parseState(rec.residenceAddress) || "").trim().toUpperCase();
  
  const cZip = (rec.clientZip || parseZip(rec.clientAddress) || "").trim();
  const rZip = (rec.residenceZip || parseZip(rec.residenceAddress) || "").trim();

  if (!cState || !rState) {
    return {
      status: "unknown",
      message: "Address details incomplete (missing state info) for worksite verification.",
      clientState: cState || undefined,
      residenceState: rState || undefined
    };
  }

  if (cState !== rState) {
    return {
      status: "danger",
      message: `Out of State Commute (${rState} to ${cState}). LCA amendment/filing may be required.`,
      clientState: cState,
      residenceState: rState
    };
  }

  if (cZip && rZip) {
    const cZip3 = cZip.substring(0, 3);
    const rZip3 = rZip.substring(0, 3);
    if (cZip3 !== rZip3) {
      return {
        status: "warning",
        message: `Different commuting areas (ZIP prefixes ${rZip3}xx vs ${cZip3}xx). Verify if they reside in the same MSA.`,
        clientState: cState,
        residenceState: rState
      };
    }
  }

  return {
    status: "ok",
    message: "Worksite and Residence appear to be within normal commuting distance.",
    clientState: cState,
    residenceState: rState
  };
}



