/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { X, Search, Coins, AlertCircle, Save, CheckCircle2 } from "lucide-react";
import { Employee, ExpenseTransaction } from "../types";

interface BatchCollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  year: number;
  onBatchSave: (updatedList: Employee[], activityTitle: string, activityDetails: string) => Promise<void>;
}

export default function BatchCollectionsModal({
  isOpen,
  onClose,
  employees,
  year,
  onBatchSave,
}: BatchCollectionsModalProps) {
  const [txnDate, setTxnDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [txnDetails, setTxnDetails] = useState<string>("Monthly payroll recoupment");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Filter employees active for this year based on project duration
  const activeEmployeesForYear = useMemo(() => {
    return employees.filter((emp) => {
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

  // Apply search query
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeEmployeesForYear;
    return activeEmployeesForYear.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q) ||
        emp.title.toLowerCase().includes(q)
    );
  }, [activeEmployeesForYear, searchQuery]);

  // Count active entries where amount > 0
  const entryCount = useMemo(() => {
    return Object.keys(amounts).filter((key) => {
      const num = parseFloat(amounts[key]);
      return !isNaN(num) && num > 0;
    }).length;
  }, [amounts]);

  const handleAmountChange = (employeeId: string, value: string) => {
    // Keep only numbers and decimals
    const sanitized = value.replace(/[^0-9.]/g, "");
    setAmounts((prev) => ({
      ...prev,
      [employeeId]: sanitized,
    }));
  };

  const handlePostCollections = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!txnDate) {
      setErrorMsg("Please select a transaction date.");
      return;
    }

    if (!txnDetails.trim()) {
      setErrorMsg("Please enter transaction details description.");
      return;
    }

    // Filter out only employees that have a valid positive amount entered
    const updates: Employee[] = [];
    const logs: string[] = [];

    activeEmployeesForYear.forEach((emp) => {
      const valStr = amounts[emp.id];
      if (!valStr) return;

      const amt = parseFloat(valStr);
      if (isNaN(amt) || amt <= 0) return;

      // Create new transaction
      // Since it's a collected amount (recoupment), the value in the ledger is positive (+),
      // representing returned funds to the company.
      const newTxn: ExpenseTransaction = {
        id: `exp_${Math.random().toString(36).substr(2, 5)}_${Date.now()}`,
        date: formatDateToMDY(txnDate),
        details: txnDetails.trim(),
        amount: Number(amt.toFixed(2)),
      };

      const updatedEmp: Employee = {
        ...emp,
        expenseTransactions: [...(emp.expenseTransactions || []), newTxn],
      };
      updates.push(updatedEmp);
      logs.push(`${emp.fullName} ($${amt.toFixed(2)})`);
    });

    if (updates.length === 0) {
      setErrorMsg("No collections amounts have been entered.");
      return;
    }

    setLoading(true);

    try {
      const formattedDate = formatDateToMDY(txnDate);
      const activityTitle = "Batch Recoupments Logged";
      const activityDetails = `Posted payroll collections of "${txnDetails}" on ${formattedDate} to ${updates.length} employee ledgers: ${logs.join(", ")}`;
      
      await onBatchSave(updates, activityTitle, activityDetails);
      
      setAmounts({});
      onClose();
      alert(`Successfully posted batch collections for ${updates.length} employees.`);
    } catch (err) {
      console.error("Batch update failed", err);
      setErrorMsg("Failed to post batch transactions. Verify permissions.");
    } finally {
      setLoading(false);
    }
  };

  const formatDateToMDY = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  if (!isOpen) return null;

  return (
    <div id="batch_collections_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div id="batch_collections_card" className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div id="batch_collections_header" className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800 text-base">Record Batch Employee Collections</h3>
          </div>
          <button
            type="button"
            id="close_batch_collections_modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePostCollections} className="flex flex-col flex-1 overflow-hidden">
          <div id="batch_collections_body" className="p-6 overflow-y-auto flex-1 space-y-5 text-sm text-slate-600">
            {/* Instruction Callout */}
            <div className="flex items-start gap-2.5 bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl text-slate-700 leading-relaxed text-xs">
              <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                Type the monthly collected amount next to each employee. Submitting will instantly add these amounts as recoupment transactions to their respective ledgers under the selected date and description.
              </div>
            </div>

            {/* Date and Description row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono text-slate-500">
                  Collection Posting Date
                </label>
                <input
                  type="date"
                  value={txnDate}
                  onChange={(e) => setTxnDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono text-slate-500">
                  Transaction Notes / Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly payroll adjustment"
                  value={txnDetails}
                  onChange={(e) => setTxnDetails(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Search toolbar */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search active employees by name, ID, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 bg-white placeholder:text-slate-400"
              />
            </div>

            {/* Error alerts */}
            {errorMsg && (
              <div className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Grid of employees */}
            <div className="border border-slate-150 rounded-xl overflow-hidden bg-white max-h-[35vh] overflow-y-auto">
              <table className="w-full text-xs text-left text-slate-500 border-collapse">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold font-mono tracking-wider sticky top-0 z-10 border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-4 py-2 bg-slate-50">Employee</th>
                    <th scope="col" className="px-4 py-2 text-right bg-slate-50">Amount Collected ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center italic text-slate-400">
                        No active employees matching the query.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-800">{emp.fullName}</div>
                          <div className="text-[10px] text-slate-450 font-mono mt-0.5 flex gap-2">
                            <span>{emp.employeeId}</span>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">{emp.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="relative inline-block w-32">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                            <input
                              type="text"
                              placeholder="0.00"
                              value={amounts[emp.id] || ""}
                              onChange={(e) => handleAmountChange(emp.id, e.target.value)}
                              className="w-full pl-5 pr-2.5 py-1 text-right font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer actions */}
          <div id="batch_collections_footer" className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || entryCount === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white border flex items-center gap-1.5 cursor-pointer transition-all ${
                loading || entryCount === 0
                  ? "bg-slate-300 border-slate-300 cursor-not-allowed opacity-60"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:border-indigo-800 text-white border-indigo-650 shadow-md shadow-indigo-650/10 active:scale-97"
              }`}
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Post Collections ({entryCount})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
