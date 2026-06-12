/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, ShieldCheck, ShieldAlert, X, Sparkles, ChevronLeft, ChevronRight, User, Briefcase, Mail, MapPin, CreditCard, Calendar, Building, ArrowDownUp, Trash2, Check } from "lucide-react";
import { Employee } from "../types";
import { calculateEmployeeSummary } from "../utils/lcaCalcs";
import {
  US_STATES,
  validateLCANumber,
  validateZipCode,
  formatLCANumber,
  compileFullAddress,
  getAddressSuggestions,
  getGoogleMapsAddressSuggestions,
  getPlaceDetails
} from "../utils/addressHelpers";

const getInitials = (name: string): string => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  const first = parts[0][0] || "";
  const last = parts[parts.length - 1][0] || "";
  return (first + last).toUpperCase();
};

interface FloatingInputProps {
  label: string;
  id: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
}

function FloatingInput({ 
  label, 
  id, 
  value, 
  onFocus, 
  onBlur, 
  className = "", 
  placeholder = "", 
  type = "text",
  required = false,
  onChange 
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "";

  return (
    <div className={`relative border rounded-xl bg-slate-50/20 transition-all duration-150 px-3.5 pt-4.5 pb-1 flex flex-col justify-center min-h-[50px] ${
      isFocused 
        ? "border-indigo-600 ring-4 ring-indigo-100/60 bg-white shadow-xs" 
        : "border-slate-200 hover:border-slate-300"
    } ${className}`}>
      <label 
        htmlFor={id} 
        className={`absolute left-3.5 transition-all duration-150 pointer-events-none font-mono ${
          isFocused || hasValue 
            ? "top-1.5 text-[9px] font-bold text-indigo-600 uppercase tracking-wider" 
            : "top-3.5 text-xs text-slate-400 font-medium"
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        type={type}
        required={required}
        placeholder={isFocused ? placeholder : ""}
        onChange={onChange}
        onFocus={(e) => {
          setIsFocused(true);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          if (onBlur) onBlur(e);
        }}
        className="w-full bg-transparent text-xs text-slate-800 outline-none pt-1"
      />
    </div>
  );
}

interface FloatingSelectProps {
  label: string;
  id: string;
  value: string;
  required?: boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  options: { code: string; name: string }[] | string[] | any[];
  className?: string;
}

function FloatingSelect({ 
  label, 
  id, 
  value, 
  options, 
  onFocus, 
  onBlur, 
  className = "", 
  required = false,
  onChange 
}: FloatingSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "";

  return (
    <div className={`relative border rounded-xl bg-slate-50/20 transition-all duration-150 px-3.5 pt-4.5 pb-1 flex flex-col justify-center min-h-[50px] ${
      isFocused 
        ? "border-indigo-600 ring-4 ring-indigo-100/60 bg-white shadow-xs" 
        : "border-slate-200 hover:border-slate-300"
    } ${className}`}>
      <label 
        htmlFor={id} 
        className={`absolute left-3.5 transition-all duration-155 pointer-events-none font-mono ${
          isFocused || hasValue 
            ? "top-1.5 text-[9px] font-bold text-indigo-600 uppercase tracking-wider" 
            : "top-3.5 text-xs text-slate-405 text-slate-400 font-medium"
        }`}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        required={required}
        onChange={onChange}
        onFocus={(e) => {
          setIsFocused(true);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          if (onBlur) onBlur(e);
        }}
        className="w-full bg-transparent text-xs text-slate-800 outline-none pt-1 appearance-none cursor-pointer"
      >
        <option value=""></option>
        {options.map((opt: any) => {
          const code = typeof opt === "string" ? opt : opt.code;
          const displayLabel = typeof opt === "string" ? opt : (opt.name || opt.label || opt.code);
          return (
            <option key={code} value={code}>
              {displayLabel}
            </option>
          );
        })}
      </select>
      <div className="absolute right-3.5 top-4.5 pointer-events-none text-slate-400">
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
}

interface EmployeeListProps {
  employees: Employee[];
  selectedEmployeeId: string | null;
  onSelectEmployee: (id: string | null) => void;
  onAddEmployee: (newEmp: Employee) => void;
  onDeleteEmployees?: (ids: string[]) => Promise<void>;
  year: number;
  calculationMode?: "ytd" | "full";
}

export default function EmployeeList({
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  onAddEmployee,
  onDeleteEmployees,
  year,
  calculationMode = "ytd",
}: EmployeeListProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState<boolean>(false);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // New Employee fields
  const [empId, setEmpId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [initialWage, setInitialWage] = useState<string>("");
  const [wageDate, setWageDate] = useState<string>(`${year}-01-01`);
  const [lcaNumber, setLcaNumber] = useState<string>("");
  const [empStartDate, setEmpStartDate] = useState<string>("");
  const [empEndDate, setEmpEndDate] = useState<string>("");
  const [workMode, setWorkMode] = useState<"On-site" | "Hybrid" | "Remote">("On-site");
  
  // Client Address Subfields
  const [clientAddr1, setClientAddr1] = useState<string>("");
  const [clientAddr2, setClientAddr2] = useState<string>("");
  const [clientCity, setClientCity] = useState<string>("");
  const [clientCounty, setClientCounty] = useState<string>("");
  const [clientState, setClientState] = useState<string>("");
  const [clientZip, setClientZip] = useState<string>("");
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState<boolean>(false);

  // Residence Address Subfields
  const [resAddr1, setResAddr1] = useState<string>("");
  const [resAddr2, setResAddr2] = useState<string>("");
  const [resCity, setResCity] = useState<string>("");
  const [resCounty, setResCounty] = useState<string>("");
  const [resState, setResState] = useState<string>("");
  const [resZip, setResZip] = useState<string>("");
  const [resSuggestions, setResSuggestions] = useState<any[]>([]);
  const [showResSuggestions, setShowResSuggestions] = useState<boolean>(false);

  const [tillDate, setTillDate] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const clientTimeoutRef = useRef<any>(null);
  const resTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (clientTimeoutRef.current) clearTimeout(clientTimeoutRef.current);
      if (resTimeoutRef.current) clearTimeout(resTimeoutRef.current);
    };
  }, []);

  const handleClientAddr1Change = (val: string) => {
    setClientAddr1(val);
    if (clientTimeoutRef.current) {
      clearTimeout(clientTimeoutRef.current);
    }

    if (val.trim().length >= 3) {
      clientTimeoutRef.current = setTimeout(async () => {
        const sugs = await getGoogleMapsAddressSuggestions(val);
        setClientSuggestions(sugs);
        setShowClientSuggestions(true);
      }, 300);
    } else {
      setClientSuggestions([]);
      setShowClientSuggestions(false);
    }
  };

  const handleSelectClientSuggestion = async (sug: any) => {
    if (clientTimeoutRef.current) {
      clearTimeout(clientTimeoutRef.current);
    }
    if (sug.placeId) {
      setClientAddr1(sug.address1 || sug.label);
      const details = await getPlaceDetails(sug.placeId);
      if (details.address1) setClientAddr1(details.address1);
      if (details.city) setClientCity(details.city);
      if (details.county) setClientCounty(details.county);
      if (details.state) setClientState(details.state);
      if (details.zip) setClientZip(details.zip);
    } else {
      setClientAddr1(sug.address1);
      setClientAddr2(sug.address2 || "");
      setClientCity(sug.city);
      setClientCounty(sug.county);
      setClientState(sug.state);
      setClientZip(sug.zip);
    }
    setClientSuggestions([]);
    setShowClientSuggestions(false);
  };

  const handleResAddr1Change = (val: string) => {
    setResAddr1(val);
    if (resTimeoutRef.current) {
      clearTimeout(resTimeoutRef.current);
    }

    if (val.trim().length >= 3) {
      resTimeoutRef.current = setTimeout(async () => {
        const sugs = await getGoogleMapsAddressSuggestions(val);
        setResSuggestions(sugs);
        setShowResSuggestions(true);
      }, 300);
    } else {
      setResSuggestions([]);
      setShowResSuggestions(false);
    }
  };

  const handleSelectResSuggestion = async (sug: any) => {
    if (resTimeoutRef.current) {
      clearTimeout(resTimeoutRef.current);
    }
    if (sug.placeId) {
      setResAddr1(sug.address1 || sug.label);
      const details = await getPlaceDetails(sug.placeId);
      if (details.address1) setResAddr1(details.address1);
      if (details.city) setResCity(details.city);
      if (details.county) setResCounty(details.county);
      if (details.state) setResState(details.state);
      if (details.zip) setResZip(details.zip);
    } else {
      setResAddr1(sug.address1);
      setResAddr2(sug.address2 || "");
      setResCity(sug.city);
      setResCounty(sug.county);
      setResState(sug.state);
      setResZip(sug.zip);
    }
    setResSuggestions([]);
    setShowResSuggestions(false);
  };

  // New Initial Expense Ledger options
  const [initialExpAmount, setInitialExpAmount] = useState<string>("");
  const [initialExpType, setInitialExpType] = useState<"disbursed" | "returned">("disbursed");
  const [initialExpDetails, setInitialExpDetails] = useState<string>("");
  const [initialExpDate, setInitialExpDate] = useState<string>(`${year}-01-01`);

  // Process search filter and auto-sort in alphabetical order
  const filteredEmployees = employees
    .filter(emp => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (
        emp.fullName.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.title.toLowerCase().includes(q)
      );

      // Filter by start and end dates based on year
      let matchesYear = true;
      if (emp.startDate) {
        const startYear = new Date(emp.startDate).getFullYear();
        if (startYear > year) matchesYear = false;
      }
      if (emp.endDate) {
        const endYear = new Date(emp.endDate).getFullYear();
        if (endYear < year) matchesYear = false;
      }

      return matchesSearch && matchesYear;
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const handleAddNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setErrorMsg("Please complete the required field (Employee Name).");
      return;
    }

    // Determine target Employee ID, auto-generate if empty
    let finalEmpId = empId.trim();
    if (!finalEmpId) {
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 100) {
        const candidate = `EMP-AUTO-${Math.floor(1000 + Math.random() * 9000)}`;
        if (!employees.some(emp => emp.employeeId.toUpperCase() === candidate.toUpperCase())) {
          finalEmpId = candidate;
          isUnique = true;
        }
        attempts++;
      }
      if (!isUnique) {
        finalEmpId = `EMP-AUTO-${Date.now()}`;
      }
    } else {
      // Check duplicate ID user manually entered
      const exists = employees.some(emp => emp.employeeId.toUpperCase() === finalEmpId.toUpperCase());
      if (exists) {
        setErrorMsg(`An employee with ID '${finalEmpId}' already exists.`);
        return;
      }
    }

    // Set fallback defaults for email, title, department
    const finalEmail = email.trim() || `${fullName.trim().toLowerCase().replace(/\s+/g, ".")}@company.com`;
    const finalTitle = title.trim() || "Team Member";

    // Optional Initial LCA Wage Configuration
    const parsedWage = parseFloat(initialWage.replace(/[^0-9.]/g, ""));
    
    // Validate LCA Number
    if (lcaNumber.trim() && !validateLCANumber(lcaNumber.trim())) {
      setErrorMsg("LCA Number is invalid. Format must be I-200-XXXXX-XXXXXX (starts with I-200- followed by 5 digits and 6 digits)");
      return;
    }

    // Validate Client ZIP Code
    if (clientZip.trim() && !validateZipCode(clientZip)) {
      setErrorMsg("LCA Client Zip Code is invalid. Must be standard 5-digit format (e.g. 94065) or 5+4 format (e.g. 94065-1234)");
      return;
    }

    // Validate Residence ZIP Code
    if (resZip.trim() && !validateZipCode(resZip)) {
      setErrorMsg("Employee Residence Zip Code is invalid. Must be standard 5-digit format (e.g. 94108) or 5+4 format (e.g. 94108-1234)");
      return;
    }

    const compiledClient = clientAddr1.trim()
      ? compileFullAddress(clientAddr1, clientAddr2, clientCity, clientCounty, clientState, clientZip)
      : undefined;

    const compiledResidence = resAddr1.trim()
      ? compileFullAddress(resAddr1, resAddr2, resCity, resCounty, resState, resZip)
      : undefined;

    const lcaRecords = !isNaN(parsedWage) && parsedWage > 0
      ? [{ 
          id: `lca_${Date.now()}`, 
          annualWage: parsedWage, 
          effectiveFrom: wageDate,
          lcaNumber: lcaNumber.trim() || undefined,
          clientAddress: compiledClient,
          residenceAddress: compiledResidence,
          tillDate: tillDate.trim() || undefined,
          workMode,
          
          clientAddress1: clientAddr1.trim() || undefined,
          clientAddress2: clientAddr2.trim() || undefined,
          clientCity: clientCity.trim() || undefined,
          clientCounty: clientCounty.trim() || undefined,
          clientState: clientState.trim() || undefined,
          clientZip: clientZip.trim() || undefined,

          residenceAddress1: resAddr1.trim() || undefined,
          residenceAddress2: resAddr2.trim() || undefined,
          residenceCity: resCity.trim() || undefined,
          residenceCounty: resCounty.trim() || undefined,
          residenceState: resState.trim() || undefined,
          residenceZip: resZip.trim() || undefined,
        }]
      : [];

    // Optional Initial Expense Configuration
    const parsedExpAmount = parseFloat(initialExpAmount.replace(/[^0-9.]/g, ""));
    const expenseTransactions = [];
    if (!isNaN(parsedExpAmount) && parsedExpAmount > 0) {
      const finalAmt = initialExpType === "disbursed" ? parsedExpAmount : -parsedExpAmount;
      
      // format to MM/DD/YYYY for transaction view consistency
      let mdYDate = initialExpDate;
      const dateParts = initialExpDate.split("-");
      if (dateParts.length === 3) {
        mdYDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
      }

      expenseTransactions.push({
        id: `txn_${Date.now()}`,
        date: mdYDate,
        details: initialExpDetails.trim() || (initialExpType === "disbursed" ? "Initial Company Disbursement" : "Initial Employee Repayment"),
        amount: finalAmt,
        customFields: {}
      });
    }

    const newEmployee: Employee = {
      id: `emp_${Date.now()}`,
      employeeId: finalEmpId,
      fullName: fullName.trim(),
      email: finalEmail,
      title: finalTitle,
      department: "Operations", // Fallback standard default to keep type safety
      lcaRecords,
      payrollRecords: [],
      expenseTransactions,
      startDate: empStartDate || undefined,
      endDate: empEndDate || undefined,
    };

    onAddEmployee(newEmployee);
    resetForm();
  };

  const resetForm = () => {
    setEmpId("");
    setFullName("");
    setEmail("");
    setTitle("");
    setInitialWage("");
    setWageDate(`${year}-01-01`);
    setLcaNumber("");
    setEmpStartDate("");
    setEmpEndDate("");
    setWorkMode("On-site");
    
    // Clear Client Address Subfields
    setClientAddr1("");
    setClientAddr2("");
    setClientCity("");
    setClientCounty("");
    setClientState("");
    setClientZip("");
    setClientSuggestions([]);
    setShowClientSuggestions(false);

    // Clear Residence Address Subfields
    setResAddr1("");
    setResAddr2("");
    setResCity("");
    setResCounty("");
    setResState("");
    setResZip("");
    setResSuggestions([]);
    setShowResSuggestions(false);

    setTillDate("");
    setInitialExpAmount("");
    setInitialExpType("disbursed");
    setInitialExpDetails("");
    setInitialExpDate(`${year}-01-01`);
    setErrorMsg("");
    setShowAddForm(false);
  };

  return (
    <div 
      id="employee_sidebar_wrapper" 
      className={`${
        isCollapsed ? "w-12 md:w-16" : "w-64"
      } border-r border-slate-200 bg-white lg:bg-slate-50/50 flex flex-col h-full shrink-0 transition-all duration-200 relative`}
    >
      {isCollapsed ? (
        /* Collapsed Sidebar Mode */
        <div className="flex flex-col h-full items-center py-4 justify-between">
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Expand Toggler btn */}
            <button
              type="button"
              id="expand_sidebar_btn"
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-150/40 rounded-lg cursor-pointer transition-all border border-slate-200/80 bg-white shadow-sm flex items-center justify-center"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Quick mini plus register profile icon */}
            <button
              type="button"
              id="collapsed_register_emp"
              onClick={() => setShowAddForm(true)}
              className="p-1.5 bg-indigo-650 text-white hover:bg-indigo-750 transition-colors rounded-lg shadow-sm cursor-pointer flex items-center justify-center"
              title="Register New Employee"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="w-full border-b border-slate-200/60 my-1" />

            {/* Micro avatar listing with custom hovering tooltips */}
            <div id="sidebar_collapsed_list" className="w-full flex-1 overflow-y-auto px-1.5 space-y-2 flex flex-col items-center">
              {filteredEmployees.map(emp => {
                const isSelected = selectedEmployeeId === emp.id;
                const summary = calculateEmployeeSummary(emp, year, calculationMode);

                return (
                  <button
                    key={emp.id}
                    id={`employee_avatar_link_${emp.id}`}
                    onClick={() => onSelectEmployee(emp.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative transition-all cursor-pointer group ${
                      isSelected
                        ? "bg-indigo-650 text-white shadow-md shadow-indigo-600/20 scale-[1.03]"
                        : "bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200"
                    }`}
                    title={emp.fullName}
                  >
                    <span className="text-xs font-bold font-sans tracking-tight leading-none">
                      {getInitials(emp.fullName)}
                    </span>

                    {summary.hasDiscrepancies ? (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white bg-rose-500 animate-pulse" />
                    ) : (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white bg-emerald-500" />
                    )}

                    {/* Desktop high contrast hover floating indicator label tooltip */}
                    <div className="absolute left-14 scale-0 group-hover:scale-100 transition-all duration-150 bg-slate-900 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md z-[50] pointer-events-none origin-left">
                      {emp.fullName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter uppercase mb-1">EMP</span>
        </div>
      ) : (
        /* Fully Expanded Standard Sidebar Mode */
        <>
          {/* Search Header toolbar */}
          <div id="sidebar_search_header" className="p-4 border-b border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-550 uppercase tracking-widest font-mono">Employees</span>
                <button
                  type="button"
                  id="toggle_collapse_sidebar_btn"
                  onClick={() => {
                    setIsCollapsed(true);
                    setIsBulkDeleteMode(false);
                    setSelectedEmpIds([]);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {employees.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkDeleteMode(!isBulkDeleteMode);
                      setSelectedEmpIds([]);
                      if (isCollapsed) {
                        setIsCollapsed(false);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center border ${
                      isBulkDeleteMode
                        ? "bg-rose-600 border-rose-700 text-white hover:bg-rose-700 hover:border-rose-800"
                        : "bg-white border-rose-100 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    }`}
                    title={isBulkDeleteMode ? "Cancel Bulk Delete" : "Bulk Delete Employees"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  id="toggle_add_form_btn"
                  onClick={() => setShowAddForm(true)}
                  className="p-1.5 bg-indigo-650 text-white hover:bg-indigo-750 transition-colors rounded-lg shadow-sm hover:shadow-indigo-500/10 cursor-pointer flex items-center justify-center"
                  title="Register New Employee"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="employee_side_search"
                type="text"
                placeholder="Search employee or ID..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Small delay to allow clicking suggestions
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                className="w-full bg-slate-100 border-none rounded-lg px-4 py-2 pl-10 focus:ring-2 focus:ring-indigo-500 text-xs focus:outline-none transition-all"
              />

              {/* Autocomplete Suggestions Dropdown */}
              {showSuggestions && searchQuery.trim() !== "" && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto py-1 animate-fade-in">
                  {(() => {
                    const matched = employees
                      .filter(emp => 
                        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .sort((a, b) => a.fullName.localeCompare(b.fullName));

                    return matched.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400 italic">
                        No matching names found
                      </div>
                    ) : (
                      matched.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onMouseDown={(e) => {
                            // Prevent input focus loss so click is fully registered
                            e.preventDefault();
                          }}
                          onClick={() => {
                            setSearchQuery(emp.fullName);
                            onSelectEmployee(emp.id);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors border-b border-slate-50/50 last:border-b-0"
                        >
                          <div className="w-6 h-6 bg-indigo-50 text-indigo-700 font-bold rounded-full flex items-center justify-center text-[10px] shrink-0">
                            {getInitials(emp.fullName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-700 truncate">{emp.fullName}</div>
                            <div className="text-[9px] text-slate-500 font-mono truncate">{emp.employeeId}</div>
                          </div>
                        </button>
                      ))
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Interactive list view */}
          {isBulkDeleteMode && (
            <div className="bg-rose-50 border-b border-rose-100 p-3 flex items-center justify-between gap-2 animate-fadeIn shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  onClick={() => {
                    const allFilteredIds = filteredEmployees.map(emp => emp.id);
                    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedEmpIds.includes(id));
                    if (isAllSelected) {
                      setSelectedEmpIds(selectedEmpIds.filter(id => !allFilteredIds.includes(id)));
                    } else {
                      setSelectedEmpIds(Array.from(new Set([...selectedEmpIds, ...allFilteredIds])));
                    }
                  }}
                  className="cursor-pointer select-none"
                  title="Toggle Select All"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    (() => {
                      const allFilteredIds = filteredEmployees.map(emp => emp.id);
                      return allFilteredIds.length > 0 && allFilteredIds.every(id => selectedEmpIds.includes(id));
                    })()
                      ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                      : "border-slate-300 bg-white"
                  }`}>
                    {(() => {
                      const allFilteredIds = filteredEmployees.map(emp => emp.id);
                      return allFilteredIds.length > 0 && allFilteredIds.every(id => selectedEmpIds.includes(id));
                    })() && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
                <div className="text-[11px] font-bold text-rose-700 font-mono">
                  {selectedEmpIds.length} selected
                </div>
              </div>
              <div>
                <button
                  type="button"
                  disabled={selectedEmpIds.length === 0}
                  onClick={async () => {
                    if (onDeleteEmployees) {
                      await onDeleteEmployees(selectedEmpIds);
                    }
                    setIsBulkDeleteMode(false);
                    setSelectedEmpIds([]);
                  }}
                  className={`px-2.5 py-1 text-[10px] font-extrabold text-white rounded-md cursor-pointer transition-all flex items-center gap-1 ${
                    selectedEmpIds.length === 0
                      ? "bg-rose-400 opacity-50 cursor-not-allowed"
                      : "bg-rose-600 hover:bg-rose-700 active:scale-98 shadow-sm shadow-rose-600/10"
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          )}

          <div id="sidebar_employees_scroll" className="flex-1 overflow-y-auto divide-y divide-slate-100/60 p-2 space-y-1">
            {filteredEmployees.length === 0 ? (
              <div id="no_employees_notif" className="p-8 text-center text-xs text-slate-400 italic">
                No matching employee records.
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const summary = calculateEmployeeSummary(emp, year, calculationMode);
                const isSelected = selectedEmployeeId === emp.id;
                const isDeleteSelected = selectedEmpIds.includes(emp.id);

                return (
                  <button
                    key={emp.id}
                    id={`employee_row_${emp.id}`}
                    onClick={() => {
                      if (isBulkDeleteMode) {
                        if (isDeleteSelected) {
                          setSelectedEmpIds(selectedEmpIds.filter(id => id !== emp.id));
                        } else {
                          setSelectedEmpIds([...selectedEmpIds, emp.id]);
                        }
                      } else {
                        onSelectEmployee(emp.id);
                      }
                    }}
                    className={`w-full text-left p-3.5 rounded-xl cursor-pointer select-none transition-all flex items-center gap-3 relative border ${
                      isBulkDeleteMode
                        ? (isDeleteSelected
                            ? "bg-rose-50 border-rose-200 hover:bg-rose-100/70 text-rose-950 border-l-4 border-l-rose-500 scale-[1.01]"
                            : "bg-white hover:bg-slate-50 border-slate-100 text-slate-750 border-l-4 border-l-transparent")
                        : (isSelected
                            ? "bg-slate-900 border-slate-950 text-white shadow-lg shadow-slate-900/10 scale-[1.01] border-l-4 border-l-indigo-500"
                            : "bg-white hover:bg-indigo-50/30 border-slate-100 hover:border-indigo-100 text-slate-750 hover:text-indigo-900 border-l-4 border-l-transparent hover:border-l-indigo-600")
                    }`}
                  >
                    {isBulkDeleteMode ? (
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isDeleteSelected
                          ? "bg-rose-600 border-rose-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}>
                        {isDeleteSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    ) : (
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold font-sans tracking-tight transition-colors ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-650 font-bold"
                      }`}>
                        {getInitials(emp.fullName)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`font-bold text-xs tracking-wide truncate block ${
                          isBulkDeleteMode 
                            ? (isDeleteSelected ? "text-rose-950 font-extrabold" : "text-slate-800")
                            : (isSelected ? "text-slate-50" : "text-slate-800")
                        }`}>
                          {emp.fullName}
                        </span>
                        {/* Compact compliance status indicator */}
                        {!isBulkDeleteMode && (
                          summary.hasDiscrepancies ? (
                            <span className={`w-2 h-2 rounded-full ring-4 shrink-0 shadow-sm ${
                              isSelected ? "bg-amber-400 ring-slate-800 animate-pulse" : "bg-rose-500 ring-rose-100 animate-pulse"
                            }`} title="LCA Payroll Discrepancies Noted"/>
                          ) : (
                            <span className={`w-2 h-2 rounded-full ring-4 shrink-0 shadow-sm ${
                              isSelected ? "bg-indigo-500 ring-slate-800" : "bg-indigo-500 ring-indigo-50"
                            }`} title="Fully LCA Compliant"/>
                          )
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] mt-1 opacity-80 font-mono">
                        <span className={`truncate leading-none ${
                          isBulkDeleteMode
                            ? (isDeleteSelected ? "text-rose-700" : "text-slate-500")
                            : (isSelected ? "text-slate-350" : "text-slate-500")
                        }`}>{emp.employeeId}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Add Employee Slide/Modal Overlay form */}
      {showAddForm && (
        <div id="add_employee_popup_overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[45] flex justify-end">
          <div id="add_employee_dialog" className="bg-white w-full max-w-xl h-screen max-h-screen shadow-2xl flex flex-col text-sm border-l border-slate-100 relative overflow-hidden">
            
            <div id="add_employee_title" className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                  Register Employee Profile
                </span>
                <p className="text-[11px] text-slate-500 font-normal">Create compliance records, set target wages, and register primary worksites.</p>
              </div>
              <button
                id="close_add_employee"
                onClick={resetForm}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all cursor-pointer border border-transparent hover:border-slate-205"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewEmployee} className="flex-1 flex flex-col overflow-hidden">
              <div id="add_employee_form_scroll_container" className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/40 min-h-0">
                {errorMsg && (
                  <div id="add_employee_err_box" className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Section 1: Professional Identity */}
                <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800 text-xs tracking-tight uppercase font-mono">Professional Identity</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingInput
                      id="new_employee_fullname"
                      label="Full Name *"
                      required
                      placeholder="e.g. Diana Prince"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />

                    <FloatingInput
                      id="new_employee_id"
                      label="Employee ID (Optional)"
                      placeholder="Auto-generated if empty"
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value)}
                    />

                    <FloatingInput
                      id="new_employee_title"
                      label="Job Title (Optional)"
                      placeholder="e.g. Senior Software Engineer"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />

                    <FloatingInput
                      id="new_employee_email"
                      label="Work Email (Optional)"
                      type="email"
                      placeholder="diana.prince@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />

                    <FloatingInput
                      id="new_employee_start_date"
                      label="Start Date"
                      type="date"
                      value={empStartDate}
                      onChange={(e) => setEmpStartDate(e.target.value)}
                    />

                    <FloatingInput
                      id="new_employee_end_date"
                      label="End Date"
                      type="date"
                      value={empEndDate}
                      onChange={(e) => setEmpEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section 2: LCA Compliance Metadata */}
                <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800 text-xs tracking-tight uppercase font-mono">LCA Compliance Metadata (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingInput
                      id="new_employee_lca_wage"
                      label="Annual LCA Salary"
                      placeholder="e.g. $95,000"
                      value={initialWage}
                      onChange={(e) => setInitialWage(e.target.value)}
                    />
                    <div className="relative">
                      <FloatingInput
                        id="new_employee_lca_number"
                        label="LCA Case Number"
                        placeholder="e.g. I-200-24125-123456"
                        value={lcaNumber}
                        onChange={(e) => setLcaNumber(e.target.value)}
                        onBlur={(e) => setLcaNumber(formatLCANumber(e.target.value))}
                      />
                      {lcaNumber.trim() && !validateLCANumber(lcaNumber.trim()) && (
                        <p className="text-[9px] font-semibold text-amber-600 mt-1">Needs format: I-200-XXXXX-XXXXXX</p>
                      )}
                    </div>

                    <FloatingInput
                      id="new_employee_lca_date"
                      label="Effective From"
                      type="date"
                      value={wageDate}
                      onChange={(e) => setWageDate(e.target.value)}
                    />
                    <FloatingInput
                      id="new_employee_lca_till_date"
                      label="Expiration Date"
                      type="date"
                      value={tillDate}
                      onChange={(e) => setTillDate(e.target.value)}
                    />

                    <div className="relative border border-slate-200 rounded-xl bg-slate-50/20 px-3.5 pt-1.5 pb-1 min-h-[50px] flex flex-col justify-center">
                      <label htmlFor="new_employee_work_mode" className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                        Work Mode
                      </label>
                      <select
                        id="new_employee_work_mode"
                        value={workMode}
                        onChange={(e) => setWorkMode(e.target.value as any)}
                        className="w-full bg-transparent text-xs text-slate-800 outline-none mt-1 font-sans cursor-pointer"
                      >
                        <option value="On-site">On-site</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote">Remote</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Client Address divided fields */}
                <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-800 text-xs tracking-tight uppercase font-mono">Client Worksite Address</span>
                    </div>
                    {clientAddr1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientAddr1(""); setClientAddr2(""); setClientCity(""); setClientCounty(""); setClientState(""); setClientZip("");
                        }}
                        className="text-[10px] text-indigo-605 hover:text-rose-600 transition-colors font-semibold"
                      >
                        Reset Worksite
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Address Line 1 */}
                    <div className="relative">
                      <FloatingInput
                        id="new_employee_lca_client_address_1"
                        label="Address Line 1"
                        placeholder="e.g. 1 Oracle Way or 100 Pine St"
                        value={clientAddr1}
                        onChange={(e) => handleClientAddr1Change(e.target.value)}
                        onFocus={() => setShowClientSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => setShowClientSuggestions(false), 200);
                        }}
                      />
                      {/* Suggestion dropdown overlay */}
                      {showClientSuggestions && clientSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200/80 shadow-2xl rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {clientSuggestions.map((sug, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectClientSuggestion(sug)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-705 transition-colors flex items-start gap-2.5"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate">{sug.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Suite/Apt/Line 2 */}
                    <FloatingInput
                      id="new_employee_lca_client_address_2"
                      label="Suite / Apt / Line 2"
                      placeholder="e.g. Suite 400"
                      value={clientAddr2}
                      onChange={(e) => setClientAddr2(e.target.value)}
                    />

                    {/* City */}
                    <FloatingInput
                      id="new_employee_lca_client_city"
                      label="City *"
                      placeholder="e.g. Redwood City"
                      required={!!clientAddr1}
                      value={clientCity}
                      onChange={(e) => setClientCity(e.target.value)}
                    />

                    {/* County */}
                    <FloatingInput
                      id="new_employee_lca_client_county"
                      label="County"
                      placeholder="e.g. San Mateo"
                      value={clientCounty}
                      onChange={(e) => setClientCounty(e.target.value)}
                    />

                    {/* State */}
                    <FloatingSelect
                      id="new_employee_lca_client_state"
                      label="State *"
                      required={!!clientAddr1}
                      value={clientState}
                      onChange={(e) => setClientState(e.target.value)}
                      options={US_STATES}
                    />

                    {/* Zip */}
                    <div className="relative">
                      <FloatingInput
                        id="new_employee_lca_client_zip"
                        label="Zip Code *"
                        placeholder="e.g. 94065"
                        required={!!clientAddr1}
                        value={clientZip}
                        onChange={(e) => setClientZip(e.target.value)}
                      />
                      {clientZip.trim() && !validateZipCode(clientZip) && (
                        <p className="text-[9px] font-semibold text-amber-600 mt-1">Format: 5 digits (e.g. 94065) or 5+4 (e.g. 94065-1234)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 4: Residence Address divided fields */}
                <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-800 text-xs tracking-tight uppercase font-mono">Employee Residence Address</span>
                    </div>
                    {resAddr1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setResAddr1(""); setResAddr2(""); setResCity(""); setResCounty(""); setResState(""); setResZip("");
                        }}
                        className="text-[10px] text-indigo-605 hover:text-rose-600 transition-colors font-semibold"
                      >
                        Reset Residence
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Address Line 1 */}
                    <div className="relative">
                      <FloatingInput
                        id="new_employee_lca_residence_address"
                        label="Address Line 1"
                        placeholder="e.g. 450 Sutter St or 201 Folsom St"
                        value={resAddr1}
                        onChange={(e) => handleResAddr1Change(e.target.value)}
                        onFocus={() => setShowResSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => setShowResSuggestions(false), 200);
                        }}
                      />
                      {/* Residence suggestions dropdown overlay */}
                      {showResSuggestions && resSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200/80 shadow-2xl rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {resSuggestions.map((sug, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectResSuggestion(sug)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-705 transition-colors flex items-start gap-2.5"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate">{sug.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Apartment/Line 2 */}
                    <FloatingInput
                      id="new_employee_lca_residence_address_2"
                      label="Apartment / Line 2"
                      placeholder="e.g. Apt 12B"
                      value={resAddr2}
                      onChange={(e) => setResAddr2(e.target.value)}
                    />

                    {/* City */}
                    <FloatingInput
                      id="new_employee_lca_residence_city"
                      label="City *"
                      placeholder="e.g. San Francisco"
                      required={!!resAddr1}
                      value={resCity}
                      onChange={(e) => setResCity(e.target.value)}
                    />

                    {/* County */}
                    <FloatingInput
                      id="new_employee_lca_residence_county"
                      label="County"
                      placeholder="e.g. San Francisco County"
                      value={resCounty}
                      onChange={(e) => setResCounty(e.target.value)}
                    />

                    {/* State */}
                    <FloatingSelect
                      id="new_employee_lca_residence_state"
                      label="State *"
                      required={!!resAddr1}
                      value={resState}
                      onChange={(e) => setResState(e.target.value)}
                      options={US_STATES}
                    />

                    {/* Zip */}
                    <div className="relative">
                      <FloatingInput
                        id="new_employee_lca_residence_zip"
                        label="Zip Code *"
                        placeholder="e.g. 94108"
                        required={!!resAddr1}
                        value={resZip}
                        onChange={(e) => setResZip(e.target.value)}
                      />
                      {resZip.trim() && !validateZipCode(resZip) && (
                        <p className="text-[9px] font-semibold text-amber-600 mt-1">Format: 5 digits (e.g. 94108) or 5+4 (e.g. 94108-1234)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 5: Expense Ledger Setup */}
                <div className="bg-slate-50/80 border border-indigo-150/60 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-indigo-100/50">
                    <ArrowDownUp className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-indigo-950 text-xs tracking-tight uppercase font-mono">Initial Ledger Record (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingInput
                      id="new_employee_exp_amount"
                      label="Expense Amount ($)"
                      placeholder="e.g. 500.00"
                      value={initialExpAmount}
                      onChange={(e) => setInitialExpAmount(e.target.value)}
                    />

                    <FloatingSelect
                      id="new_employee_exp_type"
                      label="Flow Direction"
                      value={initialExpType}
                      onChange={(e) => setInitialExpType(e.target.value as "disbursed" | "returned")}
                      options={[
                        { code: "disbursed", name: "LGL Paid (-)" },
                        { code: "returned", name: "LGL Received (+)" }
                      ]}
                    />

                    <FloatingInput
                      id="new_employee_exp_date"
                      label="Event Date"
                      type="date"
                      value={initialExpDate}
                      onChange={(e) => setInitialExpDate(e.target.value)}
                    />

                    <FloatingInput
                      id="new_employee_exp_details"
                      label="Description / Notes"
                      placeholder="e.g. Relocation assistance"
                      value={initialExpDetails}
                      onChange={(e) => setInitialExpDetails(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Redesigned Sticky Bottom Actions */}
              <div id="add_employee_actions" className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] sticky bottom-0">
                <button
                  type="button"
                  id="cancel_add_employee_btn"
                  onClick={resetForm}
                  className="px-4 py-2.5 border border-slate-205 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-xl cursor-pointer transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm_add_employee_btn"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:shadow-indigo-500/10 text-xs font-semibold rounded-xl cursor-pointer transition-all duration-150"
                >
                  Create Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
