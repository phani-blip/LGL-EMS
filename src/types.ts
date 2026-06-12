/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LCARecord {
  id: string;
  annualWage: number;
  effectiveFrom: string; // YYYY-MM-DD
  lcaNumber?: string;
  clientAddress?: string; // compiled / full address
  residenceAddress?: string; // compiled / full address
  tillDate?: string; // YYYY-MM-DD
  workMode?: "On-site" | "Hybrid" | "Remote";

  // Divided address components for Client Address
  clientAddress1?: string;
  clientAddress2?: string;
  clientCity?: string;
  clientCounty?: string;
  clientState?: string;
  clientZip?: string;

  // Divided address components for Residence Address
  residenceAddress1?: string;
  residenceAddress2?: string;
  residenceCity?: string;
  residenceCounty?: string;
  residenceState?: string;
  residenceZip?: string;
}

export interface PayrollRecord {
  id: string;
  year: number;
  month: number; // 1 = January, 12 = December
  amount: number;
  loaDays?: number;
}

export interface ExpenseTransaction {
  id: string;
  date: string; // MM/DD/YYYY or YYYY-MM-DD
  details: string;
  amount: number; // Positive (+) for company disbursed, Negative (-) for employee returned/paid back
  customFields?: Record<string, string>; // column_name -> value
}

export interface PendingCollection {
  id: string;
  paymentTxnId: string; // The ID of the negative disbursement transaction
  amount: number; // The amount paid (positive float)
  details: string; // The details/description of the payment
  date: string; // The date the payment was made (MM/DD/YYYY)
}

export interface Employee {
  id: string;
  employeeId: string; // Unique, e.g., EMP-101
  fullName: string;
  email: string;
  title: string;
  department: string;
  lcaRecords: LCARecord[];
  payrollRecords: PayrollRecord[];
  expenseTransactions?: ExpenseTransaction[];
  expenseColumns?: string[]; // list of names of dynamic extra columns
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  pendingCollections?: PendingCollection[];
}

export interface MonthlyBreakdown {
  monthName: string;
  monthNumber: number; // 1 - 12
  year: number;
  expectedLCAWage: number; // pro-rated if LCA changed mid-month
  actualPayrollPercent: number; // actual / expected * 100
  actualPayroll: number;
  difference: number; // actualPayroll - expectedLCAWage
  isMatching: boolean;
  notes: string;
  isFuture?: boolean;
}

export interface EmployeeSummary {
  employee: Employee;
  expectedAnnualLCA: number;
  actualAnnualPayroll: number;
  annualDifference: number;
  hasDiscrepancies: boolean;
  monthlyBreakdown: MonthlyBreakdown[];
}

export interface AuditActivity {
  id: string;
  timestamp: string;
  actionType: string;
  employeeName: string;
  details: string;
  adminEmail?: string;
}

