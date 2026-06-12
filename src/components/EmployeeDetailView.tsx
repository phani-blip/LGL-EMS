/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  DollarSign, 
  Pencil, 
  Check, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Printer
} from "lucide-react";
import { Employee, LCARecord, PayrollRecord, ExpenseTransaction } from "../types";
import { CompactAddress } from "./CompactAddress";
import { calculateEmployeeSummary, exportEmployeeDetailToCSV, exportEmployeeExpensesToCSV, downloadCSV, formatDateToMDY, exportEmployeeDetailToExcel, exportEmployeeExpensesToExcel, downloadExcel, printReport, verifyAddressCompliance } from "../utils/lcaCalcs";
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

interface EmployeeDetailViewProps {
  employee: Employee;
  year: number;
  onBackToDashboard: () => void;
  onUpdateEmployee: (updated: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onAddActivity?: (actionType: string, employeeName: string, details: string) => void;
  layoutPreference?: "split" | "wide" | "audit";
  calculationMode?: "ytd" | "full";
  onCalculationModeChange?: (mode: "ytd" | "full") => void;
}

export default function EmployeeDetailView({
  employee,
  year,
  onBackToDashboard,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddActivity,
  layoutPreference = "split",
  calculationMode = "ytd",
  onCalculationModeChange,
}: EmployeeDetailViewProps) {
  // Editing Employee Metadata states
  const [isEditingMeta, setIsEditingMeta] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(employee.fullName);
  const [editTitle, setEditTitle] = useState<string>(employee.title);
  const [editEmail, setEditEmail] = useState<string>(employee.email);
  const [isAuditExportOpen, setIsAuditExportOpen] = useState(false);
  const [isExpenseExportOpen, setIsExpenseExportOpen] = useState(false);

  // New LCA wage history states
  const [newWage, setNewWage] = useState<string>("");
  const [newWageDate, setNewWageDate] = useState<string>(`${year}-01-01`);
  const [newLcaNumber, setNewLcaNumber] = useState<string>("");
  
  // Divided New Client Address states
  const [newClientAddr1, setNewClientAddr1] = useState<string>("");
  const [newClientAddr2, setNewClientAddr2] = useState<string>("");
  const [newClientCity, setNewClientCity] = useState<string>("");
  const [newClientCounty, setNewClientCounty] = useState<string>("");
  const [newClientState, setNewClientState] = useState<string>("");
  const [newClientZip, setNewClientZip] = useState<string>("");
  const [newClientSuggestions, setNewClientSuggestions] = useState<any[]>([]);
  const [showNewClientSuggestions, setShowNewClientSuggestions] = useState<boolean>(false);

  // Divided New Residence Address states
  const [newResAddr1, setNewResAddr1] = useState<string>("");
  const [newResAddr2, setNewResAddr2] = useState<string>("");
  const [newResCity, setNewResCity] = useState<string>("");
  const [newResCounty, setNewResCounty] = useState<string>("");
  const [newResState, setNewResState] = useState<string>("");
  const [newResZip, setNewResZip] = useState<string>("");
  const [newResSuggestions, setNewResSuggestions] = useState<any[]>([]);
  const [showNewResSuggestions, setShowNewResSuggestions] = useState<boolean>(false);

  const [newTillDate, setNewTillDate] = useState<string>("");
  const [lcaError, setLcaError] = useState<string>("");
  const [isAddLcaFormExpanded, setIsAddLcaFormExpanded] = useState<boolean>(false);

  // Editing LCA records state
  const [editingLcaId, setEditingLcaId] = useState<string | null>(null);
  const [editLcaWage, setEditLcaWage] = useState<string>("");
  const [editLcaDate, setEditLcaDate] = useState<string>("");
  const [editLcaNumber, setEditLcaNumber] = useState<string>("");
  const [editingPayrollCell, setEditingPayrollCell] = useState<{ month: number; value: string } | null>(null);

  // Divided Edit Client Address states
  const [editClientAddr1, setEditClientAddr1] = useState<string>("");
  const [editClientAddr2, setEditClientAddr2] = useState<string>("");
  const [editClientCity, setEditClientCity] = useState<string>("");
  const [editClientCounty, setEditClientCounty] = useState<string>("");
  const [editClientState, setEditClientState] = useState<string>("");
  const [editClientZip, setEditClientZip] = useState<string>("");
  const [editClientSuggestions, setEditClientSuggestions] = useState<any[]>([]);
  const [showEditClientSuggestions, setShowEditClientSuggestions] = useState<boolean>(false);

  // Divided Edit Residence Address states
  const [editResAddr1, setEditResAddr1] = useState<string>("");
  const [editResAddr2, setEditResAddr2] = useState<string>("");
  const [editResCity, setEditResCity] = useState<string>("");
  const [editResCounty, setEditResCounty] = useState<string>("");
  const [editResState, setEditResState] = useState<string>("");
  const [editResZip, setEditResZip] = useState<string>("");
  const [editResSuggestions, setEditResSuggestions] = useState<any[]>([]);
  const [showEditResSuggestions, setShowEditResSuggestions] = useState<boolean>(false);

  const [editLcaTillDate, setEditLcaTillDate] = useState<string>( "");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editEndDate, setEditEndDate] = useState<string>("");
  const [newWorkMode, setNewWorkMode] = useState<string>("On-site");
  const [editWorkMode, setEditWorkMode] = useState<string>("On-site");

  const newClientTimeoutRef = useRef<any>(null);
  const newResTimeoutRef = useRef<any>(null);
  const editClientTimeoutRef = useRef<any>(null);
  const editResTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (newClientTimeoutRef.current) clearTimeout(newClientTimeoutRef.current);
      if (newResTimeoutRef.current) clearTimeout(newResTimeoutRef.current);
      if (editClientTimeoutRef.current) clearTimeout(editClientTimeoutRef.current);
      if (editResTimeoutRef.current) clearTimeout(editResTimeoutRef.current);
    };
  }, []);

  const handleNewClientAddr1Change = (val: string) => {
    setNewClientAddr1(val);
    if (newClientTimeoutRef.current) {
      clearTimeout(newClientTimeoutRef.current);
    }

    if (val.trim().length >= 3) {
      newClientTimeoutRef.current = setTimeout(async () => {
        const sugs = await getGoogleMapsAddressSuggestions(val);
        setNewClientSuggestions(sugs);
        setShowNewClientSuggestions(true);
      }, 300);
    } else {
      setNewClientSuggestions([]);
      setShowNewClientSuggestions(false);
    }
  };

  const handleSelectNewClientSuggestion = async (sug: any) => {
    if (newClientTimeoutRef.current) {
      clearTimeout(newClientTimeoutRef.current);
    }
    if (sug.placeId) {
      setNewClientAddr1(sug.address1 || sug.label);
      const details = await getPlaceDetails(sug.placeId);
      if (details.address1) setNewClientAddr1(details.address1);
      if (details.city) setNewClientCity(details.city);
      if (details.county) setNewClientCounty(details.county);
      if (details.state) setNewClientState(details.state);
      if (details.zip) setNewClientZip(details.zip);
    } else {
      setNewClientAddr1(sug.address1);
      setNewClientAddr2(sug.address2 || "");
      setNewClientCity(sug.city);
      setNewClientCounty(sug.county);
      setNewClientState(sug.state);
      setNewClientZip(sug.zip);
    }
    setNewClientSuggestions([]);
    setShowNewClientSuggestions(false);
  };

  const handleNewResAddr1Change = (val: string) => {
    setNewResAddr1(val);
    if (newResTimeoutRef.current) {
      clearTimeout(newResTimeoutRef.current);
    }

    if (val.trim().length >= 3) {
      newResTimeoutRef.current = setTimeout(async () => {
        const sugs = await getGoogleMapsAddressSuggestions(val);
        setNewResSuggestions(sugs);
        setShowNewResSuggestions(true);
      }, 300);
    } else {
      setNewResSuggestions([]);
      setShowNewResSuggestions(false);
    }
  };

  const handleSelectNewResSuggestion = async (sug: any) => {
    if (newResTimeoutRef.current) {
      clearTimeout(newResTimeoutRef.current);
    }
    if (sug.placeId) {
      setNewResAddr1(sug.address1 || sug.label);
      const details = await getPlaceDetails(sug.placeId);
      if (details.address1) setNewResAddr1(details.address1);
      if (details.city) setNewResCity(details.city);
      if (details.county) setNewResCounty(details.county);
      if (details.state) setNewResState(details.state);
      if (details.zip) setNewResZip(details.zip);
    } else {
      setNewResAddr1(sug.address1);
      setNewResAddr2(sug.address2 || "");
      setNewResCity(sug.city);
      setNewResCounty(sug.county);
      setNewResState(sug.state);
      setNewResZip(sug.zip);
    }
    setNewResSuggestions([]);
    setShowNewResSuggestions(false);
  };

  const handleEditClientAddr1Change = (val: string) => {
    setEditClientAddr1(val);
    if (editClientTimeoutRef.current) {
      clearTimeout(editClientTimeoutRef.current);
    }

    if (val.trim().length >= 3) {
      editClientTimeoutRef.current = setTimeout(async () => {
        const sugs = await getGoogleMapsAddressSuggestions(val);
        setEditClientSuggestions(sugs);
        setShowEditClientSuggestions(true);
      }, 300);
    } else {
      setEditClientSuggestions([]);
      setShowEditClientSuggestions(false);
    }
  };

  const handleSelectEditClientSuggestion = async (sug: any) => {
    if (editClientTimeoutRef.current) {
      clearTimeout(editClientTimeoutRef.current);
    }
    if (sug.placeId) {
      setEditClientAddr1(sug.address1 || sug.label);
      const details = await getPlaceDetails(sug.placeId);
      if (details.address1) setEditClientAddr1(details.address1);
      if (details.city) setEditClientCity(details.city);
      if (details.county) setEditClientCounty(details.county);
      if (details.state) setEditClientState(details.state);
      if (details.zip) setEditClientZip(details.zip);
    } else {
      setEditClientAddr1(sug.address1);
      setEditClientAddr2(sug.address2 || "");
      setEditClientCity(sug.city);
      setEditClientCounty(sug.county);
      setEditClientState(sug.state);
      setEditClientZip(sug.zip);
    }
    setEditClientSuggestions([]);
    setShowEditClientSuggestions(false);
  };

  const handleEditResAddr1Change = (val: string) => {
    setEditResAddr1(val);
    if (editResTimeoutRef.current) {
      clearTimeout(editResTimeoutRef.current);
    }

    if (val.trim().length >= 3) {
      editResTimeoutRef.current = setTimeout(async () => {
        const sugs = await getGoogleMapsAddressSuggestions(val);
        setEditResSuggestions(sugs);
        setShowEditResSuggestions(true);
      }, 300);
    } else {
      setEditResSuggestions([]);
      setShowEditResSuggestions(false);
    }
  };

  const handleSelectEditResSuggestion = async (sug: any) => {
    if (editResTimeoutRef.current) {
      clearTimeout(editResTimeoutRef.current);
    }
    if (sug.placeId) {
      setEditResAddr1(sug.address1 || sug.label);
      const details = await getPlaceDetails(sug.placeId);
      if (details.address1) setEditResAddr1(details.address1);
      if (details.city) setEditResCity(details.city);
      if (details.county) setEditResCounty(details.county);
      if (details.state) setEditResState(details.state);
      if (details.zip) setEditResZip(details.zip);
    } else {
      setEditResAddr1(sug.address1);
      setEditResAddr2(sug.address2 || "");
      setEditResCity(sug.city);
      setEditResCounty(sug.county);
      setEditResState(sug.state);
      setEditResZip(sug.zip);
    }
    setEditResSuggestions([]);
    setShowEditResSuggestions(false);
  };

  // Tab State
  const [activeTab, setActiveTab] = useState<"payroll" | "expenses">("payroll");

  // Expense tracker state
  const [expDate, setExpDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [expDetails, setExpDetails] = useState<string>("");
  const [expAmount, setExpAmount] = useState<string>("");
  const [expType, setExpType] = useState<"disbursed" | "returned">("disbursed");
  const [expCustomValues, setExpCustomValues] = useState<Record<string, string>>({});
  const [newColName, setNewColName] = useState<string>("");

  // Specific returned (LGL Received) fields
  const [expProject, setExpProject] = useState<string>("");
  const [expHrs, setExpHrs] = useState<string>("");
  const [expRate, setExpRate] = useState<string>("");
  const [expEmployeeTax, setExpEmployeeTax] = useState<string>("");
  const [expEmployerTax, setExpEmployerTax] = useState<string>("");
  const [expInsurance, setExpInsurance] = useState<string>("");
  const [useExpCalculations, setUseExpCalculations] = useState<boolean>(false);

  // Editing Expense transactions state
  const [selectedTxnForDetails, setSelectedTxnForDetails] = useState<ExpenseTransaction | null>(null);
  
  const [isEditingInModal, setIsEditingInModal] = useState<boolean>(false);
  const [modalTxnDate, setModalTxnDate] = useState<string>("");
  const [modalTxnDetails, setModalTxnDetails] = useState<string>("");
  const [modalTxnType, setModalTxnType] = useState<"disbursed" | "returned">("disbursed");
  const [modalTxnAmount, setModalTxnAmount] = useState<string>("");
  const [modalTxnCustom, setModalTxnCustom] = useState<Record<string, string>>({});
  const [modalUseCalculations, setModalUseCalculations] = useState<boolean>(false);
  
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [editTxnDate, setEditTxnDate] = useState<string>("");
  const [editTxnDetails, setEditTxnDetails] = useState<string>("");
  const [editTxnAmount, setEditTxnAmount] = useState<string>("");
  const [editTxnType, setEditTxnType] = useState<"disbursed" | "returned">("disbursed");
  const [editTxnCustom, setEditTxnCustom] = useState<Record<string, string>>({});

  // Convert date inputs
  const convertIsoToMDY = (isoDate: string): string => {
    if (!isoDate) return "";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return isoDate;
  };

  const convertMDYtoIso = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const m = parts[0].padStart(2, "0");
      const d = parts[1].padStart(2, "0");
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
    return dateStr;
  };


  // Memoized sum for expenses
  const { totalDisbursed, totalRepaid, balanceDue, transactions } = useMemo(() => {
    const txns = employee.expenseTransactions || [];
    let disbursed = 0;
    let repaid = 0;
    txns.forEach(t => {
      if (t.amount < 0) {
        disbursed += Math.abs(t.amount);
      } else {
        repaid += t.amount;
      }
    });
    return {
      totalDisbursed: disbursed,
      totalRepaid: repaid,
      balanceDue: repaid - disbursed,
      transactions: txns
    };
  }, [employee.expenseTransactions]);

  // Calculations for LGL Received specific fields
  const hrsNum = parseFloat(expHrs) || 0;
  const rateNum = parseFloat(expRate) || 0;
  const expTotalCalc = hrsNum * rateNum;
  const eTaxNum = parseFloat(expEmployeeTax) || 0;
  const erTaxNum = parseFloat(expEmployerTax) || 0;
  const insNum = parseFloat(expInsurance) || 0;
  const calculatedPaidBackAmount = expTotalCalc - (eTaxNum + erTaxNum + insNum);

  // Handle adding expense transaction
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    
    let amt = 0;
    if (expType === "returned" && useExpCalculations) {
      amt = calculatedPaidBackAmount;
    } else {
      amt = parseFloat(expAmount);
    }

    if (isNaN(amt) || amt < 0) {
      alert("Please ensure computed/entered amount is a valid number.");
      return;
    }

    const finalAmount = expType === "disbursed" ? -amt : amt;
    const formattedDate = convertIsoToMDY(expDate) || formatDateToMDY(new Date().toISOString());

    // Bundle new fields in customFields so they are preserved
    const extraCustom: Record<string, string> = { ...expCustomValues };
    if (expType === "returned" && useExpCalculations) {
      if (expProject) extraCustom["Project"] = expProject;
      if (expHrs) extraCustom["Hrs"] = expHrs;
      if (expRate) extraCustom["Rate"] = `$${parseFloat(expRate).toFixed(2)}`;
      extraCustom["Total"] = `$${expTotalCalc.toFixed(2)}`;
      if (expEmployeeTax) extraCustom["Employee Tax"] = `$${parseFloat(expEmployeeTax).toFixed(2)}`;
      if (expEmployerTax) extraCustom["Employer Tax"] = `$${parseFloat(expEmployerTax).toFixed(2)}`;
      if (expInsurance) extraCustom["Insurance"] = `$${parseFloat(expInsurance).toFixed(2)}`;
    }

    const newTxn: ExpenseTransaction = {
      id: `exp_${Date.now()}`,
      date: formattedDate,
      details: expDetails.trim() || (expType === "disbursed" ? "LGL Paid (Advance)" : "LGL Received (Recoupment)"),
      amount: finalAmount,
      customFields: extraCustom
    };

    const updatedTransactions = [...(employee.expenseTransactions || []), newTxn];
    const updated: Employee = {
      ...employee,
      expenseTransactions: updatedTransactions
    };

    onUpdateEmployee(updated);

    if (onAddActivity) {
      onAddActivity(
        "Expense Transaction Logged",
        employee.fullName,
        `Logged transaction: Date: ${formattedDate}, Details: "${expDetails.trim() || (expType === "disbursed" ? "LGL Paid (Advance)" : "LGL Received (Recoupment)")}", Amount: $${finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
    }

    // Reset fields
    setExpDetails("");
    setExpAmount("");
    setExpProject("");
    setExpHrs("");
    setExpRate("");
    setExpEmployeeTax("");
    setExpEmployerTax("");
    setExpInsurance("");
    setUseExpCalculations(false);

    // Clear custom field values
    const emptyCustom: Record<string, string> = {};
    (employee.expenseColumns || []).forEach(c => { emptyCustom[c] = ""; });
    setExpCustomValues(emptyCustom);
  };

  // Handle custom column addition
  const handleAddCustomColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const colName = newColName.trim();
    if (!colName) return;

    const currentColumns = employee.expenseColumns || [];
    if (currentColumns.includes(colName)) {
      alert(`The column "${colName}" already exists.`);
      return;
    }

    const updatedColumns = [...currentColumns, colName];
    const updated: Employee = {
      ...employee,
      expenseColumns: updatedColumns
    };

    onUpdateEmployee(updated);

    if (onAddActivity) {
      onAddActivity(
        "Ledger Custom Column Created",
        employee.fullName,
        `Created new custom column for details: "${colName}"`
      );
    }

    setNewColName("");
  };

  // Handle deleting individual transactions
  const handleDeleteExpense = (txnId: string) => {
    if (!window.confirm("Are you sure you want to delete this expense entry?")) return;
    const targetTxn = (employee.expenseTransactions || []).find(t => t.id === txnId);
    const updatedTxns = (employee.expenseTransactions || []).filter(t => t.id !== txnId);
    const updated: Employee = {
      ...employee,
      expenseTransactions: updatedTxns
    };
    onUpdateEmployee(updated);

    if (onAddActivity && targetTxn) {
      onAddActivity(
        "Expense Transaction Deleted",
        employee.fullName,
        `Deleted expense transaction: Date: ${targetTxn.date}, Details: "${targetTxn.details}", Amount: $${targetTxn.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
    }
  };

  // Handle saving edited expense transaction inline
  const handleSaveEditTxn = (txnId: string) => {
    const amt = parseFloat(editTxnAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid positive numerical amount.");
      return;
    }
    if (!editTxnDate) {
      alert("Effective date is required.");
      return;
    }

    const finalAmount = editTxnType === "disbursed" ? -amt : amt;
    const formattedDate = convertIsoToMDY(editTxnDate);

    const targetTxn = (employee.expenseTransactions || []).find(t => t.id === txnId);
    const oldDetailsStr = targetTxn
      ? `Date: ${targetTxn.date}, Details: "${targetTxn.details}", Amount: $${targetTxn.amount}`
      : "";

    const updatedTxns = (employee.expenseTransactions || []).map(t => {
      if (t.id === txnId) {
        return {
          ...t,
          date: formattedDate,
          details: editTxnDetails.trim(),
          amount: finalAmount,
          customFields: { ...editTxnCustom }
        };
      }
      return t;
    });

    const updated: Employee = {
      ...employee,
      expenseTransactions: updatedTxns
    };

    onUpdateEmployee(updated);
    setEditingTxnId(null);

    if (onAddActivity) {
      onAddActivity(
        "Expense Transaction Edited",
        employee.fullName,
        `Updated transaction [ID: ${txnId}] from [${oldDetailsStr}] to [Date: ${formattedDate}, Details: "${editTxnDetails.trim()}", Amount: $${finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}]`
      );
    }
  };

  // Modal deep edit calculations
  const modalHrsNum = parseFloat(modalTxnCustom["Hrs"] || "") || 0;
  const modalRateStr = (modalTxnCustom["Rate"] || "").replace(/[^0-9.]/g, "");
  const modalRateNum = parseFloat(modalRateStr) || 0;
  const modalTotalCalc = modalHrsNum * modalRateNum;
  const modalETaxNum = parseFloat((modalTxnCustom["Employee Tax"] || "").replace(/[^0-9.]/g, "")) || 0;
  const modalErTaxNum = parseFloat((modalTxnCustom["Employer Tax"] || "").replace(/[^0-9.]/g, "")) || 0;
  const modalInsNum = parseFloat((modalTxnCustom["Insurance"] || "").replace(/[^0-9.]/g, "")) || 0;
  const modalCalculatedPaidBackAmount = modalTotalCalc - (modalETaxNum + modalErTaxNum + modalInsNum);

  const startModalEditing = () => {
    if (!selectedTxnForDetails) return;
    setModalTxnDate(convertMDYtoIso(selectedTxnForDetails.date));
    setModalTxnDetails(selectedTxnForDetails.details);
    setModalTxnType(selectedTxnForDetails.amount < 0 ? "disbursed" : "returned");
    setModalTxnAmount(String(Math.abs(selectedTxnForDetails.amount)));
    
    const custom = selectedTxnForDetails.customFields || {};
    setModalTxnCustom({ ...custom });
    
    const hasCalcs = ["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].some(k => k in custom);
    setModalUseCalculations(hasCalcs);
    setIsEditingInModal(true);
  };

  const handleSaveModalEdit = () => {
    if (!selectedTxnForDetails) return;
    
    const amt = modalUseCalculations 
      ? modalCalculatedPaidBackAmount 
      : parseFloat(modalTxnAmount);

    if (isNaN(amt) || amt < 0) {
      alert("Please ensure computed/entered amount is a valid positive number.");
      return;
    }

    const finalAmount = modalTxnType === "disbursed" ? -amt : amt;
    const formattedDate = convertIsoToMDY(modalTxnDate) || selectedTxnForDetails.date;

    const updatedCustom = { ...modalTxnCustom };
    if (modalUseCalculations) {
      updatedCustom["Total"] = `$${modalTotalCalc.toFixed(2)}`;
      
      const formatAsCurrency = (val: string) => {
        if (!val) return "$0.00";
        const clean = val.replace(/[^0-9.]/g, "");
        const num = parseFloat(clean);
        return isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`;
      };

      updatedCustom["Hrs"] = String(modalHrsNum);
      updatedCustom["Rate"] = formatAsCurrency(modalTxnCustom["Rate"] || "0");
      updatedCustom["Employee Tax"] = formatAsCurrency(modalTxnCustom["Employee Tax"] || "0");
      updatedCustom["Employer Tax"] = formatAsCurrency(modalTxnCustom["Employer Tax"] || "0");
      updatedCustom["Insurance"] = formatAsCurrency(modalTxnCustom["Insurance"] || "0");
    } else {
      ["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].forEach(k => delete updatedCustom[k]);
    }

    const updatedTxns = (employee.expenseTransactions || []).map(t => {
      if (t.id === selectedTxnForDetails.id) {
        return {
          ...t,
          date: formattedDate,
          details: modalTxnDetails.trim(),
          amount: finalAmount,
          customFields: updatedCustom
        };
      }
      return t;
    });

    const updated: Employee = {
      ...employee,
      expenseTransactions: updatedTxns
    };

    onUpdateEmployee(updated);
    
    if (onAddActivity) {
      onAddActivity(
        "Expense Transaction Edited",
        employee.fullName,
        `Edited transaction details in modal [ID: ${selectedTxnForDetails.id}] Details: "${modalTxnDetails.trim()}", Net Amount: $${finalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
    }

    setIsEditingInModal(false);
    setSelectedTxnForDetails(null);
  };

  // Recalculate summary metrics for this employee
  const summary = useMemo(() => {
    return calculateEmployeeSummary(employee, year, calculationMode);
  }, [employee, year, calculationMode]);

  // Handle Metadata updates
  const handleSaveMetadata = () => {
    if (!editName.trim()) return;
    
    const updated: Employee = {
      ...employee,
      fullName: editName.trim(),
      title: editTitle.trim() || "Team Member",
      email: editEmail.trim(),
      startDate: editStartDate || undefined,
      endDate: editEndDate || undefined,
    };
    
    onUpdateEmployee(updated);
    setIsEditingMeta(false);

    if (onAddActivity) {
      onAddActivity(
        "Metadata Updated",
        employee.fullName,
        `Modified details: Name: ${editName}, Title: ${editTitle}, Email: ${editEmail}, Project: ${editStartDate || "N/A"} to ${editEndDate || "Ongoing"}`
      );
    }
  };

  // Handle adding LCA annual wage period
  const handleAddLCARecord = (e: React.FormEvent) => {
    e.preventDefault();
    setLcaError("");

    const wageNum = parseFloat(newWage.replace(/[^0-9.]/g, ""));
    if (isNaN(wageNum) || wageNum <= 0) {
      setLcaError("Please enter a valid positive numerical annual salary.");
      return;
    }

    if (!newWageDate) {
      setLcaError("Effective date is required.");
      return;
    }

    const testDate = new Date(newWageDate);
    if (isNaN(testDate.getTime())) {
      setLcaError("Please select a valid date.");
      return;
    }

    // Validate LCA Number
    if (newLcaNumber.trim() && !validateLCANumber(newLcaNumber.trim())) {
      setLcaError("LCA Number is invalid. Format must be I-200-XXXXX-XXXXXX (starts with I-200- followed by 5 digits and 6 digits)");
      return;
    }

    // Validate Client ZIP Code
    if (newClientZip.trim() && !validateZipCode(newClientZip)) {
      setLcaError("Client Zip Code is invalid. Must be standard 5-digit format (e.g. 94065) or 5+4 format (e.g. 94065-1234)");
      return;
    }

    // Validate Residence ZIP Code
    if (newResZip.trim() && !validateZipCode(newResZip)) {
      setLcaError("Residence Zip Code is invalid. Must be standard 5-digit format (e.g. 94108) or 5+4 format (e.g. 94108-1234)");
      return;
    }

    const compiledClient = newClientAddr1.trim()
      ? compileFullAddress(newClientAddr1, newClientAddr2, newClientCity, newClientCounty, newClientState, newClientZip)
      : undefined;

    const compiledResidence = newResAddr1.trim()
      ? compileFullAddress(newResAddr1, newResAddr2, newResCity, newResCounty, newResState, newResZip)
      : undefined;

    // Append new LCA record & sort chronologically or keep
    const updatedRecords = [...employee.lcaRecords];
    
    const recordPayload = {
      annualWage: wageNum,
      lcaNumber: newLcaNumber.trim() || undefined,
      clientAddress: compiledClient,
      residenceAddress: compiledResidence,
      tillDate: newTillDate.trim() || undefined,
      workMode: newWorkMode as any,

      clientAddress1: newClientAddr1.trim() || undefined,
      clientAddress2: newClientAddr2.trim() || undefined,
      clientCity: newClientCity.trim() || undefined,
      clientCounty: newClientCounty.trim() || undefined,
      clientState: newClientState.trim() || undefined,
      clientZip: newClientZip.trim() || undefined,

      residenceAddress1: newResAddr1.trim() || undefined,
      residenceAddress2: newResAddr2.trim() || undefined,
      residenceCity: newResCity.trim() || undefined,
      residenceCounty: newResCounty.trim() || undefined,
      residenceState: newResState.trim() || undefined,
      residenceZip: newResZip.trim() || undefined,
    };

    // Check if a rate at this exact date already exists
    const duplicateIdx = updatedRecords.findIndex(r => r.effectiveFrom === newWageDate);
    if (duplicateIdx > -1) {
      // Overwrite wage and details
      updatedRecords[duplicateIdx] = {
        ...updatedRecords[duplicateIdx],
        ...recordPayload
      };
    } else {
      updatedRecords.push({
        id: `lca_${Date.now()}`,
        effectiveFrom: newWageDate,
        ...recordPayload
      });
    }

    const updated: Employee = {
      ...employee,
      lcaRecords: updatedRecords,
    };

    onUpdateEmployee(updated);
    
    // Reset all new LCA states
    setNewWage("");
    setNewLcaNumber("");
    setNewWorkMode("On-site");
    setNewClientAddr1("");
    setNewClientAddr2("");
    setNewClientCity("");
    setNewClientCounty("");
    setNewClientState("");
    setNewClientZip("");
    setNewClientSuggestions([]);
    setShowNewClientSuggestions(false);

    setNewResAddr1("");
    setNewResAddr2("");
    setNewResCity("");
    setNewResCounty("");
    setNewResState("");
    setNewResZip("");
    setNewResSuggestions([]);
    setShowNewResSuggestions(false);

    setNewTillDate("");
    setLcaError("");
    setIsAddLcaFormExpanded(false);

    if (onAddActivity) {
      onAddActivity(
        "LCA Wage Rate Added",
        employee.fullName,
        `Registered mandated LCA wage floor of $${wageNum.toLocaleString("en-US", { minimumFractionDigits: 2 })} / yr, Effective from: ${newWageDate}`
      );
    }
  };

  // Delete LCA record
  const handleDeleteLCARecord = (id: string) => {
    if (employee.lcaRecords.length <= 1) {
      alert("At least one LCA rate record is required to calculate compliance boundaries.");
      return;
    }
    const targetLca = employee.lcaRecords.find(r => r.id === id);
    const updated: Employee = {
      ...employee,
      lcaRecords: employee.lcaRecords.filter(r => r.id !== id),
    };
    onUpdateEmployee(updated);

    if (onAddActivity && targetLca) {
      onAddActivity(
        "LCA Wage Rate Deleted",
        employee.fullName,
        `Deleted mandated LCA wage floor of $${targetLca.annualWage.toLocaleString("en-US", { minimumFractionDigits: 2 })} / yr, Effective from: ${targetLca.effectiveFrom}`
      );
    }
  };

  // Save edited LCA Record inline
  const handleSaveEditLca = (id: string) => {
    const wageNum = parseFloat(editLcaWage.replace(/[^0-9.]/g, ""));
    if (isNaN(wageNum) || wageNum <= 0) {
      alert("Please enter a valid positive numerical annual salary.");
      return;
    }
    if (!editLcaDate) {
      alert("Effective date is required.");
      return;
    }

    // Validate LCA Number
    if (editLcaNumber.trim() && !validateLCANumber(editLcaNumber.trim())) {
      alert("LCA Number is invalid. It must follow standard format I-200-XXXXX-XXXXXX (starts with I-200- followed by 5 digits and 6 digits)");
      return;
    }

    // Validate Client ZIP Code
    if (editClientZip.trim() && !validateZipCode(editClientZip)) {
      alert("Client Zip Code is invalid. It must follow standard US 5-digit format (e.g. 94065) or 5+4 format (e.g. 94065-1234)");
      return;
    }

    // Validate Residence ZIP Code
    if (editResZip.trim() && !validateZipCode(editResZip)) {
      alert("Residence Zip Code is invalid. It must follow standard US 5-digit format (e.g. 94108) or 5+4 format (e.g. 94108-1234)");
      return;
    }

    const compiledClient = editClientAddr1.trim()
      ? compileFullAddress(editClientAddr1, editClientAddr2, editClientCity, editClientCounty, editClientState, editClientZip)
      : undefined;

    const compiledResidence = editResAddr1.trim()
      ? compileFullAddress(editResAddr1, editResAddr2, editResCity, editResCounty, editResState, editResZip)
      : undefined;

    const targetLca = employee.lcaRecords.find(r => r.id === id);
    const oldDetailsStr = targetLca
      ? `$${targetLca.annualWage.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${targetLca.effectiveFrom})`
      : "";

    const updatedRecords = employee.lcaRecords.map(r => {
      if (r.id === id) {
        return {
          ...r,
          annualWage: wageNum,
          effectiveFrom: editLcaDate,
          lcaNumber: editLcaNumber.trim() || undefined,
          clientAddress: compiledClient,
          residenceAddress: compiledResidence,
          tillDate: editLcaTillDate.trim() || undefined,
          workMode: editWorkMode as any,

          clientAddress1: editClientAddr1.trim() || undefined,
          clientAddress2: editClientAddr2.trim() || undefined,
          clientCity: editClientCity.trim() || undefined,
          clientCounty: editClientCounty.trim() || undefined,
          clientState: editClientState.trim() || undefined,
          clientZip: editClientZip.trim() || undefined,

          residenceAddress1: editResAddr1.trim() || undefined,
          residenceAddress2: editResAddr2.trim() || undefined,
          residenceCity: editResCity.trim() || undefined,
          residenceCounty: editResCounty.trim() || undefined,
          residenceState: editResState.trim() || undefined,
          residenceZip: editResZip.trim() || undefined,
        };
      }
      return r;
    });

    const updated: Employee = {
      ...employee,
      lcaRecords: updatedRecords
    };

    onUpdateEmployee(updated);
    setEditingLcaId(null);

    if (onAddActivity) {
      onAddActivity(
        "LCA Wage Rate Edited",
        employee.fullName,
        `Updated mandated LCA wage from [${oldDetailsStr}] to [$${wageNum.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${editLcaDate})]`
      );
    }
  };

  // Handle inline numeric payroll logging update
  const handlePayrollCellUpdate = (month: number, valueStr: string) => {
    const rawVal = valueStr.replace(/[^0-9.]/g, "");
    const numericAmount = rawVal === "" ? 0 : parseFloat(rawVal);
    if (isNaN(numericAmount)) return;

    const updatedPayroll = [...employee.payrollRecords];
    const recordIndex = updatedPayroll.findIndex(p => p.year === year && p.month === month);
    const oldRecordVal = recordIndex > -1 ? updatedPayroll[recordIndex].amount : 0;

    if (recordIndex > -1) {
      updatedPayroll[recordIndex].amount = Number(numericAmount.toFixed(2));
    } else {
      updatedPayroll.push({
        id: `pay_${Date.now()}_m${month}`,
        year,
        month,
        amount: Number(numericAmount.toFixed(2)),
      });
    }

    const updated: Employee = {
      ...employee,
      payrollRecords: updatedPayroll,
    };
    onUpdateEmployee(updated);

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    if (onAddActivity) {
      onAddActivity(
        "Monthly Payroll Wages Logged",
        employee.fullName,
        `Updated payroll cell for ${monthNames[month - 1]} ${year} from $${oldRecordVal.toLocaleString("en-US", { minimumFractionDigits: 2 })} to $${numericAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
    }
  };

  const handlePayrollLOAUpdate = (month: number, loaDays: number) => {
    const updatedPayroll = [...employee.payrollRecords];
    const recordIndex = updatedPayroll.findIndex(p => p.year === year && p.month === month);
    const oldLOA = recordIndex > -1 ? (updatedPayroll[recordIndex].loaDays || 0) : 0;

    if (recordIndex > -1) {
      updatedPayroll[recordIndex].loaDays = loaDays;
    } else {
      updatedPayroll.push({
        id: `pay_${Date.now()}_m${month}`,
        year,
        month,
        amount: 0,
        loaDays,
      });
    }

    const updated: Employee = {
      ...employee,
      payrollRecords: updatedPayroll,
    };
    onUpdateEmployee(updated);

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    if (onAddActivity) {
      onAddActivity(
        "LOA Status Changed",
        employee.fullName,
        `Updated LOA days for ${monthNames[month - 1]} ${year} from ${oldLOA} days to ${loaDays} days`
      );
    }
  };

  // Handle deleting employee profile
  const handleDeleteProfile = () => {
    const confirm = window.confirm(`Are you certain you want to delete ${employee.fullName}'s profile and associated data? This operation is irreversible.`);
    if (confirm) {
      onDeleteEmployee(employee.id);
    }
  };

  // Export format handlers
  const handleExportAuditFormat = (format: "csv" | "excel" | "pdf") => {
    setIsAuditExportOpen(false);
    if (format === "csv") {
      const csvContent = exportEmployeeDetailToCSV(employee, calculationMode);
      downloadCSV(csvContent, `lca_payroll_compliance_report_${employee.employeeId}_all_years.csv`);
    } else if (format === "excel") {
      const excelContent = exportEmployeeDetailToExcel(employee, calculationMode);
      downloadExcel(excelContent, `lca_payroll_compliance_report_${employee.employeeId}_all_years.xls`);
    } else if (format === "pdf") {
      const excelContent = exportEmployeeDetailToExcel(employee, calculationMode);
      const bodyContent = excelContent.match(/<body>([\s\S]*?)<\/body>/)?.[1] || excelContent;
      printReport(bodyContent, `${employee.fullName} Compliance Report (All Years)`);
    }
  };

  const handleExportExpensesFormat = (format: "csv" | "excel" | "pdf") => {
    setIsExpenseExportOpen(false);
    if (format === "csv") {
      const csvContent = exportEmployeeExpensesToCSV(employee);
      downloadCSV(csvContent, `employee_expenses_ledger_${employee.employeeId}_all_years.csv`);
    } else if (format === "excel") {
      const excelContent = exportEmployeeExpensesToExcel(employee);
      downloadExcel(excelContent, `employee_expenses_ledger_${employee.employeeId}_all_years.xls`);
    } else if (format === "pdf") {
      const excelContent = exportEmployeeExpensesToExcel(employee);
      const bodyContent = excelContent.match(/<body>([\s\S]*?)<\/body>/)?.[1] || excelContent;
      printReport(bodyContent, `${employee.fullName} Expense Ledger (All Years)`);
    }
  };

  return (
    <div id="employee_detail_scroll" className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 font-sans text-slate-700">
      
      {/* Header controls breadcrumbs */}
      <div id="detail_header_navigation" className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <button
            id="back_to_dash_btn"
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-550 hover:text-slate-800 transition-colors uppercase tracking-wider font-mono cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back to Dashboard</span>
          </button>

          {onCalculationModeChange && (
            <div id="detail_calc_mode_toggle" className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 ml-2">
              <button
                type="button"
                id="detail_calc_mode_ytd"
                onClick={() => onCalculationModeChange("ytd")}
                className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer leading-tight uppercase ${
                  calculationMode === "ytd"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-650"
                }`}
                title="Limit calculation to actuals till date"
              >
                Till Date
              </button>
              <button
                type="button"
                id="detail_calc_mode_full"
                onClick={() => onCalculationModeChange("full")}
                className={`px-3 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer leading-tight uppercase ${
                  calculationMode === "full"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-650"
                }`}
                title="Calculate full-year projection targets"
              >
                Full Year
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Individual Audit Report Dropdown */}
          <div className="relative">
            <button
              id="export_individual_btn"
              onClick={() => setIsAuditExportOpen(!isAuditExportOpen)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Individual Audit Report</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {isAuditExportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsAuditExportOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden text-slate-700 font-sans">
                  <button
                    onClick={() => handleExportAuditFormat("csv")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Export to CSV (.csv)</span>
                  </button>
                  <button
                    onClick={() => handleExportAuditFormat("excel")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">Export to Excel (.xls)</span>
                  </button>
                  <button
                    onClick={() => handleExportAuditFormat("pdf")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-800">Print / Save as PDF (.pdf)</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Individual Expense Report Dropdown */}
          <div className="relative">
            <button
              id="export_individual_expense_btn"
              onClick={() => setIsExpenseExportOpen(!isExpenseExportOpen)}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Individual Expense Report</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {isExpenseExportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsExpenseExportOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden text-slate-700 font-sans">
                  <button
                    onClick={() => handleExportExpensesFormat("csv")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Export to CSV (.csv)</span>
                  </button>
                  <button
                    onClick={() => handleExportExpensesFormat("excel")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">Export to Excel (.xls)</span>
                  </button>
                  <button
                    onClick={() => handleExportExpensesFormat("pdf")}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-800">Print / Save as PDF (.pdf)</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            id="delete_profile_btn"
            onClick={handleDeleteProfile}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-150/50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Profile</span>
          </button>
        </div>
      </div>

      {/* Employee Profile Metadata display / editing card */}
      <div id="employee_profile_banner" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        {!isEditingMeta ? (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{employee.fullName}</h2>
                <span className="px-2 py-0.5 bg-slate-200/80 text-slate-500 rounded-md font-mono font-bold text-[10px]">
                  {employee.employeeId}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 mt-2 text-[10.5px] text-slate-500 font-mono">
                <div><span className="font-bold text-slate-400">Title:</span> {employee.title || "Team Member"}</div>
                <div><span className="font-bold text-slate-400">Dept:</span> {employee.department || "Operations"}</div>
                <div className="col-span-2 truncate"><span className="font-bold text-slate-400">Email:</span> {employee.email}</div>
                <div><span className="font-bold text-slate-400">Start Date:</span> {employee.startDate ? formatDateToMDY(employee.startDate) : "N/A"}</div>
                <div><span className="font-bold text-slate-400">End Date:</span> {employee.endDate ? formatDateToMDY(employee.endDate) : "Ongoing"}</div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                {/* LCA Difference Pill */}
                {summary.annualDifference >= 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-lg text-[10px] font-bold font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LCA Variance: +${summary.annualDifference.toLocaleString("en-US", { minimumFractionDigits: 2 })} (Compliant)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-150 rounded-lg text-[10px] font-bold font-sans animate-bounce">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    LCA Variance: -${Math.abs(summary.annualDifference).toLocaleString("en-US", { minimumFractionDigits: 2 })} (Underpaid)
                  </span>
                )}

                {/* Expense Balance Due Pill */}
                {balanceDue < 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Expense Balance: -${Math.abs(balanceDue).toLocaleString("en-US", { minimumFractionDigits: 2 })} Due
                  </span>
                ) : balanceDue === 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-650 border border-slate-200/80 rounded-lg text-[10px] font-bold font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Expense Balance: $0.00 (Settled)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-150 rounded-lg text-[10px] font-bold font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    Expense Balance: +${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} (Credit)
                  </span>
                )}
              </div>
            </div>

            <button
              id="modify_metadata_btn"
              onClick={() => {
                setEditName(employee.fullName);
                setEditTitle(employee.title || "");
                setEditEmail(employee.email || "");
                setEditStartDate(employee.startDate || "");
                setEditEndDate(employee.endDate || "");
                setIsEditingMeta(true);
              }}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 hover:text-slate-900 cursor-pointer transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Name</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Modify Employee Profile</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase font-mono">Full Name</label>
                <input
                  id="edit_emp_name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-550"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase font-mono">Job Title</label>
                <input
                  id="edit_emp_title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-550"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase font-mono">Work Email</label>
                <input
                  id="edit_emp_email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-550"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase font-mono">Start Date</label>
                  <input
                    id="edit_emp_start_date"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-550"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase font-mono">End Date</label>
                  <input
                    id="edit_emp_end_date"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-indigo-550"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                id="discard_meta_btn"
                onClick={() => setIsEditingMeta(false)}
                className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                Discard
              </button>
              <button
                id="save_meta_btn"
                disabled={!editName.trim()}
                onClick={handleSaveMetadata}
                className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              >
                Save Updates
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Container wrapper for Module Tabs & Content */}
      <div id="payroll_lca_grids" className="space-y-6">

        {layoutPreference !== "audit" && (
          /* Section Tabs Switcher */
          <div id="module_tabs_bar" className="flex border border-slate-200/80 bg-white rounded-xl p-1 shadow-sm gap-2">
            <button
              type="button"
              id="tab_trigger_payroll"
              onClick={() => {
                setActiveTab("payroll");
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "payroll"
                  ? "bg-slate-900 text-white shadow-sm border-b-2 border-b-indigo-500 font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>LCA & Payroll Audit</span>
            </button>
            <button
              type="button"
              id="tab_trigger_expenses"
              onClick={() => {
                setActiveTab("expenses");
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "expenses"
                  ? "bg-slate-900 text-white shadow-sm border-b-2 border-b-indigo-400 font-extrabold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
              <span>Expense Ledger Module</span>
            </button>
          </div>
        )}

        {(activeTab === "payroll" || layoutPreference === "audit") && (
          <div className="space-y-4 animate-fadeIn">
            {/* Split LCA Layout: left side is LCA wage history list/form, right side is monthly worksheet table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: LCA Setup & intervals logic (Span 1) */}
              <div className="lg:col-span-1 space-y-4">
          <div className="border border-slate-200 rounded-xl p-4 shadow-sm bg-white select-none">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">LCA Wages History</h3>
            
            {/* List existing transitions rates */}
            <div id="lca_records_history_list" className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {employee.lcaRecords.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center italic text-xs text-slate-400">
                  No registered LCA wages. Set one below.
                </div>
              ) : (
                [...employee.lcaRecords]
                  .sort((a,b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime())
                  .map(rec => (
                    editingLcaId === rec.id ? (
                      <div key={rec.id} className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2 text-xs animate-fade-in">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-indigo-900 uppercase font-mono">Annual Salary *</label>
                            <input
                              type="text"
                              value={editLcaWage}
                              onChange={(e) => setEditLcaWage(e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-indigo-900 uppercase font-mono">LCA Number</label>
                            <input
                              type="text"
                              placeholder="e.g. I-200-xxxxx"
                              value={editLcaNumber}
                              onChange={(e) => setEditLcaNumber(e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-indigo-900 uppercase font-mono">Work Mode</label>
                            <select
                              value={editWorkMode}
                              onChange={(e) => setEditWorkMode(e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer"
                            >
                              <option value="On-site">On-site</option>
                              <option value="Hybrid">Hybrid</option>
                              <option value="Remote">Remote</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-indigo-900 uppercase font-mono">Effective From *</label>
                            <input
                              type="date"
                              value={editLcaDate}
                              onChange={(e) => setEditLcaDate(e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs font-mono text-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-indigo-900 uppercase font-mono">Till Date</label>
                            <input
                              type="date"
                              value={editLcaTillDate}
                              onChange={(e) => setEditLcaTillDate(e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs font-mono text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Client Address Segment */}
                        <div className="border border-indigo-150 rounded-lg p-2 bg-white/50 space-y-1.5">
                          <span className="text-[9px] font-bold text-indigo-900 block uppercase font-mono">
                            Client Address
                          </span>
                          
                          <div className="relative space-y-1">
                            <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">Address Line 1</label>
                            <input
                              id="edit_client_addr1"
                              type="text"
                              placeholder="Street"
                              value={editClientAddr1}
                              onChange={(e) => handleEditClientAddr1Change(e.target.value)}
                              onFocus={() => { if (editClientSuggestions.length > 0) setShowEditClientSuggestions(true); }}
                              onBlur={() => setTimeout(() => setShowEditClientSuggestions(false), 200)}
                              className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800 font-sans"
                            />
                            {showEditClientSuggestions && editClientSuggestions.length > 0 && (
                              <div className="absolute z-10 w-full bg-white border border-slate-200 rounded shadow-lg max-h-32 overflow-y-auto mt-0.5 pointer-events-auto">
                                {editClientSuggestions.map((sug, i) => (
                                  <div
                                    key={i}
                                    onMouseDown={() => handleSelectEditClientSuggestion(sug)}
                                    className="px-2 py-1 text-[10px] hover:bg-indigo-50 cursor-pointer text-slate-700 border-b border-slate-100 last:border-0"
                                  >
                                    {sug.label || `${sug.address1}, ${sug.city}, ${sug.state} ${sug.zip}`}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">Suite/Apt</label>
                              <input
                                id="edit_client_addr2"
                                type="text"
                                placeholder="Suite 400"
                                value={editClientAddr2}
                                onChange={(e) => setEditClientAddr2(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">City</label>
                              <input
                                id="edit_client_city"
                                type="text"
                                placeholder="City"
                                value={editClientCity}
                                onChange={(e) => setEditClientCity(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">County</label>
                              <input
                                id="edit_client_county"
                                type="text"
                                placeholder="County"
                                value={editClientCounty}
                                onChange={(e) => setEditClientCounty(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">State</label>
                              <select
                                id="edit_client_state"
                                value={editClientState}
                                onChange={(e) => setEditClientState(e.target.value)}
                                className="w-full px-1 py-1 bg-white border border-indigo-250 rounded text-xs bg-white text-slate-800"
                              >
                                <option value="">State</option>
                                {US_STATES.map((st) => (
                                  <option key={st.code} value={st.code}>{st.code}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">Zip</label>
                              <input
                                id="edit_client_zip"
                                type="text"
                                placeholder="ZIP"
                                value={editClientZip}
                                onChange={(e) => setEditClientZip(e.target.value)}
                                className={`w-full px-2 py-1 bg-white border rounded text-xs text-slate-800 ${editClientZip.trim() && !validateZipCode(editClientZip) ? "border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400" : "border-indigo-250"}`}
                              />
                              {editClientZip.trim() && !validateZipCode(editClientZip) && (
                                <span className="text-[7px] font-semibold text-rose-600 block mt-0.5 leading-none">Invalid format</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Residence Address Segment */}
                        <div className="border border-indigo-150 rounded-lg p-2 bg-white/50 space-y-1.5">
                          <span className="text-[9px] font-bold text-indigo-900 block uppercase font-mono">
                            Residence Address
                          </span>
                          
                          <div className="relative space-y-1">
                            <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">Address Line 1</label>
                            <input
                              id="edit_res_addr1"
                              type="text"
                              placeholder="Street"
                              value={editResAddr1}
                              onChange={(e) => handleEditResAddr1Change(e.target.value)}
                              onFocus={() => { if (editResSuggestions.length > 0) setShowEditResSuggestions(true); }}
                              onBlur={() => setTimeout(() => setShowEditResSuggestions(false), 200)}
                              className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800 font-sans"
                            />
                            {showEditResSuggestions && editResSuggestions.length > 0 && (
                              <div className="absolute z-10 w-full bg-white border border-slate-200 rounded shadow-lg max-h-32 overflow-y-auto mt-0.5 pointer-events-auto">
                                {editResSuggestions.map((sug, i) => (
                                  <div
                                    key={i}
                                    onMouseDown={() => handleSelectEditResSuggestion(sug)}
                                    className="px-2 py-1 text-[10px] hover:bg-indigo-50 cursor-pointer text-slate-700 border-b border-slate-100 last:border-0"
                                  >
                                    {sug.label || `${sug.address1}, ${sug.city}, ${sug.state} ${sug.zip}`}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">Suite/Apt</label>
                              <input
                                id="edit_res_addr2"
                                type="text"
                                placeholder="Apt 3b"
                                value={editResAddr2}
                                onChange={(e) => setEditResAddr2(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">City</label>
                              <input
                                id="edit_res_city"
                                type="text"
                                placeholder="City"
                                value={editResCity}
                                onChange={(e) => setEditResCity(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">County</label>
                              <input
                                id="edit_res_county"
                                type="text"
                                placeholder="County"
                                value={editResCounty}
                                onChange={(e) => setEditResCounty(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-indigo-250 rounded text-xs text-slate-800"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">State</label>
                              <select
                                id="edit_res_state"
                                value={editResState}
                                onChange={(e) => setEditResState(e.target.value)}
                                className="w-full px-1 py-1 bg-white border border-indigo-250 rounded text-xs bg-white text-slate-800"
                              >
                                <option value="">State</option>
                                {US_STATES.map((st) => (
                                  <option key={st.code} value={st.code}>{st.code}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-bold text-indigo-800 uppercase font-mono">Zip</label>
                              <input
                                id="edit_res_zip"
                                type="text"
                                placeholder="ZIP"
                                value={editResZip}
                                onChange={(e) => setEditResZip(e.target.value)}
                                className={`w-full px-2 py-1 bg-white border rounded text-xs text-slate-800 ${editResZip.trim() && !validateZipCode(editResZip) ? "border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400" : "border-indigo-250"}`}
                              />
                              {editResZip.trim() && !validateZipCode(editResZip) && (
                                <span className="text-[7px] font-semibold text-rose-600 block mt-0.5 leading-none">Invalid format</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingLcaId(null)}
                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded text-[10px] font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditLca(rec.id)}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={rec.id}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono text-xs">
                              ${rec.annualWage.toLocaleString("en-US", { minimumFractionDigits: 2 })} / yr
                            </span>
                            {rec.workMode && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded uppercase">
                                {rec.workMode}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Effective: {formatDateToMDY(rec.effectiveFrom)}
                            {rec.tillDate && ` to ${formatDateToMDY(rec.tillDate)}`}
                          </div>
                          {rec.lcaNumber && (
                            <div className="text-[10px] text-indigo-600 font-mono mt-0.5 font-semibold">
                              LCA #: {rec.lcaNumber}
                            </div>
                          )}
                          {(rec.clientAddress || rec.residenceAddress || rec.clientAddress1 || rec.residenceAddress1) && (
                            <div className="text-[9px] text-slate-500 mt-1.5 space-y-0.5 leading-normal border-t border-slate-200/50 pt-1">
                              {(rec.clientAddress1 || rec.clientAddress) && (
                                <div className="flex items-start gap-1">
                                  <span className="font-semibold text-slate-600 shrink-0">Client Addr:</span>
                                  <div className="text-slate-500">
                                    <CompactAddress
                                      address1={rec.clientAddress1}
                                      address2={rec.clientAddress2}
                                      city={rec.clientCity}
                                      state={rec.clientState}
                                      zip={rec.clientZip}
                                      fallback={rec.clientAddress}
                                    />
                                  </div>
                                </div>
                              )}
                              {(rec.residenceAddress1 || rec.residenceAddress) && (
                                <div className="flex items-start gap-1">
                                  <span className="font-semibold text-slate-600 shrink-0">Res Addr:</span>
                                  <div className="text-slate-500">
                                    <CompactAddress
                                      address1={rec.residenceAddress1}
                                      address2={rec.residenceAddress2}
                                      city={rec.residenceCity}
                                      state={rec.residenceState}
                                      zip={rec.residenceZip}
                                      fallback={rec.residenceAddress}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {(() => {
                            const c = verifyAddressCompliance(rec);
                            if (c.status === "danger") {
                              return (
                                <div className="mt-2.5 p-2 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-[10px] font-semibold flex items-start gap-1.5 leading-relaxed animate-fade-in shadow-2xs">
                                  <span className="text-xs">⚠️</span>
                                  <div>
                                    <span className="font-extrabold uppercase text-[8.5px] bg-rose-600 text-white px-1.5 py-0.5 rounded mr-1">Worksite Alert</span>
                                    <span>{c.message}</span>
                                  </div>
                                </div>
                              );
                            } else if (c.status === "warning") {
                              return (
                                <div className="mt-2.5 p-2 bg-amber-50 border border-amber-100 text-amber-800 rounded-lg text-[10px] font-semibold flex items-start gap-1.5 leading-relaxed animate-fade-in shadow-2xs">
                                  <span className="text-xs">⚠️</span>
                                  <div>
                                    <span className="font-extrabold uppercase text-[8.5px] bg-amber-500 text-white px-1.5 py-0.5 rounded mr-1">MSA Commute Risk</span>
                                    <span>{c.message}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLcaId(rec.id);
                              setEditLcaWage(String(rec.annualWage));
                              setEditLcaDate(rec.effectiveFrom);
                              setEditLcaNumber(rec.lcaNumber || "");
                              
                              setEditClientAddr1(rec.clientAddress1 || rec.clientAddress || "");
                              setEditClientAddr2(rec.clientAddress2 || "");
                              setEditClientCity(rec.clientCity || "");
                              setEditClientCounty(rec.clientCounty || "");
                              setEditClientState(rec.clientState || "");
                              setEditClientZip(rec.clientZip || "");

                              setEditResAddr1(rec.residenceAddress1 || rec.residenceAddress || "");
                              setEditResAddr2(rec.residenceAddress2 || "");
                              setEditResCity(rec.residenceCity || "");
                              setEditResCounty(rec.residenceCounty || "");
                              setEditResState(rec.residenceState || "");
                              setEditResZip(rec.residenceZip || "");

                              setEditLcaTillDate(rec.tillDate || "");
                              setEditWorkMode(rec.workMode || "On-site");
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all"
                            title="Edit rate change"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`delete_lca_${rec.id}`}
                            onClick={() => handleDeleteLCARecord(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                            title="Delete rate change"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  ))
              )}
            </div>

            {/* Form to submit state rate change */}
            <form onSubmit={handleAddLCARecord} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => setIsAddLcaFormExpanded(!isAddLcaFormExpanded)}
                className={`w-full text-left text-xs font-bold p-2.5 rounded-lg flex items-center justify-between gap-1.5 focus:outline-none cursor-pointer transition-all border ${
                  isAddLcaFormExpanded
                    ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                    : "bg-indigo-50 border-indigo-100 text-indigo-900 hover:bg-indigo-100/70"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Plus className={`w-4 h-4 transition-transform duration-250 ${isAddLcaFormExpanded ? "rotate-45 text-white" : "text-indigo-650"}`} />
                  <span className="font-extrabold font-sans uppercase text-[10px] tracking-wider">Add New LCA Record</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform duration-250 ${isAddLcaFormExpanded ? "rotate-90 text-white" : "text-indigo-400"}`} />
              </button>

              {isAddLcaFormExpanded && (
                <div className="space-y-3 animate-fadeIn">
                  {lcaError && (
                    <p className="text-[10px] font-semibold text-rose-500">{lcaError}</p>
                  )}

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Annual Salary *</label>
                        <div className="relative">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                          <input
                            id="input_new_lca_wage"
                            type="text"
                            required
                            placeholder="e.g. 101,000.00"
                            value={newWage}
                            onChange={(e) => setNewWage(e.target.value)}
                            className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">LCA Number</label>
                        <input
                          id="input_new_lca_number"
                          type="text"
                          placeholder="e.g. I-200-xxxxx"
                          value={newLcaNumber}
                          onChange={(e) => setNewLcaNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Work Mode</label>
                        <select
                          id="input_new_lca_workmode"
                          value={newWorkMode}
                          onChange={(e) => setNewWorkMode(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-sans cursor-pointer"
                        >
                          <option value="On-site">On-site</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="Remote">Remote</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-405 uppercase font-mono font-sans">Effective From *</label>
                        <input
                          id="input_new_lca_effective"
                          type="date"
                          required
                          value={newWageDate}
                          onChange={(e) => setNewWageDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-405 uppercase font-mono font-sans">Till Date</label>
                        <input
                          id="input_new_lca_till_date"
                          type="date"
                          value={newTillDate}
                          onChange={(e) => setNewTillDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Client Address Section */}
                    <div className="border border-indigo-100 rounded-lg p-2.5 bg-indigo-50/20 space-y-2">
                      <span className="text-[10px] font-bold text-indigo-950 block uppercase tracking-wider font-mono">
                        Client Address
                      </span>
                      
                      <div className="relative space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Address Line 1</label>
                        <input
                          id="new_client_addr1"
                          type="text"
                          placeholder="Street name / number"
                          value={newClientAddr1}
                          onChange={(e) => handleNewClientAddr1Change(e.target.value)}
                          onFocus={() => { if (newClientSuggestions.length > 0) setShowNewClientSuggestions(true); }}
                          onBlur={() => setTimeout(() => setShowNewClientSuggestions(false), 200)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                        />
                        {showNewClientSuggestions && newClientSuggestions.length > 0 && (
                          <div className="absolute absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-0.5 pointer-events-auto">
                            {newClientSuggestions.map((sug, i) => (
                              <div
                                key={i}
                                onMouseDown={() => handleSelectNewClientSuggestion(sug)}
                                className="px-2.5 py-1.5 text-xs hover:bg-indigo-50 cursor-pointer text-slate-700 border-b border-slate-100 last:border-0"
                              >
                                {sug.label || `${sug.address1}, ${sug.city}, ${sug.state} ${sug.zip}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Suite/Apt/Line 2</label>
                          <input
                            id="new_client_addr2"
                            type="text"
                            placeholder="e.g. Suite 400"
                            value={newClientAddr2}
                            onChange={(e) => setNewClientAddr2(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">County</label>
                          <input
                            id="new_client_county"
                            type="text"
                            placeholder="County"
                            value={newClientCounty}
                            onChange={(e) => setNewClientCounty(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">City</label>
                          <input
                            id="new_client_city"
                            type="text"
                            placeholder="City"
                            value={newClientCity}
                            onChange={(e) => setNewClientCity(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">State</label>
                          <select
                            id="new_client_state"
                            value={newClientState}
                            onChange={(e) => setNewClientState(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800 cursor-pointer"
                          >
                            <option value="">ST</option>
                            {US_STATES.map(st => (
                              <option key={st.code} value={st.code}>{st.code}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Zip</label>
                          <input
                            id="new_client_zip"
                            type="text"
                            placeholder="ZIP"
                            value={newClientZip}
                            onChange={(e) => setNewClientZip(e.target.value)}
                            className={`w-full px-2.5 py-1 text-xs border rounded-md outline-none focus:ring-1 text-slate-800 ${newClientZip.trim() && !validateZipCode(newClientZip) ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:ring-indigo-550'}`}
                          />
                          {newClientZip.trim() && !validateZipCode(newClientZip) && (
                            <span className="text-[7px] font-semibold text-rose-600 block mt-0.5 leading-none">Format: 5 digits or 5+4 format</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Residence Address Section */}
                    <div className="border border-indigo-100 rounded-lg p-2.5 bg-indigo-50/20 space-y-2">
                      <span className="text-[10px] font-bold text-indigo-950 block uppercase tracking-wider font-mono">
                        Residence Address
                      </span>
                      
                      <div className="relative space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Address Line 1</label>
                        <input
                          id="new_res_addr1"
                          type="text"
                          placeholder="Street name / number"
                          value={newResAddr1}
                          onChange={(e) => handleNewResAddr1Change(e.target.value)}
                          onFocus={() => { if (newResSuggestions.length > 0) setShowNewResSuggestions(true); }}
                          onBlur={() => setTimeout(() => setShowNewResSuggestions(false), 200)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                        />
                        {showNewResSuggestions && newResSuggestions.length > 0 && (
                          <div className="absolute absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-0.5 pointer-events-auto">
                            {newResSuggestions.map((sug, i) => (
                              <div
                                key={i}
                                onMouseDown={() => handleSelectNewResSuggestion(sug)}
                                className="px-2.5 py-1.5 text-xs hover:bg-indigo-50 cursor-pointer text-slate-700 border-b border-slate-100 last:border-0"
                              >
                                {sug.label || `${sug.address1}, ${sug.city}, ${sug.state} ${sug.zip}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Suite/Apt/Line 2</label>
                          <input
                            id="new_res_addr2"
                            type="text"
                            placeholder="e.g. Apt 4B"
                            value={newResAddr2}
                            onChange={(e) => setNewResAddr2(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">County</label>
                          <input
                            id="new_res_county"
                            type="text"
                            placeholder="County"
                            value={newResCounty}
                            onChange={(e) => setNewResCounty(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">City</label>
                          <input
                            id="new_res_city"
                            type="text"
                            placeholder="City"
                            value={newResCity}
                            onChange={(e) => setNewResCity(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">State</label>
                          <select
                            id="new_res_state"
                            value={newResState}
                            onChange={(e) => setNewResState(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-white outline-none focus:ring-1 focus:ring-indigo-550 text-slate-800 cursor-pointer"
                          >
                            <option value="">ST</option>
                            {US_STATES.map(st => (
                              <option key={st.code} value={st.code}>{st.code}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Zip</label>
                          <input
                            id="new_res_zip"
                            type="text"
                            placeholder="ZIP"
                            value={newResZip}
                            onChange={(e) => setNewResZip(e.target.value)}
                            className={`w-full px-2.5 py-1 text-xs border rounded-md outline-none focus:ring-1 text-slate-800 ${newResZip.trim() && !validateZipCode(newResZip) ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 focus:ring-indigo-505'}`}
                          />
                          {newResZip.trim() && !validateZipCode(newResZip) && (
                            <span className="text-[7px] font-semibold text-rose-600 block mt-0.5 leading-none">Format: 5 digits or 5+4 format</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="submit_lca_rate_btn"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg select-none cursor-pointer border border-indigo-500 transition-all shadow-sm flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Rate / Transition Change</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Quick proration helper tutorial block explaining math */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>How Mid-Year LCA is Audited</span>
            </h4>
            <p className="text-[11px] text-indigo-850/90 leading-relaxed">
              If an employee shifts position mid-month, the expected LCA is prorated based on calendar days. For instance, if a rate shifts on June 12:
            </p>
            <ol className="text-[10px] text-indigo-800 space-y-1.5 font-mono list-decimal pl-3.5">
              <li>Rate 1 is prorated for Jan 01 - Jun 11 (Expected calculated for those days of June)</li>
              <li>Rate 2 is prorated for Jun 12 - Dec 31 (Expected calculated for those days of June)</li>
              <li>Actual payroll must be equal to or higher than this custom aggregated expected total to remain fully compliant.</li>
            </ol>
          </div>
        </div>

        {/* Right Column: Main expected vs actual payroll audits (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
              {/* Annual Compliance Summary Banner */}
              <div id="annual_compliance_bar" className={`p-4 rounded-xl border flex items-center justify-between gap-4 select-none ${
                summary.annualDifference >= 0 
                  ? "bg-emerald-50/50 border-emerald-100 text-emerald-950" 
                  : "bg-rose-50 border-rose-100 text-rose-950"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    summary.annualDifference >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-605animate-pulse"
                  }`}>
                    {summary.annualDifference >= 0 ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">
                      {summary.annualDifference >= 0 ? "Compliant Track Summary" : "Non-Compliant Underpaid Track"}
                    </h4>
                    <p className="text-xs mt-0.5 opacity-80">
                      {summary.annualDifference >= 0 
                        ? "Manually logged payroll exceeds mandated LCA minimum bounds" 
                        : "Employee was underpaid in one or more month periods."}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs font-semibold opacity-70">Audit Net Difference</div>
                  <div className="text-base font-bold">
                    {summary.annualDifference >= 0 ? "+" : "-"}
                    ${Math.abs(summary.annualDifference).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Monthly Compliance Trend Chart (Feature 3) */}
              {(() => {
                const maxWage = Math.max(...summary.monthlyBreakdown.map(m => Math.max(m.expectedLCAWage, m.actualPayroll)), 1000);
                const chartHeight = 110;
                const chartBaseline = 125;
                const scale = maxWage > 0 ? chartHeight / maxWage : 1;
                
                return (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-fade-in my-4">
                    <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono text-slate-500">Monthly LCA vs Payroll Trend</span>
                      <span className="text-[9.5px] text-slate-400 font-mono font-semibold">Hover bars for details</span>
                    </div>

                    <div className="relative w-full h-[155px] select-none">
                      <svg className="w-full h-full font-sans text-[9px] font-bold text-slate-400" viewBox="0 0 600 155" preserveAspectRatio="xMidYMid meet">
                        {/* Grid lines */}
                        <line x1="50" y1={chartBaseline} x2="580" y2={chartBaseline} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="50" y1={chartBaseline - chartHeight / 2} x2="580" y2={chartBaseline - chartHeight / 2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="50" y1={chartBaseline - chartHeight} x2="580" y2={chartBaseline - chartHeight} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                        
                        {/* Y-Axis labels */}
                        <text x="40" y={chartBaseline + 3} textAnchor="end" className="fill-slate-400 font-mono text-[9px] font-bold">$0</text>
                        <text x="40" y={chartBaseline - chartHeight / 2 + 3} textAnchor="end" className="fill-slate-400 font-mono text-[9px] font-bold">${(maxWage / 2).toLocaleString("en-US", { maximumFractionDigits: 0 })}</text>
                        <text x="40" y={chartBaseline - chartHeight + 3} textAnchor="end" className="fill-slate-400 font-mono text-[9px] font-bold">${maxWage.toLocaleString("en-US", { maximumFractionDigits: 0 })}</text>

                        {summary.monthlyBreakdown.map((m, i) => {
                          const expHeight = m.expectedLCAWage * scale;
                          const expY = chartBaseline - expHeight;
                          const actHeight = m.actualPayroll * scale;
                          const actY = chartBaseline - actHeight;
                          const xOffset = 55 + i * 44;
                          const shortMonth = m.monthName.substring(0, 3);
                          const isMonthUnderpaid = !m.isMatching && m.expectedLCAWage > 0;
                          
                          return (
                            <g key={m.monthNumber}>
                              {/* Expected LCA Bar (gray) */}
                              {m.expectedLCAWage > 0 && (
                                <rect
                                  x={xOffset}
                                  y={expY}
                                  width="14"
                                  height={expHeight}
                                  fill="#cbd5e1"
                                  rx="2"
                                  className="transition-all duration-200 hover:fill-slate-400 cursor-pointer"
                                >
                                  <title>{`${m.monthName} Expected LCA: $${m.expectedLCAWage.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</title>
                                </rect>
                              )}
                              {/* Actual Payroll Bar (green or red) */}
                              {m.actualPayroll > 0 && (
                                <rect
                                  x={xOffset + 16}
                                  y={actY}
                                  width="14"
                                  height={actHeight}
                                  fill={isMonthUnderpaid ? "#f87171" : "#34d399"}
                                  rx="2"
                                  className="transition-all duration-200 hover:opacity-90 cursor-pointer"
                                >
                                  <title>{`${m.monthName} Paid Payroll: $${m.actualPayroll.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</title>
                                </rect>
                              )}
                              {/* X-Axis Month label */}
                              <text
                                x={xOffset + 14}
                                y={chartBaseline + 14}
                                textAnchor="middle"
                                className="fill-slate-500 font-semibold text-[9.5px] uppercase"
                              >
                                {shortMonth}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div className="flex items-center justify-end gap-4 mt-2 text-[10px] font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-slate-300" />
                        <span>Expected LCA Min</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-400" />
                        <span>Paid (Compliant)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-455 bg-rose-400" />
                        <span>Paid (Underpaid)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Spreadsheet table for direct numeric changes */}
              <div id="monthly_sheets_worksheet" className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Monthly Payroll Ledger Worksheet</span>
                  <span className="text-[10px] text-slate-400 italic">Entered monthly payroll is instantly aligned</span>
                </div>

                <table className="w-full text-xs text-left text-slate-500 border-collapse">
                  <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold font-mono border-b border-slate-100">
                    <tr>
                      <th scope="col" className="px-4 py-2 bg-slate-50/20">Month</th>
                      <th scope="col" className="px-4 py-2 text-right">Expected LCA</th>
                      <th scope="col" className="px-4 py-2 text-center">LOA Status</th>
                      <th scope="col" className="px-4 py-2 text-right">MANUAL PAYROLL ENTERED ($)</th>
                      <th scope="col" className="px-4 py-2 text-right">Variance</th>
                      <th scope="col" className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.monthlyBreakdown.map(breakdown => {
                      const isUnderpaid = !breakdown.isMatching && breakdown.expectedLCAWage > 0;
                      return (
                        <tr 
                          key={breakdown.monthNumber} 
                          className="hover:bg-indigo-50/20 hover:translate-x-0.5 border-l-4 border-l-transparent hover:border-l-indigo-400 focus-within:bg-indigo-50/30 focus-within:border-l-indigo-600 focus-within:translate-x-0.5 focus-within:shadow-xs transition-all duration-200 ease-out"
                        >
                          {/* Month Name */}
                          <td className="px-4 py-2.5 font-semibold text-slate-800">
                            {breakdown.monthName}
                          </td>

                          {/* Expected LCA */}
                          <td className="px-4 py-2.5 text-right font-mono text-slate-750">
                            ${breakdown.expectedLCAWage.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            
                            {/* Tiny footnote indicating proration status */}
                            {(breakdown.notes.includes("Prorated") || breakdown.notes.includes("LOA")) && (
                              <span
                                className="block text-[9px] text-indigo-500 italic mt-0.5 font-sans"
                                title={breakdown.notes}
                              >
                                {breakdown.notes.includes("LOA") ? "LOA adjustment active" : "Prorated rate change"}
                              </span>
                            )}
                          </td>

                          {/* LOA Status Select Dropdown */}
                          <td className="px-4 py-2 text-center">
                            <select
                              id={`loa_select_m${breakdown.monthNumber}`}
                              value={(() => {
                                const record = employee.payrollRecords.find(p => p.year === year && p.month === breakdown.monthNumber);
                                const loa = record?.loaDays || 0;
                                if (loa === 0) return "none";
                                const daysInMonth = new Date(year, breakdown.monthNumber, 0).getDate();
                                if (loa >= daysInMonth) return "full";
                                return "15days";
                              })()}
                              onChange={(e) => {
                                const val = e.target.value;
                                const daysInMonth = new Date(year, breakdown.monthNumber, 0).getDate();
                                let loaDays = 0;
                                if (val === "15days") loaDays = 15;
                                else if (val === "full") loaDays = daysInMonth;
                                handlePayrollLOAUpdate(breakdown.monthNumber, loaDays);
                              }}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-700 cursor-pointer"
                            >
                              <option value="none">No LOA</option>
                              <option value="15days">15 Days LOA</option>
                              <option value="full">Full Month LOA</option>
                            </select>
                          </td>

                          {/* Interactive Manual numeric cell typing */}
                          <td className="px-4 py-2 text-right">
                            <div className="relative inline-block w-32">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">$</span>
                              <input
                                id={`payroll_cell_m${breakdown.monthNumber}`}
                                type="text"
                                placeholder="0.00"
                                value={
                                  editingPayrollCell && editingPayrollCell.month === breakdown.monthNumber
                                    ? editingPayrollCell.value
                                    : (breakdown.actualPayroll !== 0 && breakdown.actualPayroll !== undefined ? String(breakdown.actualPayroll) : "")
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const formatted = val.replace(/[^0-9.]/g, "");
                                  const dotCount = (formatted.match(/\./g) || []).length;
                                  if (dotCount > 1) return; // Allow only one decimal point
                                  setEditingPayrollCell({ month: breakdown.monthNumber, value: formatted });
                                  handlePayrollCellUpdate(breakdown.monthNumber, formatted);
                                }}
                                onBlur={() => setEditingPayrollCell(null)}
                                className={`w-full pl-5 pr-2 py-1 text-right font-mono text-xs border rounded-lg focus:outline-none transition-all ${
                                  isUnderpaid 
                                    ? "bg-rose-50 border-rose-200 text-rose-700 focus:ring-1 focus:ring-rose-500" 
                                    : "bg-white border-slate-200 focus:ring-1 focus:ring-indigo-500"
                                }`}
                              />
                            </div>
                          </td>

                          {/* Difference computation */}
                          <td className="px-4 py-2.5 text-right font-mono">
                            {breakdown.difference >= 0 ? (
                              <span className="text-emerald-600 font-semibold">
                                +${breakdown.difference.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold">
                                -${Math.abs(breakdown.difference).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>

                          {/* Compliance checkbox flag */}
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center">
                              {breakdown.expectedLCAWage === 0 ? (
                                <span className="text-[10px] text-slate-400 font-mono">No LCA limit</span>
                              ) : breakdown.isFuture && calculationMode === "ytd" ? (
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 rounded font-extrabold text-[9px] uppercase tracking-wider">
                                  {breakdown.year === new Date().getFullYear() && breakdown.monthNumber === new Date().getMonth() + 2 ? "Pending" : "Future Excluded"}
                                </span>
                              ) : isUnderpaid ? (
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-150 rounded font-semibold text-[9px]">
                                  Underpaid
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-150 rounded font-semibold text-[9px]">
                                  Compliant
                                </span>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    )}

          {(activeTab === "expenses" || layoutPreference === "audit") && (
            /* Tab 2: Dynamic Employee Expense Ledger module */
            <div id="expense_ledger_tab_body" className={`space-y-4 animate-fadeIn ${
              layoutPreference === "audit" ? "mt-8 pt-8 border-t-2 border-slate-200" : ""
            }`}>
              
              {/* Metric Balance Cards row */}
              <div id="expense_metrics_summary" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Total Disbursed Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total LGL Paid</span>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-indigo-600 font-mono">
                      +${totalDisbursed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Advances / business outlays</span>
                </div>

                {/* 2. Total Paid Back Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total LGL Received</span>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-amber-600 font-mono">
                      -${totalRepaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1">Reimbursement offsets / repayments</span>
                </div>

                {/* 3. Net Balance Due Card (COLOR CODING) */}
                <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-colors ${
                  balanceDue < 0
                    ? "bg-amber-50/50 border-amber-200 text-amber-955"
                    : balanceDue === 0
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-955"
                      : "bg-sky-50/50 border-sky-200 text-sky-955"
                }`}>
                  <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider font-mono">Outstanding Balance Due</span>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className={`text-lg font-bold font-mono ${
                      balanceDue < 0
                        ? "text-amber-700"
                        : balanceDue === 0
                          ? "text-emerald-700"
                          : "text-sky-700"
                    }`}>
                      {balanceDue < 0 
                        ? `-$${Math.abs(balanceDue).toLocaleString("en-US", { minimumFractionDigits: 2 })}` 
                        : balanceDue > 0 
                          ? `+$${balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}` 
                          : "$0.00"
                      }
                    </span>
                  </div>
                  <span className="text-[10px] font-medium opacity-85 mt-1">
                    {balanceDue < 0
                      ? "Outstanding balance due from employee"
                      : balanceDue === 0
                        ? "Fully settled / $0.00 ending balance"
                        : "Credit balance / employee overpaid"}
                  </span>
                </div>

              </div>

              {/* Input Form + Column Configurator Grids */}
              <div id="expense_actions_row" className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Record Transaction Form (Spans 8 cols) */}
                <form id="record_transaction_card" onSubmit={handleAddExpense} className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                  <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Record Expense Transaction</span>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded font-mono">MM/DD/YYYY format matched</span>
                  </div>

                  {/* Grid Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Date select picker */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Transaction Date</label>
                      <input
                        type="date"
                        required
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-white text-slate-800"
                      />
                    </div>

                    {/* Transaction Mode Toggles: Disbursed vs Returned */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Flow Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExpType("disbursed")}
                          className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none text-center ${
                            expType === "disbursed"
                              ? "bg-rose-600 text-white border-rose-700 shadow-sm shadow-rose-100"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-150"
                          }`}
                        >
                          LGL Paid (-)
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpType("returned")}
                          className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none text-center ${
                            expType === "returned"
                              ? "bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-100"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-150"
                          }`}
                        >
                          LGL Received (+)
                        </button>
                      </div>
                    </div>

                    {/* Numeric Amount value input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Amount ($)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0.00"
                          placeholder="0.00"
                          value={expType === "returned" && useExpCalculations ? (calculatedPaidBackAmount > 0 ? calculatedPaidBackAmount.toFixed(2) : "0.00") : expAmount}
                          onChange={(e) => {
                            setExpAmount(e.target.value);
                          }}
                          disabled={expType === "returned" && useExpCalculations}
                          className={`w-full pl-5 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-800 ${
                            expType === "returned" && useExpCalculations ? "bg-slate-50 font-bold text-slate-500" : "bg-white"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Transaction details/notes */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Details / Description <span className="text-[9px] text-indigo-400 normal-case font-semibold">(Optional)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. cash travel advance (optional)"
                        value={expDetails}
                        onChange={(e) => setExpDetails(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                      />
                    </div>

                  </div>

                  {/* Calculation helper toggle check for LGL Received */}
                  {expType === "returned" && (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="toggle_exp_calculations"
                        checked={useExpCalculations}
                        onChange={(e) => setUseExpCalculations(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                      />
                      <label htmlFor="toggle_exp_calculations" className="text-[11px] font-semibold text-slate-650 cursor-pointer select-none">
                        Include LGL Received Specific Calculation Details (Project, Hrs, Taxes, etc.)
                      </label>
                    </div>
                  )}

                  {/* Specific returned (LGL Received) interactive calculations section */}
                  {expType === "returned" && useExpCalculations && (
                    <div className="pt-3 border-t border-dashed border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-200 animate-fadeIn">
                      <div className="sm:col-span-2 pb-0.5">
                        <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider font-mono animate-pulse">LGL Received Specific Ledger Fields (Optional)</span>
                      </div>

                      {/* 1. Project */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Project</label>
                        <input
                          type="text"
                          placeholder="e.g. Project Alpha"
                          value={expProject}
                          onChange={(e) => setExpProject(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                        />
                      </div>

                      {/* 2. Hrs */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Hrs (Hours Worked)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={expHrs}
                          onChange={(e) => setExpHrs(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-white text-slate-800"
                        />
                      </div>

                      {/* 3. Rate */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Rate ($ / Hr)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={expRate}
                            onChange={(e) => setExpRate(e.target.value)}
                            className="w-full pl-5 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-white text-slate-800"
                          />
                        </div>
                      </div>

                      {/* 4. Total (Calculated: Hrs * Rate) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Total ($ Calculated)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">$</span>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={expTotalCalc.toFixed(2)}
                            className="w-full pl-5 pr-2.5 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-xs outline-none font-mono font-bold text-slate-650"
                          />
                        </div>
                      </div>

                      {/* 5. Employee Tax */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Employee Tax ($)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={expEmployeeTax}
                            onChange={(e) => setExpEmployeeTax(e.target.value)}
                            className="w-full pl-5 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-white text-slate-800"
                          />
                        </div>
                      </div>

                      {/* 6. Employer Tax */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Employer Tax ($)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={expEmployerTax}
                            onChange={(e) => setExpEmployerTax(e.target.value)}
                            className="w-full pl-5 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-white text-slate-800"
                          />
                        </div>
                      </div>

                      {/* 7. Insurance */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Insurance ($)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[10px]">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={expInsurance}
                            onChange={(e) => setExpInsurance(e.target.value)}
                            className="w-full pl-5 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-white text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic inputs for Registered extra columns */}
                  {(employee.expenseColumns || []).length > 0 && (
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      {(employee.expenseColumns || []).map(col => (
                        <div key={col} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-505 text-slate-500 uppercase font-mono flex items-center gap-1">
                            <span>{col}</span>
                            <span className="text-[8px] font-normal text-slate-400 italic font-sans">(Extra Detail)</span>
                          </label>
                          <input
                            type="text"
                            placeholder={`Enter ${col.toLowerCase()}...`}
                            value={expCustomValues[col] || ""}
                            onChange={(e) => setExpCustomValues(prev => ({ ...prev, [col]: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submission triggers */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:shadow-indigo-500/10 text-xs font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add record</span>
                    </button>
                  </div>
                </form>

                {/* Column configurator toolbox */}
                <div id="custom_column_config_box" className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3">
                  <div className="pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono block">Dynamic Details Sheet</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block leading-tight">Create additional columns in the ledger view to capture specific details</span>
                  </div>

                  {/* Inline list of current custom columns with quick deleted triggers */}
                  <div className="flex-1 overflow-y-auto max-h-24 py-1.5">
                    {!(employee.expenseColumns || []).length ? (
                      <div className="text-[11px] text-slate-400 italic leading-snug">
                        No extra columns added yet. Type a detail name below to create a custom column dynamically.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Active Custom Columns:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(employee.expenseColumns || []).map(col => (
                            <span
                              key={col}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-0.5 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 cursor-help transition-all"
                              title={`Click 'x' to permanently drop column ${col}`}
                            >
                              <span>{col}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated: Employee = {
                                    ...employee,
                                    expenseColumns: (employee.expenseColumns || []).filter(c => c !== col)
                                  };
                                  onUpdateEmployee(updated);
                                }}
                                className="font-extrabold hover:text-rose-900 leading-none pl-0.5"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add Column Mini Input trigger */}
                  <form onSubmit={handleAddCustomColumn} className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Add Extra Details Column</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Approved By, Reason"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white active:scale-98 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 transition-colors"
                      >
                        Add Column
                      </button>
                    </div>
                  </form>
                </div>

              </div>

              {/* Transactions Ledger Table display */}
              <div id="expense_items_grid_card" className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Employee Ledger Sheet</span>
                    <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded font-bold">
                      {transactions.length} Records
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 italic font-medium">Sorted chronologically by date</span>
                </div>

                {transactions.length === 0 ? (
                  <div className="p-8 text-center italic text-xs text-slate-400 bg-white">
                    No expense transactions logged to this employee's ledger. Use the form above to add a transaction record.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-500 border-collapse">
                      <thead className="bg-slate-50/50 text-slate-400 uppercase text-[9px] font-extrabold font-mono border-b border-slate-150">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 bg-slate-50/40">Date</th>
                          <th scope="col" className="px-4 py-2.5">Details</th>
                          
                          {/* Loop other custom columns dynamically */}
                          {(employee.expenseColumns || []).map(col => (
                            <th key={col} scope="col" className="px-4 py-2.5 font-mono text-indigo-900 bg-indigo-50/20">{col}</th>
                          ))}

                          <th scope="col" className="px-4 py-2.5 text-right">Flow Direction</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-mono">Amount</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-mono">Outst. Balance</th>
                          <th scope="col" className="px-4 py-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {(() => {
                          // Sort transactions chronologically
                          const sortedTxns = [...transactions].sort((a, b) => {
                            const dateA = a.date.includes("/") 
                              ? new Date(a.date.split("/")[2] + "-" + a.date.split("/")[0] + "-" + a.date.split("/")[1])
                              : new Date(a.date);
                            const dateB = b.date.includes("/")
                              ? new Date(b.date.split("/")[2] + "-" + b.date.split("/")[0] + "-" + b.date.split("/")[1])
                              : new Date(b.date);
                            return dateA.getTime() - dateB.getTime();
                          });

                          // Compute running cumulative balance
                          let cumSum = 0;

                          return sortedTxns.map(txn => {
                            cumSum -= txn.amount;
                            const isDisbursed = txn.amount < 0;

                            const isSelected = selectedTxnForDetails?.id === txn.id;

                            return (
                              <tr 
                                key={txn.id} 
                                onClick={() => { if (editingTxnId !== txn.id) setSelectedTxnForDetails(txn); }}
                                className={`transition-all duration-200 ease-out border-l-4 leading-normal text-xs ${
                                  editingTxnId === txn.id 
                                    ? 'bg-indigo-50/35 border-l-indigo-400 font-medium' 
                                    : isSelected
                                      ? 'bg-indigo-100/40 border-l-indigo-600 shadow-xs translate-x-0.5 font-semibold'
                                      : 'hover:bg-indigo-50/25 cursor-pointer border-l-transparent hover:border-l-indigo-400 hover:translate-x-0.5 hover:shadow-xs'
                                }`}
                              >
                                
                                {/* 1. Date column */}
                                {editingTxnId === txn.id ? (
                                  <td className="px-4 py-2 font-mono">
                                    <input
                                      type="date"
                                      value={editTxnDate}
                                      onChange={(e) => setEditTxnDate(e.target.value)}
                                      className="w-full text-xs font-mono py-1 px-1.5 border border-indigo-200 bg-white rounded text-slate-800"
                                    />
                                  </td>
                                ) : (
                                  <td className="px-4 py-3 font-semibold text-slate-800 font-mono">
                                    {formatDateToMDY(txn.date)}
                                  </td>
                                )}

                                {/* 2. Transaction details/description */}
                                {editingTxnId === txn.id ? (
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      value={editTxnDetails}
                                      onChange={(e) => setEditTxnDetails(e.target.value)}
                                      className="w-full text-xs py-1 px-1.5 border border-indigo-200 bg-white rounded text-slate-800"
                                    />
                                  </td>
                                ) : (
                                  <td className="px-4 py-3 text-slate-700 font-semibold">
                                    {txn.details}
                                  </td>
                                )}

                                {/* 3. Dynamic Registered Custom Columns */}
                                {(employee.expenseColumns || []).map(col => (
                                  editingTxnId === txn.id ? (
                                    <td key={col} className="px-4 py-2">
                                      <input
                                        type="text"
                                        value={editTxnCustom[col] || ""}
                                        onChange={(e) => setEditTxnCustom(prev => ({
                                          ...prev,
                                          [col]: e.target.value
                                        }))}
                                        className="w-full text-xs py-1 px-1.5 border border-indigo-200 bg-white rounded text-slate-800 font-mono"
                                      />
                                    </td>
                                  ) : (
                                    <td key={col} className="px-4 py-3 text-slate-500 font-mono font-medium">
                                      {txn.customFields?.[col] || "-"}
                                    </td>
                                  )
                                ))}

                                {/* 4. Flow direction pill column */}
                                {editingTxnId === txn.id ? (
                                  <td className="px-4 py-2 text-right">
                                    <select
                                      value={editTxnType}
                                      onChange={(e) => setEditTxnType(e.target.value as "disbursed" | "returned")}
                                      className="text-xs font-bold py-1 px-1.5 border border-indigo-200 bg-white rounded text-slate-800"
                                    >
                                      <option value="disbursed">LGL Paid (-)</option>
                                      <option value="returned">LGL Received (+)</option>
                                    </select>
                                  </td>
                                ) : (
                                  <td className="px-4 py-3 text-right">
                                    {isDisbursed ? (
                                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-150 rounded-full text-[9px] font-bold">
                                        LGL Paid (-)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[9px] font-bold">
                                        LGL Received (+)
                                      </span>
                                    )}
                                  </td>
                                )}

                                {/* 5. Direct Amount column */}
                                {editingTxnId === txn.id ? (
                                  <td className="px-4 py-2 text-right">
                                    <div className="relative inline-block w-24">
                                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[9px]">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editTxnAmount}
                                        onChange={(e) => setEditTxnAmount(e.target.value)}
                                        className="w-full pl-3.5 pr-1 py-1 text-right font-mono text-xs border border-indigo-200 bg-white rounded text-slate-800"
                                      />
                                    </div>
                                  </td>
                                ) : (
                                  <td className="px-4 py-3 text-right font-mono font-bold">
                                    {isDisbursed ? (
                                      <span className="text-rose-600">
                                        -${Math.abs(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600">
                                        +${Math.abs(txn.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </td>
                                )}

                                {/* 6. Running Cumulative Balance Due outst. */}
                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                  ${cumSum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </td>

                                {/* 7. Inline deletion/editing trigger */}
                                {editingTxnId === txn.id ? (
                                  <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditTxn(txn.id)}
                                        className="p-1 px-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-[10px] cursor-pointer flex items-center justify-center"
                                        title="Save edit"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingTxnId(null)}
                                        className="p-1 px-2 border border-slate-200 hover:bg-slate-100 text-slate-500 bg-white rounded font-bold text-[10px] cursor-pointer"
                                        title="Cancel"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                ) : (
                                  <td className="px-4 py-3 text-center animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingTxnId(txn.id);
                                          setEditTxnDate(convertMDYtoIso(txn.date));
                                          setEditTxnDetails(txn.details);
                                          setEditTxnAmount(String(Math.abs(txn.amount)));
                                          setEditTxnType(txn.amount < 0 ? "disbursed" : "returned");
                                          setEditTxnCustom(txn.customFields || {});
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                                        title="Edit transaction log"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteExpense(txn.id)}
                                        className="p-1 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                        title="Delete transaction log"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                )}

                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        
      </div>

      {selectedTxnForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-slate-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide font-mono">
                    {isEditingInModal ? "Edit Ledger Record" : "Ledger Transaction Record"}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedTxnForDetails.id}</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSelectedTxnForDetails(null);
                  setIsEditingInModal(false);
                }}
                className="p-1 px-2.5 hover:bg-slate-200/60 rounded-full text-slate-500 hover:text-slate-700 transition-colors font-mono font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Employee Quick Info Card */}
              <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                <span className="text-[9px] font-bold text-indigo-550 uppercase tracking-widest font-mono">Employee details</span>
                <h4 className="text-base font-bold text-slate-800 mt-0.5">{employee.fullName}</h4>
                <p className="text-xs font-mono text-slate-500 mt-0.5">ID Ref: {employee.employeeId}</p>
              </div>

              {isEditingInModal ? (
                /* EDIT FORM */
                <div className="space-y-4">
                  {/* Basic parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Date Logged</label>
                      <input
                        type="date"
                        value={modalTxnDate}
                        onChange={(e) => setModalTxnDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Flow Direction</label>
                      <select
                        value={modalTxnType}
                        onChange={(e) => setModalTxnType(e.target.value as "disbursed" | "returned")}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium"
                      >
                        <option value="disbursed">LGL Paid (-)</option>
                        <option value="returned">LGL Received (+)</option>
                      </select>
                    </div>
                  </div>

                  {/* Calculations toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/70 border border-slate-200 p-3 rounded-xl transition-colors">
                    <input
                      type="checkbox"
                      checked={modalUseCalculations}
                      onChange={(e) => setModalUseCalculations(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800">Use Hourly Calculations Worksheet</span>
                      <p className="text-[10px] text-slate-400 font-mono">Automatically subtract taxes & withholding from base</p>
                    </div>
                  </label>

                  {modalUseCalculations ? (
                    /* LCA Worksheet inputs */
                    <div className="border border-indigo-100 rounded-xl overflow-hidden text-xs bg-indigo-50/20 divide-y divide-indigo-50">
                      <div className="grid grid-cols-2 p-3 items-center">
                        <span className="text-slate-600 font-medium">Project Name:</span>
                        <input
                          type="text"
                          value={modalTxnCustom["Project"] || ""}
                          placeholder="e.g. Phoenix Project"
                          onChange={(e) => setModalTxnCustom(prev => ({ ...prev, Project: e.target.value }))}
                          className="px-2 py-1 text-right text-xs border border-indigo-150 bg-white rounded font-semibold text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 p-3 items-center">
                        <span className="text-slate-600 font-medium">Hours Worked (Hrs):</span>
                        <input
                          type="number"
                          step="0.01"
                          value={modalTxnCustom["Hrs"] || ""}
                          placeholder="0.00"
                          onChange={(e) => setModalTxnCustom(prev => ({ ...prev, Hrs: e.target.value }))}
                          className="px-2 py-1 text-right font-mono text-xs border border-indigo-150 bg-white rounded text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 p-3 items-center">
                        <span className="text-slate-600 font-medium">Hourly Rate:</span>
                        <input
                          type="text"
                          value={modalTxnCustom["Rate"] || ""}
                          placeholder="$0.00"
                          onChange={(e) => setModalTxnCustom(prev => ({ ...prev, Rate: e.target.value }))}
                          className="px-2 py-1 text-right font-mono text-xs border border-indigo-150 bg-white rounded text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 p-3 items-center bg-indigo-50/30">
                        <span className="text-indigo-900 font-bold">Total Base Gross:</span>
                        <span className="font-mono font-bold text-indigo-700 text-right">
                          ${modalTotalCalc.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 p-3 items-center">
                        <span className="text-slate-600 font-medium">Employee Tax:</span>
                        <input
                          type="text"
                          value={modalTxnCustom["Employee Tax"] || ""}
                          placeholder="$0.00"
                          onChange={(e) => setModalTxnCustom(prev => ({ ...prev, "Employee Tax": e.target.value }))}
                          className="px-2 py-1 text-right font-mono text-xs border border-indigo-155 bg-white rounded text-rose-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 p-3 items-center">
                        <span className="text-slate-600 font-medium">Employer Tax:</span>
                        <input
                          type="text"
                          value={modalTxnCustom["Employer Tax"] || ""}
                          placeholder="$0.00"
                          onChange={(e) => setModalTxnCustom(prev => ({ ...prev, "Employer Tax": e.target.value }))}
                          className="px-2 py-1 text-right font-mono text-xs border border-indigo-155 bg-white rounded text-rose-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 p-3 items-center">
                        <span className="text-slate-600 font-medium">Insurance Withholding:</span>
                        <input
                          type="text"
                          value={modalTxnCustom["Insurance"] || ""}
                          placeholder="$0.00"
                          onChange={(e) => setModalTxnCustom(prev => ({ ...prev, Insurance: e.target.value }))}
                          className="px-2 py-1 text-right font-mono text-xs border border-indigo-155 bg-white rounded text-rose-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 p-3 items-center bg-emerald-50/20">
                        <span className="text-emerald-950 font-bold font-mono">Calculated Net:</span>
                        <span className="font-mono font-bold text-emerald-700 text-right">
                          ${modalCalculatedPaidBackAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* DIRECT AMOUNT DISPLAY FOR NON-WORKSHEET */
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Net Transaction Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold font-mono text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={modalTxnAmount}
                          onChange={(e) => setModalTxnAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Registered custom columns / fields */}
                  {Object.keys(modalTxnCustom).filter(key => !["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].includes(key)).length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Dynamic Custom Fields</span>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(modalTxnCustom)
                          .filter(([key]) => !["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].includes(key))
                          .map(([key, val]) => (
                            <div key={key} className="bg-slate-50 border border-slate-205 p-2.5 rounded-xl flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">{key}</span>
                              <input
                                type="text"
                                value={val || ""}
                                onChange={(e) => setModalTxnCustom(prev => ({ ...prev, [key]: e.target.value }))}
                                className="px-2 py-1 text-slate-800 text-xs border border-slate-200 bg-white rounded font-medium"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Notes Area */}
                  <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Description Notes</label>
                    <textarea
                      value={modalTxnDetails}
                      onChange={(e) => setModalTxnDetails(e.target.value)}
                      rows={3}
                      placeholder="Input any remarks, check ids, or receipts here..."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-705 text-xs font-sans leading-relaxed bg-white"
                    />
                  </div>
                </div>
              ) : (
                /* READ ONLY PREVIEW */
                <div className="space-y-4">
                  {/* Transaction Basic Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Date Logged</span>
                      <div className="text-xs font-bold font-mono text-slate-700 mt-1">{formatDateToMDY(selectedTxnForDetails.date)}</div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Flow Direction</span>
                      <div className="mt-1">
                        {selectedTxnForDetails.amount < 0 ? (
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
                        {selectedTxnForDetails.amount > 0 ? "+" : "-"}${Math.abs(selectedTxnForDetails.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider font-mono">Subtype label</span>
                      <p className="text-xs font-semibold text-slate-300 mt-1">
                        {selectedTxnForDetails.amount < 0 ? "Paid Advance" : "Received Offset"}
                      </p>
                    </div>
                  </div>

                  {/* LGL Calculations Section (Project, Hrs, rate, taxes...) if they exist */}
                  {selectedTxnForDetails.customFields && Object.keys(selectedTxnForDetails.customFields).some(k => ["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].includes(k)) && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-1.5 pb-1">
                        <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest font-mono">Calculated Fields Details</span>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2.5 bg-slate-100/40">
                          <span className="text-slate-500 font-medium">Project Name:</span>
                          <span className="font-bold text-slate-800 text-right">{selectedTxnForDetails.customFields["Project"] || "N/A"}</span>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                          <span className="text-slate-500 font-medium">Hours Worked (Hrs):</span>
                          <span className="font-mono text-slate-700 text-right">{selectedTxnForDetails.customFields["Hrs"] || "0.00"} hrs</span>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                          <span className="text-slate-500 font-medium">Hourly Rate:</span>
                          <span className="font-mono text-slate-700 text-right">{selectedTxnForDetails.customFields["Rate"] || "$0.00"} / hr</span>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2 bg-indigo-50/30">
                          <span className="text-indigo-900 font-semibold">Total Base (Hrs * Rate):</span>
                          <span className="font-mono font-bold text-indigo-750 text-indigo-700 text-right">{selectedTxnForDetails.customFields["Total"] || "$0.00"}</span>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                          <span className="text-slate-500 font-medium">Employee Tax deduction:</span>
                          <span className="font-mono text-rose-600 text-right">-{selectedTxnForDetails.customFields["Employee Tax"] || "$0.00"}</span>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                          <span className="text-slate-500 font-medium">Employer Tax deduction:</span>
                          <span className="font-mono text-rose-600 text-right">-{selectedTxnForDetails.customFields["Employer Tax"] || "$0.00"}</span>
                        </div>

                        <div className="grid grid-cols-2 border-b border-slate-100 px-4 py-2">
                          <span className="text-slate-500 font-medium">Insurance deduction:</span>
                          <span className="font-mono text-rose-600 text-right">-{selectedTxnForDetails.customFields["Insurance"] || "$0.00"}</span>
                        </div>

                        {/* Net Calculation Check */}
                        <div className="grid grid-cols-2 px-4 py-2.5 bg-emerald-50/20">
                          <span className="text-emerald-950 font-bold">LGL Net Received:</span>
                          <span className="font-mono font-bold text-emerald-700 text-right">
                            ${Math.abs(selectedTxnForDetails.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Custom Parameters / User Columns Section */}
                  {selectedTxnForDetails.customFields && Object.keys(selectedTxnForDetails.customFields).filter(key => !["Project", "Hrs", "Rate", "Total", "Employee Tax", "Employer Tax", "Insurance"].includes(key)).length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Dynamic Custom Fields (Registered Columns)</span>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedTxnForDetails.customFields)
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
                      {selectedTxnForDetails.details || (
                        <span className="text-slate-400 italic">No notes or description provided with this record.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
              {isEditingInModal ? (
                <>
                  <button 
                    type="button"
                    onClick={() => setIsEditingInModal(false)}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveModalEdit}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={startModalEditing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shadow-indigo-100"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Record</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSelectedTxnForDetails(null)}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-150 text-slate-700 rounded-xl font-semibold text-xs transition-all cursor-pointer"
                  >
                    Close Window
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
