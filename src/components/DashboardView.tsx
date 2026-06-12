/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft,
  Download, 
  Building, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Search,
  DollarSign,
  Receipt,
  Trash2,
  Eye,
  X,
  Clock,
  Calendar,
  ClipboardList,
  Layers,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Printer,
  PlusCircle
} from "lucide-react";
import { Employee, EmployeeSummary, ExpenseTransaction, PendingCollection } from "../types";
import { 
  calculateEmployeeSummary, 
  exportDashboardToCSV, 
  exportExpensesToCSV, 
  downloadCSV,
  detectConsecutiveUnderpaid,
  exportDashboardToExcel,
  exportExpensesToExcel,
  downloadExcel,
  printReport,
  verifyAddressCompliance,
  formatDateToMDY
} from "../utils/lcaCalcs";

interface DashboardViewProps {
  employees: Employee[];
  year: number;
  onYearChange: (yr: number) => void;
  onSelectEmployee: (id: string | null) => void;
  onUpdateEmployee: (updatedEmp: Employee) => void;
  onBatchUpdateEmployees?: (updatedList: Employee[], activityTitle: string, activityDetails: string) => Promise<void>;
  onAddActivity?: (actionType: string, employeeName: string, details: string) => void;
  calculationMode?: "ytd" | "full";
  onCalculationModeChange?: (mode: "ytd" | "full") => void;
  isBatchRecoupOpen: boolean;
  setIsBatchRecoupOpen: (open: boolean) => void;
}

export default function DashboardView({
  employees,
  year,
  onYearChange,
  onSelectEmployee,
  onUpdateEmployee,
  onBatchUpdateEmployees,
  onAddActivity,
  calculationMode = "ytd",
  onCalculationModeChange,
  isBatchRecoupOpen,
  setIsBatchRecoupOpen,
}: DashboardViewProps) {
  const [dashboardTab, setDashboardTab] = useState<"payroll" | "expenses" | "tracker">("payroll");
  const [statusFilter, setStatusFilter] = useState<string>("All"); // All, Compliant, Underpaid
  const [isExportOpen, setIsExportOpen] = useState(false);

  // States for Add Payment Form (Tracker Module)
  const [newPaymentEmpId, setNewPaymentEmpId] = useState<string>("");
  const [newPaymentEmpSearch, setNewPaymentEmpSearch] = useState<string>("");
  const [showPaymentEmpSuggestions, setShowPaymentEmpSuggestions] = useState<boolean>(false);
  const paymentEmpWrapperRef = useRef<HTMLDivElement>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");
  const [newPaymentDetails, setNewPaymentDetails] = useState<string>("Monthly payroll advance");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paymentEmpWrapperRef.current && !paymentEmpWrapperRef.current.contains(event.target as Node)) {
        setShowPaymentEmpSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // States for Mark Collected Popup modal
  const [collectingItem, setCollectingItem] = useState<{
    employee: Employee;
    item: PendingCollection;
  } | null>(null);
  const [collectDate, setCollectDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [collectDetails, setCollectDetails] = useState<string>("");
  
  // Selected month for Cash Flow report transactions list (1-12, defaults to current calendar month)
  const [selectedFlowMonth, setSelectedFlowMonth] = useState<number>(() => new Date().getMonth() + 1);
  
  // Expense Checkboxes / Bulk actions state
  const [selectedTxnIds, setSelectedTxnIds] = useState<string[]>([]);
  
  // Expense Filters
  const [expenseSearch, setExpenseSearch] = useState<string>("");
  const [actualExpenseSearch, setActualExpenseSearch] = useState<string>("");
  const [showDashboardSuggestions, setShowDashboardSuggestions] = useState<boolean>(false);
  const [expenseFlowFilter, setExpenseFlowFilter] = useState<string>("Outstanding"); // Default to Outstanding due amounts
  const [selectedTxnForDetails, setSelectedTxnForDetails] = useState<{
    employeeName: string;
    employeeId: string;
    employeeUid: string;
    txn: ExpenseTransaction;
  } | null>(null);

  // Helper to extract year from date string (supports MM/DD/YYYY and YYYY-MM-DD)
  const getTransactionYear = (dateStr: string): number => {
    if (!dateStr) return 0;
    // Check for MM/DD/YYYY format
    const partsMdy = dateStr.split("/");
    if (partsMdy.length === 3) {
      return parseInt(partsMdy[2]);
    }
    // Check for YYYY-MM-DD format
    const partsYmd = dateStr.split("-");
    if (partsYmd.length === 3 && partsYmd[0].length === 4) {
      return parseInt(partsYmd[0]);
    }
    try {
      return new Date(dateStr).getFullYear();
    } catch {
      return 0;
    }
  };

  // Helper to extract month from date string (supports MM/DD/YYYY and YYYY-MM-DD)
  const getTransactionMonth = (dateStr: string): number => {
    if (!dateStr) return 0;
    // Check for MM/DD/YYYY format
    const partsMdy = dateStr.split("/");
    if (partsMdy.length === 3) {
      return parseInt(partsMdy[0]);
    }
    // Check for YYYY-MM-DD format
    const partsYmd = dateStr.split("-");
    if (partsYmd.length === 3 && partsYmd[0].length === 4) {
      return parseInt(partsYmd[1]);
    }
    try {
      return new Date(dateStr).getMonth() + 1;
    } catch {
      return 0;
    }
  };

  // Filter employees based on active project start/end dates for this year
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (emp.startDate) {
        const startYear = new Date(emp.startDate).getFullYear();
        if (startYear > year) return false;
      }
      if (emp.endDate) {
        const endYear = new Date(emp.endDate).getFullYear();
        if (endYear < year) return false;
      }
      return true;
    });
  }, [employees, year]);

  // Sort active employees alphabetically
  const sortedActiveEmployees = useMemo(() => {
    return [...activeEmployees].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [activeEmployees]);

  // Filter sorted active employees based on search query
  const paymentEmpSuggestions = useMemo(() => {
    if (!newPaymentEmpSearch.trim()) return sortedActiveEmployees;
    const query = newPaymentEmpSearch.toLowerCase();
    return sortedActiveEmployees.filter(
      emp =>
        emp.fullName.toLowerCase().includes(query) ||
        emp.employeeId.toLowerCase().includes(query)
    );
  }, [sortedActiveEmployees, newPaymentEmpSearch]);

  // Compute LCA summary for active employees
  const summaries = useMemo(() => {
    return activeEmployees.map(emp => calculateEmployeeSummary(emp, year, calculationMode));
  }, [activeEmployees, year, calculationMode]);

  // Apply filters for Payroll
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      const hasDiscrepancy = s.hasDiscrepancies;
      const consecutiveAlert = detectConsecutiveUnderpaid(s);
      const matchStatus = 
        statusFilter === "All" ||
        (statusFilter === "Compliant" && !hasDiscrepancy) ||
        (statusFilter === "Underpaid" && hasDiscrepancy) ||
        (statusFilter === "Critical" && consecutiveAlert.hasAlert);
      return matchStatus;
    });
  }, [summaries, statusFilter]);

  // Global aggregate metrics for Payroll
  const stats = useMemo(() => {
    const totalCount = summaries.length;
    let compliantCount = 0;
    let underpaidCount = 0;
    let totalLCA = 0;
    let totalPayroll = 0;

    summaries.forEach(s => {
      if (s.hasDiscrepancies) {
        underpaidCount++;
      } else {
        compliantCount++;
      }
      totalLCA += s.expectedAnnualLCA;
      totalPayroll += s.actualAnnualPayroll;
    });

    const netVariance = totalPayroll - totalLCA;

    return {
      totalCount,
      compliantCount,
      underpaidCount,
      totalLCA,
      totalPayroll,
      netVariance,
    };
  }, [summaries]);

  // Compute worksite address compliance alerts for all employees
  const worksiteAlerts = useMemo(() => {
    const alerts: {
      employee: Employee;
      message: string;
      status: "warning" | "danger";
      commuteInfo: string;
    }[] = [];

    activeEmployees.forEach(emp => {
      emp.lcaRecords.forEach(rec => {
        const startYear = new Date(rec.effectiveFrom).getFullYear();
        const endYear = rec.tillDate ? new Date(rec.tillDate).getFullYear() : 9999;
        
        if (startYear <= year && endYear >= year) {
          const compliance = verifyAddressCompliance(rec);
          if (compliance.status === "danger" || compliance.status === "warning") {
            if (!alerts.some(a => a.employee.id === emp.id)) {
              alerts.push({
                employee: emp,
                message: compliance.message,
                status: compliance.status as "warning" | "danger",
                commuteInfo: `${compliance.residenceState || "N/A"} ➡️ ${compliance.clientState || "N/A"}`
              });
            }
          }
        }
      });
    });

    return alerts;
  }, [activeEmployees, year]);

  // Gather year-filtered Expense transactions for all employees
  const allYearTransactions = useMemo(() => {
    const list: {
      employee: Employee;
      txn: ExpenseTransaction;
    }[] = [];

    activeEmployees.forEach(emp => {
      const txns = emp.expenseTransactions || [];
      txns.forEach(txn => {
        if (getTransactionYear(txn.date) === year) {
          list.push({ employee: emp, txn });
        }
      });
    });

    // Sort by transaction date descending
    return list.sort((a, b) => new Date(b.txn.date).getTime() - new Date(a.txn.date).getTime());
  }, [activeEmployees, year]);

  // Filter transactions for the selected month and selected year
  const selectedMonthTransactions = useMemo(() => {
    return allYearTransactions.filter(({ txn }) => {
      return getTransactionMonth(txn.date) === selectedFlowMonth;
    });
  }, [allYearTransactions, selectedFlowMonth]);

  // Compute total payments and collections for the selected month
  const selectedMonthTotals = useMemo(() => {
    let disbursed = 0;
    let collected = 0;
    selectedMonthTransactions.forEach(({ txn }) => {
      if (txn.amount < 0) {
        disbursed += Math.abs(txn.amount);
      } else {
        collected += txn.amount;
      }
    });
    return {
      disbursed,
      collected,
      net: disbursed - collected,
    };
  }, [selectedMonthTransactions]);

  // Gather all unresolved payments (checklist items) from all employees
  const allPendingCollections = useMemo(() => {
    const list: { employee: Employee; item: PendingCollection }[] = [];
    employees.forEach(emp => {
      const items = emp.pendingCollections || [];
      items.forEach(item => {
        list.push({ employee: emp, item });
      });
    });
    return list;
  }, [employees]);

  // Handler to add a payment (payroll advance - negative transaction) to an employee and to-do list
  const handleAddPaymentToDo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentEmpId) {
      alert("Please select an employee.");
      return;
    }
    const amt = parseFloat(newPaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid positive amount paid.");
      return;
    }
    if (!newPaymentDetails.trim()) {
      alert("Please enter details or description.");
      return;
    }

    const emp = employees.find(e => e.id === newPaymentEmpId);
    if (!emp) return;

    // Create unique IDs
    const txnId = `exp_pay_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`;
    const pendingId = `pending_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`;
    const todayStr = new Date().toLocaleDateString("en-US");

    // Negative amount represents payment we made (disbursed advance)
    const newTxn: ExpenseTransaction = {
      id: txnId,
      date: todayStr,
      details: newPaymentDetails.trim(),
      amount: Number((-amt).toFixed(2)),
    };

    const newPendingItem: PendingCollection = {
      id: pendingId,
      paymentTxnId: txnId,
      amount: Number(amt.toFixed(2)),
      details: newPaymentDetails.trim(),
      date: todayStr,
    };

    const updatedEmp: Employee = {
      ...emp,
      expenseTransactions: [...(emp.expenseTransactions || []), newTxn],
      pendingCollections: [...(emp.pendingCollections || []), newPendingItem],
    };

    try {
      await onUpdateEmployee(updatedEmp);
      if (onAddActivity) {
        onAddActivity(
          "Payroll Payment Logged",
          emp.fullName,
          `Logged payroll advance of -$${amt.toFixed(2)}: "${newPaymentDetails.trim()}". Added to monthly collections checklist.`
        );
      }
      setNewPaymentEmpId("");
      setNewPaymentEmpSearch("");
      setNewPaymentAmount("");
      setNewPaymentDetails("Monthly payroll advance");
      alert(`Successfully added advance to ${emp.fullName}'s ledger and checklist.`);
    } catch (err) {
      console.error(err);
      alert("Failed to add payment. Verify permissions.");
    }
  };

  // Handler to confirm a collection repayment (positive transaction) and clear it from the to-do list
  const handleConfirmCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingItem) return;

    const { employee, item } = collectingItem;
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid positive amount collected.");
      return;
    }
    if (!collectDetails.trim()) {
      alert("Please enter transaction details.");
      return;
    }

    const formattedDate = formatDateToMDY(collectDate);

    // Positive amount represents received collection repayment
    const collectionTxn: ExpenseTransaction = {
      id: `exp_coll_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`,
      date: formattedDate,
      details: collectDetails.trim(),
      amount: Number(amt.toFixed(2)),
    };

    const updatedEmp: Employee = {
      ...employee,
      expenseTransactions: [...(employee.expenseTransactions || []), collectionTxn],
      pendingCollections: (employee.pendingCollections || []).filter(p => p.id !== item.id),
    };

    try {
      await onUpdateEmployee(updatedEmp);
      if (onAddActivity) {
        onAddActivity(
          "Payroll Payment Collected",
          employee.fullName,
          `Marked payroll advance of $${item.amount.toFixed(2)} as collected (Received $${amt.toFixed(2)}: "${collectDetails.trim()}")`
        );
      }
      setCollectingItem(null);
      alert(`Successfully recorded collection of $${amt.toFixed(2)} for ${employee.fullName}.`);
    } catch (err) {
      console.error(err);
      alert("Failed to record collection. Verify permissions.");
    }
  };

  // Compute monthly breakdown of payments (disbursed) and collections (returned) for this year
  const monthlyReportData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const breakdown = monthNames.map((name, i) => ({
      monthIndex: i, // 0 to 11
      name,
      disbursed: 0,
      collected: 0,
      net: 0,
    }));

    allYearTransactions.forEach(({ txn }) => {
      const monthNum = getTransactionMonth(txn.date); // 1-12
      if (monthNum >= 1 && monthNum <= 12) {
        const amount = txn.amount;
        if (amount < 0) {
          breakdown[monthNum - 1].disbursed += Math.abs(amount);
        } else {
          breakdown[monthNum - 1].collected += amount;
        }
      }
    });

    let totalDisbursed = 0;
    let totalCollected = 0;

    breakdown.forEach(item => {
      item.net = item.disbursed - item.collected;
      totalDisbursed += item.disbursed;
      totalCollected += item.collected;
    });

    return {
      monthlyBreakdown: breakdown,
      totalDisbursed,
      totalCollected,
      totalNet: totalDisbursed - totalCollected,
    };
  }, [allYearTransactions]);

  // Global aggregate metrics for Expenses
  const expenseStats = useMemo(() => {
    let disbursed = 0;
    let returned = 0;
    allYearTransactions.forEach(({ txn }) => {
      if (txn.amount < 0) {
        disbursed += Math.abs(txn.amount);
      } else {
        returned += txn.amount;
      }
    });
    const netOutstanding = disbursed - returned;

    // Cumulative net outstanding balance till date across all history
    let tillDateNetOutstanding = 0;
    employees.forEach(employee => {
      const txns = employee.expenseTransactions || [];
      txns.forEach(txn => {
        tillDateNetOutstanding += txn.amount;
      });
    });

    return {
      disbursed,
      returned,
      netOutstanding,
      tillDateNetOutstanding,
      count: allYearTransactions.length
    };
  }, [allYearTransactions, employees]);

  // Aggregate Expenses per Employee (For chart)
  const employeeExpenseStats = useMemo(() => {
    const map = new Map<string, { employee: Employee; disbursed: number; returned: number; outstanding: number }>();
    
    allYearTransactions.forEach(({ employee, txn }) => {
      let statsObj = map.get(employee.id);
      if (!statsObj) {
        statsObj = { employee, disbursed: 0, returned: 0, outstanding: 0 };
        map.set(employee.id, statsObj);
      }
      if (txn.amount < 0) {
        statsObj.disbursed += Math.abs(txn.amount);
      } else {
        statsObj.returned += txn.amount;
      }
    });

    map.forEach(val => {
      val.outstanding = val.disbursed - val.returned;
    });

    return Array.from(map.values()).sort((a, b) => b.disbursed - a.disbursed);
  }, [allYearTransactions]);

  // Till-date outstanding balance stats per Employee (all-time history)
  const tillDateEmployeeStats = useMemo(() => {
    const list = employees.map(employee => {
      let disbursed = 0;
      let returned = 0;
      const txns = employee.expenseTransactions || [];
      txns.forEach(txn => {
        if (txn.amount < 0) {
          disbursed += Math.abs(txn.amount);
        } else {
          returned += txn.amount;
        }
      });
      const outstanding = returned - disbursed;
      return {
        employee,
        disbursed,
        returned,
        outstanding
      };
    });
    return list.sort((a, b) => b.disbursed - a.disbursed);
  }, [employees]);

  // Filtered Expenses for Ledger Table
  const filteredExpenses = useMemo(() => {
    return allYearTransactions.filter(({ employee, txn }) => {
      let matchFlow = false;
      if (expenseFlowFilter === "All") {
        matchFlow = true;
      } else if (expenseFlowFilter === "Disbursed") {
        matchFlow = txn.amount < 0;
      } else if (expenseFlowFilter === "Returned") {
        matchFlow = txn.amount > 0;
      } else if (expenseFlowFilter === "Outstanding") {
        const stats = tillDateEmployeeStats.find(s => s.employee.id === employee.id);
        matchFlow = stats ? stats.outstanding !== 0 : false;
      }

      const q = actualExpenseSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        employee.fullName.toLowerCase().includes(q) ||
        employee.employeeId.toLowerCase().includes(q) ||
        txn.details.toLowerCase().includes(q) ||
        (txn.customFields && Object.values(txn.customFields).some(val => String(val).toLowerCase().includes(q)));

      return matchFlow && matchSearch;
    });
  }, [allYearTransactions, expenseFlowFilter, actualExpenseSearch, tillDateEmployeeStats]);

  // Filtered Outstanding Balances for Ledger view
  const outstandingEmployeeBalances = useMemo(() => {
    const list = tillDateEmployeeStats.filter(s => s.outstanding !== 0);
    const q = actualExpenseSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(s =>
      s.employee.fullName.toLowerCase().includes(q) ||
      s.employee.employeeId.toLowerCase().includes(q)
    );
  }, [tillDateEmployeeStats, actualExpenseSearch]);

  // Autocomplete suggestions for Expense Search (supports employee names and transaction descriptions)
  const dbSearchSuggestions = useMemo(() => {
    const q = expenseSearch.trim().toLowerCase();
    if (!q) return [];

    // Filter employees with matches in name/id
    const matchedEmployeeNames = employees
      .filter(emp => emp.fullName.toLowerCase().includes(q) || emp.employeeId.toLowerCase().includes(q))
      .map(emp => ({
        type: "employee" as const,
        value: emp.fullName,
        subtext: emp.employeeId,
      }));

    // Filter unique details
    const matchedDetailsSet = new Set<string>();
    const matchedDetailsList: { type: "detail"; value: string; subtext: string }[] = [];
    
    allYearTransactions.forEach(({ txn }) => {
      const details = txn.details;
      if (details.toLowerCase().includes(q) && !matchedDetailsSet.has(details.toLowerCase())) {
        matchedDetailsSet.add(details.toLowerCase());
        matchedDetailsList.push({
          type: "detail" as const,
          value: details,
          subtext: "Transaction Details",
        });
      }
    });

    // Merge and limit
    return [...matchedEmployeeNames.slice(0, 5), ...matchedDetailsList.slice(0, 5)];
  }, [expenseSearch, employees, allYearTransactions]);

  // Checkbox selection and bulk delete action handling helpers
  const isAllSelected = useMemo(() => {
    return filteredExpenses.length > 0 && filteredExpenses.every(({ txn }) => selectedTxnIds.includes(txn.id));
  }, [filteredExpenses, selectedTxnIds]);

  const handleToggleAll = () => {
    if (isAllSelected) {
      // Remove all currently filtered expenses from selection
      const filteredIds = filteredExpenses.map(({ txn }) => txn.id);
      setSelectedTxnIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Add all currently filtered expenses to selection
      const filteredIds = filteredExpenses.map(({ txn }) => txn.id);
      setSelectedTxnIds(prev => {
        const next = [...prev];
        filteredIds.forEach(id => {
          if (!next.includes(id)) {
            next.push(id);
          }
        });
        return next;
      });
    }
  };

  const handleToggleTxn = (txnId: string) => {
    setSelectedTxnIds(prev =>
      prev.includes(txnId) ? prev.filter(id => id !== txnId) : [...prev, txnId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedTxnIds.length === 0) return;
    const confirm = window.confirm(`Are you sure you want to permanently delete these ${selectedTxnIds.length} selected expense transaction(s)?`);
    if (!confirm) return;

    let deleteCount = 0;
    const deletedDetails: string[] = [];

    employees.forEach(emp => {
      const txns = emp.expenseTransactions || [];
      const toDelete = txns.filter(t => selectedTxnIds.includes(t.id));
      if (toDelete.length > 0) {
        const updated = txns.filter(t => !selectedTxnIds.includes(t.id));
        deleteCount += toDelete.length;
        deletedDetails.push(`${toDelete.length} txn(s) from ${emp.fullName}`);
        
        onUpdateEmployee({
          ...emp,
          expenseTransactions: updated,
        });
      }
    });

    if (deleteCount > 0) {
      if (onAddActivity) {
        onAddActivity(
          "Bulk Expenses Deleted",
          "Expense Ledger",
          `Permanently deleted ${deleteCount} selected expense entries in one bulk action (${deletedDetails.join(", ")})`
        );
      }
      setSelectedTxnIds([]);
    }
  };

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    setIsExportOpen(false);
    if (dashboardTab === "payroll") {
      if (format === "csv") {
        const csvContent = exportDashboardToCSV(employees, calculationMode);
        downloadCSV(csvContent, "lca_payroll_audit_dashboard_all_years.csv");
      } else if (format === "excel") {
        const excelContent = exportDashboardToExcel(employees, calculationMode);
        downloadExcel(excelContent, "lca_payroll_audit_dashboard_all_years.xls");
      } else if (format === "pdf") {
        const excelContent = exportDashboardToExcel(employees, calculationMode);
        const bodyContent = excelContent.match(/<body>([\s\S]*?)<\/body>/)?.[1] || excelContent;
        printReport(bodyContent, "LCA Payroll Audit Dashboard Report (All Years)");
      }
    } else {
      if (format === "csv") {
        const csvContent = exportExpensesToCSV(employees);
        downloadCSV(csvContent, "all_employees_expenses_ledger_all_years.csv");
      } else if (format === "excel") {
        const excelContent = exportExpensesToExcel(employees);
        downloadExcel(excelContent, "all_employees_expenses_ledger_all_years.xls");
      } else if (format === "pdf") {
        const excelContent = exportExpensesToExcel(employees);
        const bodyContent = excelContent.match(/<body>([\s\S]*?)<\/body>/)?.[1] || excelContent;
        printReport(bodyContent, "All Employees Expense Compliance Ledger (All Years)");
      }
    }
  };

  return (
    <div id="dashboard_view_pane" className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 font-sans text-slate-700">
      
      {/* View Header with title & Year Selection */}
      <div id="dashboard_title_bar" className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 border-b border-slate-200 pb-5 animate-fade-in">

        <div className="flex flex-wrap items-center gap-3.5">
          {onCalculationModeChange && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Scope:</span>
              <div id="calculation_mode_toggle" className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  id="calc_mode_btn_ytd"
                  onClick={() => onCalculationModeChange("ytd")}
                  className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer leading-tight uppercase ${
                    calculationMode === "ytd"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-650"
                  }`}
                  title="Limit expected annual/monthly wage difference check to YTD (Year-to-Date) up to current month"
                >
                  Till Date
                </button>
                <button
                  type="button"
                  id="calc_mode_btn_full"
                  onClick={() => onCalculationModeChange("full")}
                  className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer leading-tight uppercase ${
                    calculationMode === "full"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-650"
                  }`}
                  title="Evaluate compliance based on full-year targets"
                >
                  Full Year
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Fiscal Year:</span>
            <select
              id="dashboard_year_picker"
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="h-9 px-3 bg-white hover:border-slate-300 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-sm transition-all cursor-pointer"
            >
              {[2025, 2026, 2027].map(yr => (
                <option key={yr} value={yr}>{yr} Audit Cycle</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <button
              id="export_dashboard_btn"
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={employees.length === 0}
              className="h-9 px-4 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export All Years</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            
            {isExportOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsExportOpen(false)} 
                />
                <div 
                  id="export_dropdown_menu" 
                  className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden text-slate-700"
                >
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4.5 h-4.5 text-slate-400" />
                    <span>Export to CSV (.csv)</span>
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                    <span className="font-medium text-slate-800">Export to Excel (.xls)</span>
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer className="w-4.5 h-4.5 text-indigo-600" />
                    <span className="font-medium text-slate-800">Print / Save as PDF (.pdf)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Segment switcher */}
      <div id="dashboard_segment_tabs" className="flex border border-slate-200/70 bg-slate-50/50 p-1.5 rounded-2xl shadow-xs gap-1.5">
        <button
          id="dashboard_tab_payroll"
          onClick={() => setDashboardTab("payroll")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            dashboardTab === "payroll"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-extrabold border-b-2 border-b-indigo-300 scale-[1.01]"
              : "border-transparent text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/40"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dashboardTab === "payroll" ? "bg-white animate-pulse" : "bg-indigo-600/70"}`} />
          <span>Payroll & LCA Compliance</span>
        </button>
        <button
          id="dashboard_tab_tracker"
          onClick={() => setDashboardTab("tracker")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            dashboardTab === "tracker"
              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20 font-extrabold border-b-2 border-b-indigo-300 scale-[1.01]"
              : "border-transparent text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/40"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dashboardTab === "tracker" ? "bg-white animate-pulse" : "bg-indigo-400/70"}`} />
          <span>Monthly Payments Tracker</span>
        </button>
        <button
          id="dashboard_tab_expenses"
          onClick={() => setDashboardTab("expenses")}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            dashboardTab === "expenses"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20 font-extrabold border-b-2 border-b-emerald-300 scale-[1.01]"
              : "border-transparent text-slate-500 hover:text-indigo-500 hover:bg-emerald-50/30"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dashboardTab === "expenses" ? "bg-white animate-pulse" : "bg-indigo-500/70"}`} />
          <span>Workforce Expense Ledger</span>
        </button>
      </div>

      {dashboardTab === "payroll" && (
        /* ==================== PAYROLL TAB CONTENT ==================== */
        <div className="space-y-6 animate-slide-up-fade">
          {/* Aggregate metrics bento stats cards */}
          <div id="dashboard_stats_bento" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Total employees */}
            <div 
              onClick={() => setStatusFilter("All")}
              title="Click to view all employees"
              className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all cursor-pointer select-none border border-l-4 ${
                statusFilter === "All"
                  ? "border-indigo-650 border-l-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/10 shadow-md scale-[1.01]"
                  : "bg-white border-slate-200 border-l-indigo-600 hover:border-indigo-300 hover:shadow-md"
              }`}
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.04] pointer-events-none">
                <Users className="w-32 h-32 text-indigo-600" />
              </div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Total Employees</p>
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.totalCount}</p>
              <div className="mt-3 text-xs text-indigo-600 flex items-center gap-1 font-bold">
                <span>Active payroll units</span>
                {statusFilter === "All" && <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[8px]">Filtered</span>}
              </div>
            </div>

            {/* Compliant Count */}
            <div 
              onClick={() => setStatusFilter("Compliant")}
              title="Click to view compliant records only"
              className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all cursor-pointer select-none border border-l-4 ${
                statusFilter === "Compliant"
                  ? "border-indigo-560 border-l-indigo-500 bg-indigo-50/15 ring-2 ring-indigo-500/10 shadow-md scale-[1.01]"
                  : "bg-white border-slate-200 border-l-indigo-500 hover:border-indigo-400 hover:shadow-md"
              }`}
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.04] pointer-events-none">
                <CheckCircle className="w-32 h-32 text-indigo-500" />
              </div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">LCA Compliance Rate</p>
                <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {stats.totalCount > 0 ? `${((stats.compliantCount / stats.totalCount) * 100).toFixed(1)}%` : "100%"}
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3.5 overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: stats.totalCount > 0 ? `${(stats.compliantCount / stats.totalCount) * 100}%` : "100%" }}></div>
              </div>
            </div>

            {/* Underpaid Discrepancies Count */}
            <div 
              onClick={() => setStatusFilter("Underpaid")}
              title="Click to view underpaid records only"
              className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all cursor-pointer select-none border border-l-4 ${
                statusFilter === "Underpaid"
                  ? "border-rose-500 border-l-rose-500 bg-rose-50/30 ring-2 ring-rose-500/10 shadow-md scale-[1.01]"
                  : "bg-white border-slate-200 border-l-rose-500 hover:border-rose-300 hover:shadow-md"
              }`}
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.04] pointer-events-none">
                <AlertTriangle className="w-32 h-32 text-rose-500" />
              </div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Underpaid Alerts</p>
                <div className={`p-1.5 rounded-lg ${stats.underpaidCount > 0 ? "bg-rose-50 text-rose-600 animate-bounce" : "bg-slate-50 text-slate-400"}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-3xl font-black ${stats.underpaidCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {stats.underpaidCount}
              </p>
              <div className="mt-3 text-xs flex items-center gap-1 font-bold">
                <span className={stats.underpaidCount > 0 ? "text-rose-655 text-rose-500" : "text-slate-500"}>
                  {stats.underpaidCount > 0 ? "Adjustment Required" : "Zero active alerts"}
                </span>
                {statusFilter === "Underpaid" && <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[8px]">Filtered</span>}
              </div>
            </div>

            {/* Net Audit variance balance */}
            <div 
              onClick={() => setStatusFilter("Underpaid")}
              title="Click to view underpaid discrepancy records"
              className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all cursor-pointer select-none border border-l-4 ${
                statusFilter === "Underpaid"
                  ? "border-rose-500 border-l-rose-600 bg-rose-50/15 ring-2 ring-rose-500/10 shadow-md scale-[1.01]"
                  : "bg-white border-slate-200 border-l-indigo-650 hover:border-slate-350 hover:shadow-md"
              }`}
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.03] pointer-events-none">
                <DollarSign className="w-32 h-32 text-slate-400" />
              </div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Total Annual Discrepancy</p>
                <div className="p-1.5 bg-slate-50 text-slate-500 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-2xl font-black tracking-tight ${stats.netVariance >= 0 ? "text-indigo-600" : "text-rose-655 text-rose-600"}`}>
                {stats.netVariance >= 0 ? "+" : "-"}${Math.abs(stats.netVariance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-3.5 text-xs text-slate-400 font-medium">
                Annualized cumulative differential
              </div>
            </div>

          </div>

          {/* Visual Compliance & Worksite Audits Panel (Feature 2 & 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in my-6">
            {/* Compliance Donut Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between card-hover-lift">
              <div className="w-full flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono text-slate-400">Compliance Audit Share</span>
                <span className="text-[10px] text-slate-450 font-mono font-semibold">{year} Cycle</span>
              </div>
              
              <div className="relative flex items-center justify-center w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="50"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="15"
                  />
                  {/* Compliant Circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r="50"
                    fill="transparent"
                    stroke="#6366f1"
                    strokeWidth="15"
                    strokeDasharray={`${(314.16 * stats.compliantCount) / Math.max(1, stats.totalCount)} 314.16`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Underpaid Circle */}
                  {stats.underpaidCount > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r="50"
                      fill="transparent"
                      stroke="#f43f5e"
                      strokeWidth="15"
                      strokeDasharray={`${(314.16 * stats.underpaidCount) / Math.max(1, stats.totalCount)} 314.16`}
                      strokeDashoffset={-((314.16 * stats.compliantCount) / Math.max(1, stats.totalCount))}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                {/* Central Labels */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {stats.totalCount > 0 ? `${((stats.compliantCount / stats.totalCount) * 100).toFixed(0)}%` : "100%"}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                    Compliant
                  </span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100/80 text-[10px] font-semibold text-slate-500">
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>Compliant ({stats.compliantCount})</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span>Underpaid ({stats.underpaidCount})</span>
                </div>
              </div>
            </div>

            {/* Worksite Proximity Compliance Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between card-hover-lift">
              <div className="w-full flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono text-slate-400">Worksite Proximity Audits</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[8.5px] font-bold">Immigration Check</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-40 min-h-[140px] pr-1 space-y-2">
                {worksiteAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-450 py-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700">All worksite locations comply with commuting guidelines</p>
                    <p className="text-[10px] text-slate-405 text-slate-400 mt-0.5">No out-of-state or Commuting MSA mismatches detected for the {year} audit cycle.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {worksiteAlerts.map(({ employee, message, status, commuteInfo }) => (
                      <div key={employee.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{employee.fullName}</span>
                            <span className="text-[9.5px] text-slate-400 font-mono">({employee.employeeId})</span>
                          </div>
                          <p className="text-[10px] mt-1 flex items-start gap-1 font-semibold text-slate-500">
                            <span className={status === "danger" ? "text-rose-500" : "text-amber-500"}>⚠️</span>
                            <span>{message}</span>
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${
                            status === "danger" 
                              ? "bg-rose-50 border border-rose-100 text-rose-700" 
                              : "bg-amber-50 border border-amber-100 text-amber-700"
                          }`}>
                            {status === "danger" ? "Out of State" : "MSA Commute Risk"}
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-mono font-semibold">{commuteInfo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100/80 text-[10px] text-slate-400 font-medium leading-relaxed">
                Checks state boundaries and ZIP code prefixes. Commuting compliance ensures active H-1B worksites remain certified under the certified LCA worksite.
              </div>
            </div>
          </div>

          {/* Tabular data filters & main compare list */}
          <div id="dashboard_table_module" className="space-y-4">
            
            {/* Sliders and drop down selectors */}
            <div id="table_filter_dock" className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-505 text-slate-500 font-semibold uppercase tracking-wider font-mono">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Filters:</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Compliance:</span>
                  <select
                    id="filter_compliance"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="All">All statuses</option>
                    <option value="Compliant">Compliant Only</option>
                    <option value="Underpaid">Underpaid Only</option>
                    <option value="Critical">Critical Status (Consecutive Underpaid)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Audit compare index list */}
            <div id="audit_compare_list_scroller" className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-xs text-left text-slate-500 border-collapse">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold font-mono tracking-wider border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-5 py-3">Employee Details</th>
                    <th scope="col" className="px-4 py-3 text-right">Mandated LCA Rate</th>
                    <th scope="col" className="px-4 py-3 text-right">Summed Payroll</th>
                    <th scope="col" className="px-4 py-3 text-right">Annual Difference</th>
                    <th scope="col" className="px-5 py-3 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center italic text-slate-400 text-xs">
                        No matching compliance summaries available for this year cycle.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map(s => {
                      const isUnderpaid = s.hasDiscrepancies;
                      const consecutiveAlert = detectConsecutiveUnderpaid(s);
                      return (
                        <tr
                          key={s.employee.id}
                          id={`compare_row_${s.employee.id}`}
                          onClick={() => onSelectEmployee(s.employee.id)}
                          className={`cursor-pointer transition-all duration-200 ease-out group border-b border-slate-100 border-l-4 ${
                            consecutiveAlert.hasAlert 
                              ? "bg-rose-50/60 hover:bg-rose-100/70 border-l-rose-500 hover:translate-x-0.5 hover:shadow-xs" 
                              : "border-l-transparent hover:border-l-indigo-500 hover:bg-indigo-50/35 hover:translate-x-0.5 hover:shadow-xs"
                          }`}
                        >
                          {/* Name and ID */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold transition-colors ${
                                consecutiveAlert.hasAlert 
                                  ? "text-rose-900 font-bold group-hover:text-rose-700" 
                                  : "text-slate-900 group-hover:text-indigo-650 group-hover:text-indigo-600"
                              }`}>
                                {s.employee.fullName}
                              </span>
                              {consecutiveAlert.hasAlert && (
                                <span 
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-black uppercase tracking-wide cursor-help shrink-0 shadow-sm" 
                                  title={`Critically underpaid for ${consecutiveAlert.consecutiveMonths.length} consecutive months: ${consecutiveAlert.consecutiveMonths.join(', ')}`}
                                >
                                  ⚠️ {consecutiveAlert.consecutiveMonths.length} Mo STREAK
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectEmployee(s.employee.id);
                                }}
                                className="inline-flex items-center justify-center font-mono font-bold text-[8px] tracking-wider uppercase bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-1.5 py-0.5 rounded transition-all ml-1 border border-indigo-100"
                                title="Go straight to employee profile page"
                              >
                                Go To Profile
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono flex flex-wrap items-center gap-2">
                              <span>{s.employee.employeeId}</span>
                              {(() => {
                                const activeRec = s.employee.lcaRecords.find(rec => {
                                  const startYear = new Date(rec.effectiveFrom).getFullYear();
                                  const endYear = rec.tillDate ? new Date(rec.tillDate).getFullYear() : 9999;
                                  return startYear <= year && endYear >= year;
                                });
                                if (activeRec) {
                                  const c = verifyAddressCompliance(activeRec);
                                  if (c.status === "danger") {
                                    return (
                                      <span className="px-1.5 py-0.2 bg-rose-50 border border-rose-100 text-rose-600 rounded text-[8.5px] font-extrabold uppercase shrink-0">
                                        ⚠️ Out-of-state Worksite
                                      </span>
                                    );
                                  } else if (c.status === "warning") {
                                    return (
                                      <span className="px-1.5 py-0.2 bg-amber-50 border border-amber-100 text-amber-600 rounded text-[8.5px] font-extrabold uppercase shrink-0">
                                        ⚠️ Worksite MSA Commute Risk
                                      </span>
                                    );
                                  }
                                }
                                return null;
                              })()}
                            </div>
                          </td>

                          {/* Expected Annual Rate */}
                          <td className="px-4 py-3.5 text-right font-mono text-slate-900">
                            ${s.expectedAnnualLCA.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Cumulative Payroll */}
                          <td className="px-4 py-3.5 text-right font-mono text-slate-900">
                            ${s.actualAnnualPayroll.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Difference computation */}
                          <td className="px-4 py-3.5 text-right font-mono">
                            {s.annualDifference >= 0 ? (
                              <span className="text-emerald-650 text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 font-semibold inline-block">
                                +${s.annualDifference.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 font-bold inline-block">
                                -${Math.abs(s.annualDifference).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>

                          {/* compliance flag */}
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {consecutiveAlert.hasAlert ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white rounded-full font-bold text-[10px] shadow-sm animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-white" />
                                  <span>Critical Status</span>
                                </span>
                              ) : isUnderpaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full font-semibold text-[10px]">
                                  <AlertTriangle className="w-3 h-3 text-red-500" />
                                  <span>Underpaid Month(s)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-150 rounded-full font-semibold text-[10px]">
                                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                                  <span>Compliant</span>
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {dashboardTab === "tracker" && (
        /* ==================== TRACKER TAB CONTENT ==================== */
        <div className="space-y-6 animate-slide-up-fade">
          {/* Monthly Payments Checklist (Pending Collections) */}
          <div id="monthly_payments_todo_card" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 card-hover-lift">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Monthly Payments Checklist (Pending Collections)</h4>
                <p className="text-xs text-slate-400 mt-0.5">Track and collect payroll advances disbursed to workforce</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form to Add Payment */}
              <div className="lg:col-span-4 bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Log New Payment</span>
                <form onSubmit={handleAddPaymentToDo} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Select Employee</label>
                    <div ref={paymentEmpWrapperRef} className="relative">
                      <input
                        type="text"
                        placeholder="Search employee by name or ID..."
                        value={newPaymentEmpSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPaymentEmpSearch(val);
                          setNewPaymentEmpId("");
                        }}
                        onFocus={() => setShowPaymentEmpSuggestions(true)}
                        className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                        required
                      />
                      {newPaymentEmpSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewPaymentEmpSearch("");
                            setNewPaymentEmpId("");
                            setShowPaymentEmpSuggestions(true);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {showPaymentEmpSuggestions && (
                        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 divide-y divide-slate-100">
                          {paymentEmpSuggestions.length > 0 ? (
                            paymentEmpSuggestions.map(emp => (
                              <div
                                key={emp.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setNewPaymentEmpSearch(`${emp.fullName} (${emp.employeeId})`);
                                  setNewPaymentEmpId(emp.id);
                                  setShowPaymentEmpSuggestions(false);
                                }}
                                className="cursor-pointer px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-900 transition-colors flex justify-between items-center"
                              >
                                <span className="font-semibold text-slate-700">{emp.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{emp.employeeId}</span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-slate-400 text-center italic">
                              No matching employees
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Amount Paid ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                      <input
                        type="text"
                        placeholder="0.00"
                        value={newPaymentAmount}
                        onChange={(e) => setNewPaymentAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-full pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Details / Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Advance payment"
                      value={newPaymentDetails}
                      onChange={(e) => setNewPaymentDetails(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-650/10 cursor-pointer transition-all active:scale-98"
                  >
                    Add Payment to Checklist
                  </button>
                </form>
              </div>

              {/* Payments Checklist List */}
              <div className="lg:col-span-8 flex flex-col min-h-[220px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-3">Items Pending Collection ({allPendingCollections.length})</span>
                {allPendingCollections.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-450 bg-slate-50/50">
                    <ClipboardList className="w-8 h-8 text-slate-350 mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">All collections are completed!</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Add a new payment on the left side form to start tracking collections.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                    {allPendingCollections.map(({ employee, item }) => (
                      <div
                        key={item.id}
                        className="p-3 flex items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => {
                              setCollectingItem({ employee, item });
                              setCollectAmount(item.amount.toString());
                              setCollectDetails(`Recoupment: ${item.details}`);
                            }}
                            className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5 shrink-0"
                            title="Mark as collected"
                          />
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {employee.fullName} <span className="font-mono text-[10px] text-slate-400">({employee.employeeId})</span>
                            </div>
                            <div className="text-[11px] text-slate-650 text-slate-600 mt-0.5 font-medium">{item.details}</div>
                            <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">Paid on: {item.date}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 font-bold text-[10.5px] rounded inline-block font-mono">
                            -${item.amount.toFixed(2)}
                          </span>
                          <span className="block text-[8.5px] text-amber-550 text-amber-500 font-bold uppercase tracking-wider mt-1">Pending</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Monthly Cash Flow (Payments vs. Collections) Report Card */}
          <div id="monthly_cash_flow_card" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 card-hover-lift">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Monthly Cash Flow Report</h4>
                  <p className="text-xs text-slate-450 mt-0.5">Transactions log for the active audit cycle</p>
                </div>
                <select
                  value={selectedFlowMonth}
                  onChange={(e) => setSelectedFlowMonth(parseInt(e.target.value))}
                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs font-mono"
                >
                  <option value={1}>01 - January</option>
                  <option value={2}>02 - February</option>
                  <option value={3}>03 - March</option>
                  <option value={4}>04 - April</option>
                  <option value={5}>05 - May</option>
                  <option value={6}>06 - June</option>
                  <option value={7}>07 - July</option>
                  <option value={8}>08 - August</option>
                  <option value={9}>09 - September</option>
                  <option value={10}>10 - October</option>
                  <option value={11}>11 - November</option>
                  <option value={12}>12 - December</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-indigo-600">
                  <span className="w-2 h-2 rounded bg-indigo-500 shrink-0" />
                  <span>Month Paid: ${selectedMonthTotals.disbursed.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2 h-2 rounded bg-emerald-500 shrink-0" />
                  <span>Month Collected: ${selectedMonthTotals.collected.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 border-l border-slate-250 pl-4">
                  <span>Net Difference:</span>
                  <span className={`font-bold font-mono ${selectedMonthTotals.net >= 0 ? "text-amber-600" : "text-emerald-700"}`}>
                    ${selectedMonthTotals.net.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* List transactions for the selected month */}
            {selectedMonthTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <ClipboardList className="w-10 h-10 text-slate-300 mb-2.5" />
                <span className="text-xs font-semibold">
                  No transactions recorded in {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][selectedFlowMonth - 1]} {year}.
                </span>
                <span className="text-[10px] text-slate-400 mt-1">Use the Add Payment To-Do form or Record Batch recoupments to log activities.</span>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-500 border-collapse">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold font-mono tracking-wider border-b border-slate-100">
                      <tr>
                        <th scope="col" className="px-5 py-3">Employee</th>
                        <th scope="col" className="px-4 py-3">Transaction Date</th>
                        <th scope="col" className="px-4 py-3">Details / Description</th>
                        <th scope="col" className="px-4 py-3">Flow Type</th>
                        <th scope="col" className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMonthTransactions.map(({ employee, txn }) => {
                        const isDisbursement = txn.amount < 0;
                        return (
                          <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-slate-900">{employee.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{employee.employeeId}</div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600">{txn.date}</td>
                            <td className="px-4 py-3.5 text-slate-700 italic max-w-xs truncate" title={txn.details}>
                              {txn.details || "—"}
                            </td>
                              {isDisbursement ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                                  Paid (Advance)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                                  Received (Offset)
                                </span>
                              )}
                            <td className={`px-4 py-3.5 text-right font-mono font-bold ${isDisbursement ? "text-rose-600" : "text-emerald-700"}`}>
                              {isDisbursement ? "-" : "+"}${Math.abs(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {dashboardTab === "expenses" && (
        /* ==================== EXPENSE TAB CONTENT ==================== */
        <div className="space-y-6 animate-slide-up-fade">
          {/* Expense bento aggregate cards */}
          <div id="expense_stats_bento" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Cash Paid Out */}
            <div 
              onClick={() => setExpenseFlowFilter("Disbursed")}
              title="Click to view paid (advance) transactions"
              className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all cursor-pointer select-none border border-l-4 ${
                expenseFlowFilter === "Disbursed"
                  ? "border-indigo-650 border-l-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-600/10 shadow-md scale-[1.01]"
                  : "bg-white border-slate-200 border-l-indigo-600 hover:border-indigo-300 hover:shadow-md"
              }`}
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.04] pointer-events-none">
                <ArrowUpRight className="w-32 h-32 text-indigo-600" />
              </div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Paid Advance</p>
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">
                ${expenseStats.disbursed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-3 text-xs text-indigo-600 flex items-center gap-1 font-bold">
                <span>Paid outwards ({year})</span>
                {expenseFlowFilter === "Disbursed" && <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[8px]">Filtered</span>}
              </div>
            </div>

            {/* Total Received offsets */}
            <div 
              onClick={() => setExpenseFlowFilter("Returned")}
              title="Click to view received (offset) transactions"
              className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all cursor-pointer select-none border border-l-4 ${
                expenseFlowFilter === "Returned"
                  ? "border-indigo-560 border-l-indigo-500 bg-indigo-50/15 ring-2 ring-indigo-500/10 shadow-md scale-[1.01]"
                  : "bg-white border-slate-200 border-l-indigo-500 hover:border-indigo-400 hover:shadow-md"
              }`}
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.04] pointer-events-none">
                <ArrowDownLeft className="w-32 h-32 text-indigo-500" />
              </div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Offsets Received</p>
                <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">
                ${expenseStats.returned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-3 text-xs text-indigo-500 flex items-center gap-1 font-bold">
                <span>Reclaimed inwards ({year})</span>
                {expenseFlowFilter === "Returned" && <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded text-[8px]">Filtered</span>}
              </div>
            </div>

            {/* Outstanding Net liability */}
            <div 
              onClick={() => setExpenseFlowFilter("Outstanding")}
              title="Click to view only employees with outstanding balances"
              className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all cursor-pointer select-none border border-l-4 ${
                expenseFlowFilter === "Outstanding"
                  ? "border-amber-500 border-l-amber-500 bg-amber-50/15 ring-2 ring-amber-500/10 shadow-md scale-[1.01]"
                  : "bg-white border-slate-200 border-l-amber-500 hover:border-amber-400 hover:shadow-md"
              }`}
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.04] pointer-events-none">
                <DollarSign className="w-32 h-32 text-amber-500" />
              </div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Net Outstanding (Till Date)</p>
                <div className={`p-1.5 rounded-lg ${expenseStats.tillDateNetOutstanding < 0 ? "bg-amber-50 text-amber-600 animate-bounce" : expenseStats.tillDateNetOutstanding > 0 ? "bg-sky-50 text-sky-600" : "bg-slate-50 text-slate-400"}`}>
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-3xl font-black ${expenseStats.tillDateNetOutstanding < 0 ? "text-amber-650" : expenseStats.tillDateNetOutstanding > 0 ? "text-sky-650" : "text-slate-900"}`}>
                {expenseStats.tillDateNetOutstanding < 0 
                  ? `-$${Math.abs(expenseStats.tillDateNetOutstanding).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  : expenseStats.tillDateNetOutstanding > 0 
                    ? `+$${expenseStats.tillDateNetOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                    : "$0.00"
                }
              </p>
              <div className="mt-3 text-xs flex items-center gap-1 font-bold">
                <span className={expenseStats.tillDateNetOutstanding !== 0 ? (expenseStats.tillDateNetOutstanding < 0 ? "text-amber-600 animate-pulse" : "text-sky-600") : "text-slate-500"}>
                  {expenseStats.tillDateNetOutstanding < 0 ? "Reconciliation in progress" : expenseStats.tillDateNetOutstanding > 0 ? "LGL owes credit to employees" : "All accounts balanced"}
                </span>
                {expenseFlowFilter === "Outstanding" && <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[8px]">Filtered</span>}
              </div>
            </div>

            {/* Transactions Logged counter */}
            <div 
              onClick={() => setExpenseFlowFilter("All")}
              title="Click to view all logged transactions"
              className={`rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all cursor-pointer select-none border border-l-4 ${
                expenseFlowFilter === "All"
                  ? "border-slate-800 border-l-slate-700 bg-slate-50 ring-2 ring-slate-500/10 shadow-md scale-[1.01]"
                  : "bg-white border-slate-200 border-l-slate-700 hover:border-slate-400 hover:shadow-md"
              }`}
            >
              <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-[0.04] pointer-events-none">
                <ClipboardList className="w-32 h-32 text-slate-600" />
              </div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Transactions Logged</p>
                <div className="p-1.5 bg-slate-150 bg-slate-100 text-slate-700 rounded-lg">
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900">{expenseStats.count}</p>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1 font-bold">
                <span>Ledger entries tracked</span>
                {expenseFlowFilter === "All" && <span className="px-1.5 py-0.5 bg-slate-700 text-white rounded text-[8px]">Filtered</span>}
              </div>
            </div>

          </div>

          {/* Expense ledger and custom table search & filter dock */}
          <div id="expense_table_module" className="space-y-4">
            
            {/* Filter Dock */}
            <div id="expense_filter_dock" className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150 border-slate-200">
              <form onSubmit={(e) => { e.preventDefault(); }} className="flex flex-1 items-center gap-2 w-full md:w-auto">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    placeholder="Type name or details to search..."
                    value={expenseSearch}
                    onFocus={() => setShowDashboardSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowDashboardSuggestions(false), 200);
                    }}
                    onChange={(e) => {
                      setExpenseSearch(e.target.value);
                      setShowDashboardSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setActualExpenseSearch(expenseSearch);
                        setShowDashboardSuggestions(false);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {/* Autocomplete suggestions dropdown */}
                  {showDashboardSuggestions && expenseSearch.trim() !== "" && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto py-1 animate-fade-in text-left">
                      {dbSearchSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400 italic">
                          No matching suggestions found
                        </div>
                      ) : (
                        dbSearchSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setExpenseSearch(item.value);
                              setActualExpenseSearch(item.value);
                              setShowDashboardSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex flex-col cursor-pointer transition-colors border-b border-slate-50/50 last:border-b-0"
                          >
                            <span className="text-xs font-semibold text-slate-700 truncate">{item.value}</span>
                            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">{item.subtext}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActualExpenseSearch(expenseSearch);
                    setShowDashboardSuggestions(false);
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer text-nowrap"
                >
                  Search
                </button>
                {actualExpenseSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseSearch("");
                      setActualExpenseSearch("");
                    }}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Clear
                  </button>
                )}
              </form>

              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
                {expenseFlowFilter !== "Outstanding" && selectedTxnIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-sm shadow-rose-600/10 cursor-pointer transition-colors duration-150 animate-fade-in"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Delete Selected ({selectedTxnIds.length})</span>
                  </button>
                )}
                
                <button
                  type="button"
                  id="record_batch_collections_btn"
                  onClick={() => setIsBatchRecoupOpen(true)}
                  className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-750 hover:shadow-md hover:shadow-indigo-600/10 text-white border border-indigo-650 font-extrabold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Record Batch Collections</span>
                </button>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500">
                  <span className="text-slate-400">Flow Direction:</span>
                  <select
                    id="expense_flow_filter"
                    value={expenseFlowFilter}
                    onChange={(e) => setExpenseFlowFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  >
                    <option value="All">All Transactions</option>
                    <option value="Disbursed">Paid (Advance)</option>
                    <option value="Returned">Received (Offset)</option>
                    <option value="Outstanding">Outstanding Net Balance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ledger Transaction table */}
            <div id="expense_ledger_scroller" className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              {expenseFlowFilter === "Outstanding" ? (
                <table className="w-full text-xs text-left text-slate-500 border-collapse">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold font-mono tracking-wider border-b border-slate-100">
                    <tr>
                      <th scope="col" className="px-5 py-3">Employee</th>
                      <th scope="col" className="px-4 py-3 text-right">Total Paid</th>
                      <th scope="col" className="px-4 py-3 text-right">Total Received</th>
                      <th scope="col" className="px-5 py-3 text-right">Net Outstanding (Till Date)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outstandingEmployeeBalances.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center italic text-slate-400 text-xs">
                          No employees with outstanding balances found.
                        </td>
                      </tr>
                    ) : (
                      outstandingEmployeeBalances.map(({ employee, disbursed, returned, outstanding }) => {
                        const isOwed = outstanding < 0;
                        return (
                          <tr
                            key={employee.id}
                            id={`expense_outstanding_row_${employee.id}`}
                            onClick={() => onSelectEmployee(employee.id)}
                            className="hover:bg-indigo-50/35 cursor-pointer transition-all duration-200 ease-out group border-b border-slate-100 border-l-4 border-l-transparent hover:border-l-indigo-500 hover:translate-x-0.5 hover:shadow-xs"
                          >
                            {/* Employee Detail */}
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {employee.fullName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {employee.employeeId}
                              </div>
                            </td>

                            {/* Total Disbursed */}
                            <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                              ${disbursed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>

                            {/* Total Returned */}
                            <td className="px-4 py-3.5 text-right font-mono text-emerald-700">
                              ${returned.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>

                            {/* Outstanding balance representation */}
                            <td className="px-5 py-3.5 text-right font-mono">
                              <span className={`inline-flex items-center gap-1.5 font-bold ${
                                outstanding < 0 
                                  ? "text-amber-700" 
                                  : outstanding > 0 
                                    ? "text-sky-700" 
                                    : "text-slate-700"
                              }`}>
                                {outstanding < 0 
                                  ? `-$${Math.abs(outstanding).toLocaleString("en-US", { minimumFractionDigits: 2 })}` 
                                  : outstanding > 0 
                                    ? `+$${outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}` 
                                    : "$0.00"
                                }
                                {outstanding < 0 ? (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-150 rounded text-[9px] font-bold uppercase tracking-wider font-sans">
                                    Pending
                                  </span>
                                ) : outstanding > 0 ? (
                                  <span className="px-1.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-150 rounded text-[9px] font-bold uppercase tracking-wider font-sans">
                                    Credit
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-150 rounded text-[9px] font-bold uppercase tracking-wider font-sans">
                                    Balanced
                                  </span>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs text-left text-slate-500 border-collapse">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold font-mono tracking-wider border-b border-slate-100">
                    <tr>
                      <th scope="col" className="px-4 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5"
                        />
                      </th>
                      <th scope="col" className="px-5 py-3">Employee</th>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Details</th>
                      <th scope="col" className="px-4 py-3">Flow Type</th>
                      <th scope="col" className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center italic text-slate-400 text-xs">
                          No matching expense transactions available for this filters arrangement.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map(({ employee, txn }) => {
                        const isDisbursed = txn.amount > 0;
                        const customList = txn.customFields ? Object.entries(txn.customFields) : [];

                        const isSelected = selectedTxnForDetails?.txn.id === txn.id;

                        return (
                          <tr
                            key={txn.id}
                            id={`expense_row_${txn.id}`}
                            onClick={() => setSelectedTxnForDetails({ employeeName: employee.fullName, employeeId: employee.employeeId, employeeUid: employee.id, txn })}
                            className={`cursor-pointer transition-all duration-200 ease-out group border-b border-slate-100 border-l-4 ${
                              isSelected
                                ? "bg-indigo-100/40 border-l-indigo-600 shadow-xs translate-x-0.5 font-medium"
                                : "border-l-transparent hover:border-l-indigo-400 hover:bg-indigo-50/25 hover:translate-x-0.5 hover:shadow-xs"
                            }`}
                          >
                            {/* Selection Checkbox cell */}
                            <td className="px-4 py-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedTxnIds.includes(txn.id)}
                                onChange={() => handleToggleTxn(txn.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5"
                              />
                            </td>

                            {/* Name and ID */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {employee.fullName}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectEmployee(employee.id);
                                  }}
                                  className="inline-flex items-center justify-center font-mono font-bold text-[8px] tracking-wider uppercase bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-1.5 py-0.5 rounded transition-all ml-1 border border-indigo-100"
                                  title="Go straight to employee profile page"
                                >
                                  Go To Profile
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {employee.employeeId}
                              </div>
                            </td>

                            {/* Transaction Date */}
                            <td className="px-4 py-3.5 text-slate-600 font-sans font-medium">
                              {txn.date}
                            </td>

                            {/* Transaction details Description */}
                            <td className="px-4 py-3.5 text-slate-800 font-medium max-w-xs truncate" title={txn.details}>
                              {txn.details}
                            </td>

                            {/* Flow direction Badge */}
                            <td className="px-4 py-3.5">
                              {isDisbursed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-750 text-indigo-700 border border-indigo-150 rounded-full text-[10px] font-bold">
                                  <ArrowUpRight className="w-3 h-3 text-indigo-500" />
                                  <span>Paid</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-755 text-emerald-700 border border-emerald-150 rounded-full text-[10px] font-bold">
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                                  <span>Received</span>
                                </span>
                              )}
                            </td>

                            {/* Flow Amount numerical representation */}
                            <td className={`px-4 py-3.5 text-right font-mono font-bold ${isDisbursed ? 'text-indigo-700' : 'text-emerald-700'}`}>
                              {isDisbursed ? "+" : ""}${txn.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTxnForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-slate-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide font-mono">Ledger Transaction Record</h3>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedTxnForDetails.txn.id}</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedTxnForDetails(null)}
                className="p-1 px-2.5 hover:bg-slate-200/60 rounded-full text-slate-500 hover:text-slate-700 transition-colors font-mono font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Employee Quick Info Card */}
              <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-indigo-455 text-indigo-505 text-indigo-550 uppercase tracking-widest font-mono">Employee details</span>
                  <h4 className="text-base font-bold text-slate-805 text-slate-800 mt-0.5">{selectedTxnForDetails.employeeName}</h4>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">ID Ref: {selectedTxnForDetails.employeeId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectEmployee(selectedTxnForDetails.employeeUid);
                    setSelectedTxnForDetails(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-lg text-[11px] shadow-sm transition-all hover:translate-x-0.5 shadow-indigo-100"
                >
                  <span>View Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Transaction Basic Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Date Logged</span>
                  <div className="text-xs font-bold font-mono text-slate-700 mt-1">{selectedTxnForDetails.txn.date}</div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Flow Direction</span>
                  <div className="mt-1">
                    {selectedTxnForDetails.txn.amount < 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-150 rounded-full text-[10px] font-bold">
                        <ArrowDownLeft className="w-3 h-3 text-rose-500" />
                        <span>LGL Paid (-)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[10px] font-bold">
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        <span>LGL Received (+)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount Showcase Box */}
              <div className="bg-slate-900 text-white rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 opacity-10 font-bold font-mono text-[100px] leading-none">$</div>
                <div>
                  <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider font-mono">Net Transaction Amount</span>
                  <div className="text-2xl font-bold font-mono mt-1 text-slate-50">
                    {selectedTxnForDetails.txn.amount > 0 ? "+" : "-"}${Math.abs(selectedTxnForDetails.txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider font-mono">Subtype label</span>
                  <p className="text-xs font-semibold text-slate-300 mt-1">{selectedTxnForDetails.txn.amount < 0 ? "Paid Advance" : "Received Offset"}</p>
                </div>
              </div>

              {/* LGL Calculations Section (Project, Hrs, rate, taxes...) if they exist */}
              {selectedTxnForDetails.txn.customFields && Object.keys(selectedTxnForDetails.txn.customFields).some(k => ["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].includes(k)) && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5 pb-1">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest font-mono">Calculated Fields Details</span>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2.5 bg-slate-100/40">
                      <span className="text-slate-500 font-medium">Project Name:</span>
                      <span className="font-bold text-slate-800 text-right">{selectedTxnForDetails.txn.customFields["Project"] || "N/A"}</span>
                    </div>

                    <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                      <span className="text-slate-500 font-medium">Hours Worked (Hrs):</span>
                      <span className="font-mono text-slate-700 text-right">{selectedTxnForDetails.txn.customFields["Hrs"] || "0.00"} hrs</span>
                    </div>

                    <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                      <span className="text-slate-500 font-medium">Hourly Rate:</span>
                      <span className="font-mono text-slate-700 text-right">{selectedTxnForDetails.txn.customFields["Rate"] || "$0.00"} / hr</span>
                    </div>

                    <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2 bg-indigo-50/30">
                      <span className="text-indigo-900 font-semibold">Total Base (Hrs * Rate):</span>
                      <span className="font-mono font-bold text-indigo-750 text-indigo-700 text-right">{selectedTxnForDetails.txn.customFields["Total"] || "$0.00"}</span>
                    </div>

                    <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                      <span className="text-slate-500 font-medium">Employee Tax deduction:</span>
                      <span className="font-mono text-rose-600 text-right">-{selectedTxnForDetails.txn.customFields["Employee Tax"] || "$0.00"}</span>
                    </div>

                    <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                      <span className="text-slate-500 font-medium">Employer Tax deduction:</span>
                      <span className="font-mono text-rose-600 text-right">-{selectedTxnForDetails.txn.customFields["Employer Tax"] || "$0.00"}</span>
                    </div>

                    <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                      <span className="text-slate-500 font-medium">Insurance deduction:</span>
                      <span className="font-mono text-rose-600 text-right">-{selectedTxnForDetails.txn.customFields["Insurance"] || "$0.00"}</span>
                    </div>

                    {/* Net Calculation Check */}
                    <div className="grid grid-cols-2 px-4 py-2.5 bg-emerald-50/20">
                      <span className="text-emerald-900 font-bold">LGL Net Received:</span>
                      <span className="font-mono font-bold text-emerald-700 text-right">
                        ${Math.abs(selectedTxnForDetails.txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Custom Parameters / User Columns Section */}
              {selectedTxnForDetails.txn.customFields && Object.keys(selectedTxnForDetails.txn.customFields).filter(key => !["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].includes(key)).length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Dynamic Custom Fields (Registered Columns)</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedTxnForDetails.txn.customFields)
                      .filter(([key]) => !["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].includes(key))
                      .map(([key, val]) => (
                        <div key={key} className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">{key}</span>
                          <span className="text-xs font-semibold text-slate-800 mt-0.5">{val || "-"}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Transaction Description / Notes Memo */}
              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono block">Details & Description Notes</span>
                <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-150 min-h-[50px] text-slate-700 text-xs font-sans leading-relaxed">
                  {selectedTxnForDetails.txn.details || (
                    <span className="text-slate-400 italic">No notes or description provided with this record.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
              <button 
                type="button"
                onClick={() => setSelectedTxnForDetails(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {collectingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form onSubmit={handleConfirmCollectSubmit} className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-50 to-slate-50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-750 rounded-xl">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono">Confirm Collection Repayment</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Employee: {collectingItem.employee.fullName}</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setCollectingItem(null)}
                className="p-1 px-2.5 hover:bg-slate-200/60 rounded-full text-slate-500 hover:text-slate-700 transition-colors font-mono font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 text-slate-600">
                <div className="font-semibold text-slate-800">Original Advance Details:</div>
                <div className="font-medium text-slate-600">"{collectingItem.item.details}"</div>
                <div className="font-mono text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Paid on: {collectingItem.item.date}</span>
                  <span className="font-bold text-rose-600">Pending: ${collectingItem.item.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Repayment Collection Date</label>
                <input
                  type="date"
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Collected Amount ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                  <input
                    type="text"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="w-full pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Transaction Details Notes</label>
                <input
                  type="text"
                  value={collectDetails}
                  onChange={(e) => setCollectDetails(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCollectingItem(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-655 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-650/10 cursor-pointer"
              >
                Confirm Repayment Received
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BatchCollectionsModal rendered globally in App.tsx */}

    </div>
  );
}
