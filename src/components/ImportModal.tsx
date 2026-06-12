/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Upload, X, ShieldAlert, FileText, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { Employee } from "../types";
import { importEmployeesFromCSV, getCSVTemplate, getExpenseCSVTemplate, getEmployeeListTemplate, downloadCSV } from "../utils/lcaCalcs";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onImportComplete: (updated: Employee[]) => void;
}

export default function ImportModal({ isOpen, onClose, employees, onImportComplete }: ImportModalProps) {
  const [csvRaw, setCsvRaw] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [importStatus, setImportStatus] = useState<{
    resultsReady: boolean;
    successCount: number;
    errorCount: number;
    logs: string[];
    errorsList: string[];
    potentialNewEmployees: Employee[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const processFile = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setErrorMessage("Unsupported format. Please upload a valid CSV file (.csv).");
        resolve();
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setCsvRaw(text);
          setErrorMessage("");
          analyzeCSV(text);
        }
        resolve();
      };
      reader.onerror = () => {
        setErrorMessage("Failed to read the file. Please try again.");
        reject();
      };
      reader.readAsText(file);
    });
  };

  const analyzeCSV = (text: string) => {
    // Stage it to check what would be added or updated prior to committing
    const results = importEmployeesFromCSV(text, employees);
    
    // Calculate final counts
    const previousMap = new Map(employees.map(e => [e.employeeId.toUpperCase(), e]));
    let newCount = 0;
    
    results.updatedEmployees.forEach(e => {
      if (!previousMap.has(e.employeeId.toUpperCase())) {
        newCount++;
      }
    });

    setImportStatus({
      resultsReady: true,
      successCount: results.successList.length,
      errorCount: results.errors.length,
      logs: results.successList,
      errorsList: results.errors,
      potentialNewEmployees: results.updatedEmployees,
    });
  };

  const handleConfirmImport = () => {
    if (importStatus && importStatus.potentialNewEmployees.length > 0) {
      onImportComplete(importStatus.potentialNewEmployees);
      resetState();
      onClose();
    }
  };

  const resetState = () => {
    setCsvRaw("");
    setErrorMessage("");
    setImportStatus(null);
  };

  const handleDownloadTemplate = () => {
    const template = getCSVTemplate();
    downloadCSV(template, "lca_import_template.csv");
  };

  const handleDownloadExpenseTemplate = () => {
    const template = getExpenseCSVTemplate();
    downloadCSV(template, "expense_import_template.csv");
  };

  const handleDownloadEmployeeListTemplate = () => {
    const template = getEmployeeListTemplate();
    downloadCSV(template, "employee_list_template.csv");
  };

  return (
    <div id="import_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div id="import_modal_card" className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div id="import_header" className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-800 text-base">Bulk Import Employee Records</h3>
          </div>
          <button
            id="close_import_modal"
            onClick={() => {
              resetState();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div id="import_body" className="p-6 overflow-y-auto flex-1 space-y-5 text-sm text-slate-600">
          
          <div id="template_helper_box" className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
            <FileText className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-indigo-900 text-sm">Download standard bulk templates</h4>
              <p className="text-xs text-indigo-700/90 mt-0.5 leading-relaxed">
                Import datasets including LCA wage histories, expenses with positive/negative amounts, or a basic employee roster. Rows are merged by Name or Employee ID.
              </p>
              <div className="flex flex-wrap gap-4 mt-2.5">
                <button
                  id="download_template_btn"
                  onClick={handleDownloadTemplate}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Download LCA Template (.csv)
                </button>
                <span className="text-indigo-300 text-xs select-none">|</span>
                <button
                  id="download_expense_template_btn"
                  onClick={handleDownloadExpenseTemplate}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Download Expenses Template (.csv)
                </button>
                <span className="text-indigo-300 text-xs select-none">|</span>
                <button
                  id="download_employee_list_template_btn"
                  onClick={handleDownloadEmployeeListTemplate}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Download Employee List Template (.csv)
                </button>
              </div>
            </div>
          </div>

          {!importStatus?.resultsReady ? (
            /* Dropzone drag and drop screen */
            <div
              id="csv_dropzone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/40 scale-[0.99]"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 bg-white border border-slate-200 text-slate-500 shadow-sm rounded-full flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-700">Drag your CSV file here, or browse computer</p>
              <p className="text-xs text-slate-400 mt-1">Supports spreadsheet files saved in comma-separated (.csv) format only</p>

              {errorMessage && (
                <div id="upload_error_msg" className="mt-4 text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          ) : (
            /* Results & Merge Confirmation list */
            <div id="parse_results_view" className="space-y-4">
              <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">File Analysis Complete</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-800 leading-none">
                      {importStatus.successCount}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1 font-medium">Valid entries configured</div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-800 leading-none">
                      {importStatus.errorCount}
                    </div>
                    <div className="text-xs text-amber-600 mt-1 font-medium">Warnings / issues found</div>
                  </div>
                </div>
              </div>

              {/* Progress and status message logs */}
              {importStatus.logs.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block font-mono">Records Parsed Details</span>
                  <div className="max-h-32 overflow-y-auto bg-slate-900 text-amber-400 p-3 rounded-lg font-mono text-xs space-y-1">
                    {importStatus.logs.map((log, idx) => (
                      <div key={idx} className="flex gap-1">
                        <span className="text-slate-500">[{idx+1}]</span>
                        <span className="text-emerald-400">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings and format mismatch logs */}
              {importStatus.errorsList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider block font-mono">Validation Alerts / Warnings</span>
                  <div className="max-h-32 overflow-y-auto bg-rose-50/60 border border-rose-100 p-3 rounded-lg text-rose-800 text-xs font-mono space-y-1">
                    {importStatus.errorsList.map((err, idx) => (
                      <div key={idx} className="flex gap-1 items-start text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 italic">
                Notice: Merging will update existing metadata and append any new LCA wage intervals or monthly payroll lines for those employees. Unmodified fields will retain their previous values.
              </p>
            </div>
          )}

          {/* Formats Instruction Grid Column list */}
          <div id="template_schema_guide" className="border-t border-slate-100 pt-4 space-y-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono block">Required & Supported Metadata Headings Guide</span>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] leading-snug">
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-indigo-950 font-semibold">Name</span>
                <span className="text-slate-500 font-bold">Only field required (Full Name)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-slate-800 font-semibold">Employee ID</span>
                <span className="text-slate-400">Optional (generated if missing)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-slate-800 font-semibold">Wages</span>
                <span className="text-slate-400">Annual LCA Wage, e.g. 95000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-slate-800 font-semibold">Start Date</span>
                <span className="text-slate-400">LCA Effective Date (MM/DD/YYYY)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-slate-800 font-semibold">End Date</span>
                <span className="text-slate-400">LCA Expiry Date (MM/DD/YYYY)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-slate-800 font-semibold">LCA Number</span>
                <span className="text-slate-400">LCA Case Number case string</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100 col-span-2">
                <span className="font-mono text-slate-800 font-semibold">Work / Home Address (Divided)</span>
                <span className="text-slate-400">Split into Work/Home components: Line 1, Line 2, City, County, State, Zip (all optional)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-slate-800 font-semibold">Email / Job Title / Dept</span>
                <span className="text-slate-400">Basic metadata strings</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-slate-800 font-semibold">Date</span>
                <span className="text-slate-400">Expense transaction date</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-slate-800 font-semibold">Details</span>
                <span className="text-slate-400">Expense description</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="font-mono text-indigo-800 font-semibold font-bold">Amount</span>
                <span className="text-indigo-600 font-bold">Positive (+) to Refund, Negative (-) to Disburse</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div id="import_footer" className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            {importStatus?.resultsReady && (
              <button
                id="reset_import_btn"
                onClick={resetState}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Upload different file
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              id="cancel_import_btn"
              onClick={() => {
                resetState();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              Close
            </button>
            
            {importStatus?.resultsReady && (
              <button
                id="confirm_import_btn"
                disabled={importStatus.successCount === 0}
                onClick={handleConfirmImport}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg select-none cursor-pointer border shadow-sm transition-all ${
                  importStatus.successCount > 0
                    ? "bg-indigo-600 hover:bg-indigo-700 md:active:scale-98 border-indigo-500"
                    : "bg-slate-300 border-slate-200 cursor-not-allowed text-slate-500"
                }`}
              >
                Merge with Database
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
