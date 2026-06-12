/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee } from "../types";

export const SEED_EMPLOYEES: Employee[] = [
  {
    id: "emp_1",
    employeeId: "EMP-2026-001",
    fullName: "Alex Rivera",
    email: "alex.rivera@globaltech.com",
    title: "Senior Cloud Engineer",
    department: "Engineering",
    lcaRecords: [
      {
        id: "lca_1_1",
        annualWage: 95000,
        effectiveFrom: "2026-01-01",
        tillDate: "2026-06-11",
        lcaNumber: "I-200-25310-482091",
        clientAddress: "100 Pine St, San Francisco, CA 94111 (Oracle Office)",
        residenceAddress: "450 Sutter St, Apt 12B, San Francisco, CA 94108"
      },
      {
        id: "lca_1_2",
        annualWage: 101000,
        effectiveFrom: "2026-06-12",
        lcaNumber: "I-200-26150-983141",
        clientAddress: "1 Oracle Way, Redwood City, CA 94065 (HQ Plaza)",
        residenceAddress: "450 Sutter St, Apt 12B, San Francisco, CA 94108"
      }
    ],
    payrollRecords: [
      { id: "p_1_1", year: 2026, month: 1, amount: 7916.67 }, // 95000 / 12
      { id: "p_1_2", year: 2026, month: 2, amount: 7916.67 },
      { id: "p_1_3", year: 2026, month: 3, amount: 7916.67 },
      { id: "p_1_4", year: 2026, month: 4, amount: 7916.67 },
      { id: "p_1_5", year: 2026, month: 5, amount: 7916.67 },
      // June expected: $8,233.34 due to transition on June 12
      // Let's record payroll as $8,000 which is slightly underpaid, triggering discrepancy visual warning
      { id: "p_1_6", year: 2026, month: 6, amount: 8000.00 }, 
      // July onward expected is $8,416.67
      { id: "p_1_7", year: 2026, month: 7, amount: 8416.67 },
      { id: "p_1_8", year: 2026, month: 8, amount: 8416.67 },
      { id: "p_1_9", year: 2026, month: 9, amount: 8500.00 }, // Bonus/Overpay
      { id: "p_1_10", year: 2026, month: 10, amount: 8416.67 },
      { id: "p_1_11", year: 2026, month: 11, amount: 8416.67 },
      { id: "p_1_12", year: 2026, month: 12, amount: 8416.67 },
    ],
    expenseColumns: ["Category", "Reference ID"],
    expenseTransactions: [
      {
        id: "exp_1_1",
        date: "05/14/2026",
        details: "Company disbursed advance cash (I gave $500)",
        amount: -500,
        customFields: {
          "Category": "Travel Advance",
          "Reference ID": "TXN_501"
        }
      },
      {
        id: "exp_1_2",
        date: "05/17/2026",
        details: "Employee paid back unused balance (Alex returned $200)",
        amount: 200,
        customFields: {
          "Category": "Reimbursement Offset",
          "Reference ID": "TXN_502"
        }
      }
    ]
  },
  {
    id: "emp_2",
    employeeId: "EMP-2026-002",
    fullName: "Elena Rostova",
    email: "elena.r@globaltech.com",
    title: "Data Scientist",
    department: "Analytics",
    lcaRecords: [
      {
        id: "lca_2_1",
        annualWage: 112000,
        effectiveFrom: "2026-01-01",
      },
      {
        id: "lca_2_2",
        annualWage: 124000,
        effectiveFrom: "2026-10-01", // Quarter 4 increase
      }
    ],
    payrollRecords: [
      { id: "p_2_1", year: 2026, month: 1, amount: 9333.33 }, // 112k / 12
      { id: "p_2_2", year: 2026, month: 2, amount: 9333.33 },
      { id: "p_2_3", year: 2026, month: 3, amount: 9333.33 },
      { id: "p_2_4", year: 2026, month: 4, amount: 9333.33 },
      { id: "p_2_5", year: 2026, month: 5, amount: 9333.33 },
      { id: "p_2_6", year: 2026, month: 6, amount: 9333.33 },
      { id: "p_2_7", year: 2026, month: 7, amount: 9333.33 },
      { id: "p_2_8", year: 2026, month: 8, amount: 9333.33 },
      { id: "p_2_9", year: 2026, month: 9, amount: 9333.33 },
      // Oct expected: 124k / 12 = 10,333.33, let's say payroll was entered as 9333.33 because HR missed the change!
      { id: "p_2_10", year: 2026, month: 10, amount: 9333.33 }, // Compliancy alert triggers!
      { id: "p_2_11", year: 2026, month: 11, amount: 10333.33 },
      { id: "p_2_12", year: 2026, month: 12, amount: 11333.33 }, // Compensated with higher payment
    ]
  },
  {
    id: "emp_3",
    employeeId: "EMP-2026-003",
    fullName: "Marcus Aurelius",
    email: "marcus.a@globaltech.com",
    title: "Marketing Strategist",
    department: "Marketing",
    lcaRecords: [
      {
        id: "lca_3_1",
        annualWage: 82000,
        effectiveFrom: "2026-01-01",
      }
    ],
    payrollRecords: [
      { id: "p_3_1", year: 2026, month: 1, amount: 6833.33 }, // 82k / 12
      { id: "p_3_2", year: 2026, month: 2, amount: 6833.33 },
      { id: "p_3_3", year: 2026, month: 3, amount: 6500.00 }, // Underpaid
      { id: "p_3_4", year: 2026, month: 4, amount: 6833.33 },
      { id: "p_3_5", year: 2026, month: 5, amount: 6900.00 },
      { id: "p_3_6", year: 2026, month: 6, amount: 6833.33 },
      { id: "p_3_7", year: 2026, month: 7, amount: 6833.33 },
    ]
  },
  {
    id: "emp_4",
    employeeId: "EMP-2026-004",
    fullName: "Diana Prince",
    email: "diana.prince@globaltech.com",
    title: "Legal Counsel",
    department: "Legal & Compliance",
    lcaRecords: [
      {
        id: "lca_4_1",
        annualWage: 135000,
        effectiveFrom: "2026-01-01",
      }
    ],
    payrollRecords: [
      { id: "p_4_1", year: 2026, month: 1, amount: 11250.00 }, // Equal Match
      { id: "p_4_2", year: 2026, month: 2, amount: 11250.00 },
      { id: "p_4_3", year: 2026, month: 3, amount: 11250.00 },
      { id: "p_4_4", year: 2026, month: 4, amount: 11250.00 },
      { id: "p_4_5", year: 2026, month: 5, amount: 11250.00 },
      { id: "p_4_6", year: 2026, month: 6, amount: 11250.00 },
    ]
  },
  {
    id: "emp_5",
    employeeId: "EMP-2026-005",
    fullName: "Sanjay Gupta",
    email: "sanjay.gupta@globaltech.com",
    title: "Senior Quality Specialist",
    department: "Operations",
    lcaRecords: [
      {
        id: "lca_5_1",
        annualWage: 88000,
        effectiveFrom: "2026-01-01",
      },
      {
        id: "lca_5_2",
        annualWage: 76000,
        effectiveFrom: "2026-08-15", // Mid-month downgrade / position shift
      }
    ],
    payrollRecords: [
      { id: "p_5_1", year: 2026, month: 1, amount: 7333.33 },
      { id: "p_5_2", year: 2026, month: 2, amount: 7333.33 },
      { id: "p_5_3", year: 2026, month: 3, amount: 7333.33 },
      { id: "p_5_4", year: 2026, month: 4, amount: 7333.33 },
      { id: "p_5_5", year: 2026, month: 5, amount: 7333.33 },
      { id: "p_5_6", year: 2026, month: 6, amount: 7333.33 },
      { id: "p_5_7", year: 2026, month: 7, amount: 7333.33 },
      // August expected: 14 days of 88k and 17 days of 76k.
      // 14 * ((88000/12)/31) + 17 * ((76000/12)/31) = 3311.83 + 3474.91 = 6786.74
      { id: "p_5_8", year: 2026, month: 8, amount: 6786.74 },
      { id: "p_5_9", year: 2026, month: 9, amount: 6333.33 }, // new stable rate 76000/12 = 6333.33
    ]
  }
];

export const DEFAULT_SECURITY_PIN = "1234";
export const DEFAULT_YEAR_SELECTION = 2026;
