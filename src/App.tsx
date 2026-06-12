/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Lock, 
  LogOut,
  FileText, 
  Upload, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Home,
  History,
  ChevronUp,
  ChevronDown,
  User,
  Activity,
  Moon,
  Sun,
  Search,
  Download,
  Coins
} from "lucide-react";
import { Employee, AuditActivity } from "./types";
import { SEED_EMPLOYEES, DEFAULT_YEAR_SELECTION } from "./data/seedData";
import { downloadCSV, getCSVTemplate } from "./utils/lcaCalcs";

// Firebase
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";

// Components
import LoginScreen from "./components/LoginScreen";
import EmployeeList from "./components/EmployeeList";
import DashboardView from "./components/DashboardView";
import EmployeeDetailView from "./components/EmployeeDetailView";
import ImportModal from "./components/ImportModal";
import BatchCollectionsModal from "./components/BatchCollectionsModal";
import LOGO_SRC from "./assets/images/lgl_logo_new_1779278963726.png";

export default function App() {
  // Authentication security gating state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>("");

  // Global dashboard dark-mode theme controller
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("g_tasks_theme");
      if (stored === "dark" || stored === "light") {
        return stored;
      }
    } catch (e) {
      // ignore
    }
    return "light";
  });

  // Keep DOM and sync attributes matching dark mode state
  useEffect(() => {
    try {
      localStorage.setItem("g_tasks_theme", theme);
    } catch (e) {
      console.error("Failed to persist theme", e);
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [theme]);

  // Database core state loaded from Firestore
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState<boolean>(true);
  
  // Audit Logs Trail loaded from Firestore
  const [activities, setActivities] = useState<AuditActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState<boolean>(true);



  // Listen to Auth State changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setEmployees([]);
        setActivities([]);
        setAuthError("");
      }
    });
    return () => unsubscribeAuth();
  }, []);



  // Listen to Firestore database in real-time
  useEffect(() => {
    if (!user) return;

    setEmployeesLoading(true);
    setActivitiesLoading(true);

    // Subscribe to employees
    const unsubscribeEmployees = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        const list: Employee[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Employee);
        });
        setEmployees(list);
        setEmployeesLoading(false);
      },
      (error) => {
        console.error("Error subscribing to employees:", error);
        if (error.code === "permission-denied") {
          setAuthError("unauthorized");
        }
      }
    );

    // Subscribe to activities
    const qActivities = query(collection(db, "activities"), orderBy("timestamp", "desc"));
    const unsubscribeActivities = onSnapshot(
      qActivities,
      (snapshot) => {
        const list: AuditActivity[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as AuditActivity);
        });
        setActivities(list);
        setActivitiesLoading(false);
      },
      (error) => {
        console.error("Error subscribing to activities:", error);
        if (error.code === "permission-denied") {
          setAuthError("unauthorized");
        }
      }
    );

    return () => {
      unsubscribeEmployees();
      unsubscribeActivities();
    };
  }, [user]);

  // Selected work state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(DEFAULT_YEAR_SELECTION);
  const [calculationMode, setCalculationMode] = useState<"ytd" | "full">("ytd");
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isBatchRecoupOpen, setIsBatchRecoupOpen] = useState<boolean>(false);

  // Layout preference fixed to Classic Split
  const layoutPreference = "split";

  // Collapsible Audit Timeline Tray expanded state
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false);

  // States for search and filtering of activities (Feature 5)
  const [timelineSearch, setTimelineSearch] = useState<string>("");
  const [timelineFilter, setTimelineFilter] = useState<string>("All");
  const [timelineAdminFilter, setTimelineAdminFilter] = useState<string>("All");

  // Get list of unique admins dynamically
  const uniqueAdmins = React.useMemo(() => {
    const admins = new Set<string>();
    activities.forEach((act) => {
      if (act.adminEmail) {
        admins.add(act.adminEmail);
      }
    });
    return Array.from(admins).sort();
  }, [activities]);

  // Derived filtered activities for Feature 5
  const filteredActivities = React.useMemo(() => {
    return activities.filter((act) => {
      // 1. Filter match by category badge
      let matchCat = true;
      if (timelineFilter === "Created") {
        matchCat = act.actionType.includes("Created") || act.actionType.includes("Logged") || act.actionType.includes("Added");
      } else if (timelineFilter === "Edited") {
        matchCat = act.actionType.includes("Edited") || act.actionType.includes("Updated") || act.actionType.includes("Modified");
      } else if (timelineFilter === "Deleted") {
        matchCat = act.actionType.includes("Deleted") || act.actionType.includes("Cleared") || act.actionType.includes("Removed");
      } else if (timelineFilter === "Imported") {
        matchCat = act.actionType.includes("Imported");
      }

      // 2. Filter match by search keyword
      const q = timelineSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        act.actionType.toLowerCase().includes(q) ||
        act.employeeName.toLowerCase().includes(q) ||
        act.details.toLowerCase().includes(q);

      // 3. Filter match by admin user
      let matchAdmin = true;
      if (timelineAdminFilter !== "All") {
        matchAdmin = act.adminEmail === timelineAdminFilter;
      }

      return matchCat && matchSearch && matchAdmin;
    });
  }, [activities, timelineFilter, timelineSearch, timelineAdminFilter]);

  // Export audit activity logs to CSV helper for Feature 5
  const handleExportTimeline = () => {
    let csv = "Timestamp,Action Type,Employee/Target,Performed By,Details\n";
    filteredActivities.forEach((act) => {
      const cleanerDetails = act.details.replace(/"/g, '""');
      const performer = act.adminEmail || "System";
      csv += `"${act.timestamp}","${act.actionType}","${act.employeeName}","${performer}","${cleanerDetails}"\n`;
    });
    downloadCSV(csv, "system_audit_activities_report.csv");
  };

  // Log new audit trail event
  const handleAddActivity = async (actionType: string, employeeName: string, details: string) => {
    const newActivity = {
      timestamp: new Date().toISOString(),
      actionType,
      employeeName,
      details,
      adminEmail: user?.email || "System",
    };
    try {
      await addDoc(collection(db, "activities"), newActivity);
    } catch (e) {
      console.error("Failed to add activity log", e);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // Safe database flush & reset
  const handleResetDatabase = async () => {
    const confirm = window.confirm("Are you sure you want to restore the default seed database? This will clear all manual CSV imports and modifications in the cloud.");
    if (confirm) {
      try {
        // Delete all current employees
        for (const emp of employees) {
          await deleteDoc(doc(db, "employees", emp.id));
        }
        // Write seed employees
        for (const emp of SEED_EMPLOYEES) {
          await setDoc(doc(db, "employees", emp.id), emp);
        }
        
        await handleAddActivity(
          "System Restored",
          "System",
          "Cloud database and activity trail reset back to original seed audit profiles successfully."
        );
        setSelectedEmployeeId(null);
        alert("Database successfully reset to standard verification profiles.");
      } catch (e) {
        console.error("Failed to reset database", e);
        alert("Failed to reset database. Check console/permissions.");
      }
    }
  };

  const handleAddEmployee = async (newEmp: Employee) => {
    try {
      await setDoc(doc(db, "employees", newEmp.id), newEmp);
      setSelectedEmployeeId(newEmp.id);
      await handleAddActivity(
        "Profile Created",
        newEmp.fullName,
        `Successfully created new verification profile [ID: ${newEmp.employeeId}] for ${newEmp.fullName} (${newEmp.title})`
      );
    } catch (e) {
      console.error("Failed to add employee", e);
      alert("Failed to add employee. Check credentials/permissions.");
    }
  };

  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    try {
      await setDoc(doc(db, "employees", updatedEmp.id), updatedEmp);
    } catch (e) {
      console.error("Failed to update employee", e);
      alert("Failed to update employee. Check credentials/permissions.");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const targetEmp = employees.find(e => e.id === id);
    if (targetEmp) {
      try {
        await deleteDoc(doc(db, "employees", id));
        setSelectedEmployeeId(null);
        await handleAddActivity(
          "Profile Deleted",
          targetEmp.fullName,
          `Permanently removed profile and associated ledger data of ${targetEmp.fullName}`
        );
      } catch (e) {
        console.error("Failed to delete employee", e);
        alert("Failed to delete employee. Check credentials/permissions.");
      }
    }
  };

  const handleDeleteEmployees = async (ids: string[]) => {
    if (ids.length === 0) return;
    const confirmMsg = `Are you sure you want to permanently delete ${ids.length} selected employee profile(s) and their associated ledger data? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      let deletedCount = 0;
      for (const id of ids) {
        const targetEmp = employees.find(e => e.id === id);
        if (targetEmp) {
          await deleteDoc(doc(db, "employees", id));
          await handleAddActivity(
            "Profile Deleted",
            targetEmp.fullName,
            `Permanently removed profile and associated ledger data of ${targetEmp.fullName} (Bulk Delete)`
          );
          deletedCount++;
        }
      }
      if (ids.includes(selectedEmployeeId || "")) {
        setSelectedEmployeeId(null);
      }
      alert(`Successfully deleted ${deletedCount} employee profile(s).`);
    } catch (e) {
      console.error("Failed to bulk delete employees", e);
      alert("Failed to bulk delete some employees. Check credentials/permissions.");
    }
  };

  const handleImportSuccess = async (updatedList: Employee[]) => {
    const addedCount = updatedList.length - employees.length;
    try {
      for (const emp of updatedList) {
        await setDoc(doc(db, "employees", emp.id), emp);
      }
      await handleAddActivity(
        "Bulk CSV Imported",
        "Spreadsheet",
        `Merged and imported bulk CSV entries. Current verified profile count matching: ${updatedList.length} total. (Added ${addedCount > 0 ? addedCount : 0} items)`
      );
    } catch (e) {
      console.error("Failed to import employees", e);
      alert("Failed to import profiles. Check credentials/permissions.");
    }
  };

  const handleBatchUpdateEmployees = async (updatedList: Employee[], activityTitle: string, activityDetails: string) => {
    try {
      for (const emp of updatedList) {
        await setDoc(doc(db, "employees", emp.id), emp);
      }
      await handleAddActivity(
        activityTitle,
        "Multiple Employees",
        activityDetails
      );
    } catch (e) {
      console.error("Failed to batch update employees", e);
      throw e;
    }
  };

  const handleDownloadTemplate = () => {
    const template = getCSVTemplate();
    downloadCSV(template, "lca_payroll_import_template_standard.csv");
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Authentication loading indicator
  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-slate-300">Authorizing secure portal connection...</p>
        </div>
      </div>
    );
  }

  // Access denied screen (unauthorized email)
  if (authError === "unauthorized") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-indigo-900 pointer-events-none" />
        <div className="relative w-full max-w-md p-8 mx-4 bg-slate-950/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-xl font-bold tracking-wide text-slate-100 mb-2">Access Denied</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-xs">
            Your email address <span className="font-semibold text-indigo-400 font-mono">"{user?.email}"</span> is not whitelisted to access the Employee Database.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border border-indigo-650 active:scale-95 animate-fadeIn"
            >
              Sign Out & Try Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Security sign-in screen has precedence
  if (!user) {
    return <LoginScreen logoSrc={LOGO_SRC} />;
  }



  return (
    <div id="desktop_app_frame" className={`fixed inset-0 bg-slate-50 flex flex-col font-sans overflow-hidden text-slate-800 ${theme === "dark" ? "dark" : ""}`}>
      
      {/* 1. Global Utility Header Bar */}
      <header id="desktop_app_header" className="h-20 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between px-8 select-none relative z-10">
        
        {/* Brand identity & Logo */}
        <div className="flex items-center gap-5">
          <div className="relative group">
            <img
              id="app_header_logo"
              src={LOGO_SRC}
              alt="LGL Technologies Logo"
              className="h-12 object-contain bg-transparent shrink-0 hover:scale-102 transition-all duration-200 cursor-pointer"
              referrerPolicy="no-referrer"
              onClick={() => setSelectedEmployeeId(null)}
            />
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <button
            id="view_dashboard_nav"
            onClick={() => setSelectedEmployeeId(null)}
            className={`w-11 h-11 transition-all rounded-xl cursor-pointer flex items-center justify-center border shrink-0 ${
              selectedEmployeeId === null
                ? "bg-indigo-650 border-indigo-700 text-white shadow-md shadow-indigo-600/15"
                : "border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 hover:border-slate-300"
            }`}
            title="Go to Home / Dashboard"
          >
            <Home className="w-5 h-5" />
          </button>

          <div className="mr-2">
            <div className="flex items-center gap-2 leading-none">
              <span className="font-extrabold text-base tracking-tight font-sans flex items-center">
                <span className="text-indigo-650 font-extrabold">LGL</span> 
                <span className="text-indigo-500 font-extrabold ml-0.5">EMS</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium tracking-tight block mt-1">
              Employee Expense & LCA Dashboard
            </span>
          </div>
        </div>

        {/* Center Indicators / Active View indicator */}
        <div id="header_middle_nav" className="hidden md:flex items-center gap-2.5">
          {selectedEmployeeId && (
            <div id="active_profile_crumb" className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span>Active Employee Profile: <strong className="font-bold text-indigo-650 text-indigo-600">{selectedEmployee?.fullName}</strong></span>
            </div>
          )}
        </div>

        {/* Desk Utilities Right column list */}
        <div id="desktop_top_controls" className="flex items-center gap-3 text-xs">

          <div className="flex items-center gap-2">
            <button
              id="global_batch_collections_btn"
              onClick={() => setIsBatchRecoupOpen(true)}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 transition-all rounded-xl font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Coins className="w-4 h-4 text-indigo-600" />
              <span>Record Batch Collections</span>
            </button>

            <button
              id="bulk_import_header"
              onClick={() => setIsImportOpen(true)}
              className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white transition-all rounded-xl font-bold flex items-center gap-2 shadow-sm shadow-indigo-600/10 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Bulk Import</span>
            </button>

            <button
              id="safety_logout_header"
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-slate-850 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all rounded-lg cursor-pointer flex items-center justify-center bg-slate-50 text-slate-600 hover:text-rose-600"
              title="Sign Out of Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              id="global_theme_toggle_header"
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all rounded-lg cursor-pointer flex items-center justify-center border border-slate-200 bg-slate-50"
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 text-slate-500" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>
          </div>

        </div>

      </header>

      {/* 2. Main Desktop Layout Panel Frame */}
      <div id="desktop_app_body" className="flex-1 flex overflow-hidden bg-slate-50 relative">
        
        {employeesLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-3 border-indigo-650 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-500 font-semibold tracking-wide">Syncing records from Firestore...</p>
          </div>
        ) : (
          <>
            {/* Left Side: Unified search & listing navigator sidebar */}
            <EmployeeList
              employees={employees}
              selectedEmployeeId={selectedEmployeeId}
              onSelectEmployee={setSelectedEmployeeId}
              onAddEmployee={handleAddEmployee}
              onDeleteEmployees={handleDeleteEmployees}
              year={selectedYear}
              calculationMode={calculationMode}
            />

            {/* Right Side: Main workspace details and graphs canvas */}
            <main id="main_desktop_workspace" className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
              {selectedEmployee ? (
                /* Open dynamic specific employee card */
                <EmployeeDetailView
                  employee={selectedEmployee}
                  year={selectedYear}
                  onBackToDashboard={() => setSelectedEmployeeId(null)}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  onAddActivity={handleAddActivity}
                  layoutPreference={layoutPreference}
                  calculationMode={calculationMode}
                  onCalculationModeChange={setCalculationMode}
                />
              ) : (
                /* Root dashboard list with bento summary statistics */
                <DashboardView
                  employees={employees}
                  year={selectedYear}
                  onYearChange={setSelectedYear}
                  onSelectEmployee={setSelectedEmployeeId}
                  onUpdateEmployee={handleUpdateEmployee}
                  onBatchUpdateEmployees={handleBatchUpdateEmployees}
                  onAddActivity={handleAddActivity}
                  calculationMode={calculationMode}
                  onCalculationModeChange={setCalculationMode}
                  isBatchRecoupOpen={isBatchRecoupOpen}
                  setIsBatchRecoupOpen={setIsBatchRecoupOpen}
                />
              )}
            </main>
          </>
        )}

      </div>

      {/* 4. Collapsible Activity Report Drawer */}
      <div 
        id="audit_activities_timeline_tray"
        className={`bg-white border-t border-slate-200 transition-all duration-300 flex flex-col shrink-0 ${
          isTimelineExpanded ? "h-80" : "h-11"
        }`}
      >
        {/* Toggle Title Bar */}
        <div 
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          className="h-11 px-6 bg-slate-900 text-white flex items-center justify-between cursor-pointer select-none hover:bg-slate-850 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs font-bold font-sans uppercase tracking-wider">
              Activity Report
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              Click to {isTimelineExpanded ? "hide" : "view log report"}
            </span>
            {isTimelineExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Expanded View Content */}
        {isTimelineExpanded && (
          <div className="flex-1 flex flex-col bg-slate-50 min-h-0 overflow-hidden font-sans text-xs">
            {/* Control line */}
            <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] select-none text-slate-600">
              <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>Incremental Ledger History (Auto-logged, Chronological Trail)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Permanently wipe the activity log? This action cannot be undone.")) {
                    setActivities([
                      {
                        id: `wipe_${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        actionType: "Report Cleared",
                        employeeName: "System",
                        details: "The activity report and edit log history were manually reset."
                      }
                    ]);
                  }
                }}
                className="hover:text-rose-600 font-semibold cursor-pointer text-[10px] bg-white border border-slate-200 rounded px-2 py-0.5 transition-all text-slate-600 shadow-sm"
              >
                Clear Report
              </button>
            </div>

            {/* Search & Filters block for Feature 5 */}
            <div className="px-6 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3.5 select-none shrink-0">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search query field */}
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-450">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search details or name..."
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold placeholder:text-slate-400"
                  />
                  {timelineSearch && (
                    <button 
                      onClick={() => setTimelineSearch("")} 
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-[10px] text-slate-450 hover:text-slate-650"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter dropdown */}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <span>Action:</span>
                  <select
                    value={timelineFilter}
                    onChange={(e) => setTimelineFilter(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-150 rounded-lg text-[11px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    <option value="All">All Actions</option>
                    <option value="Created">Created</option>
                    <option value="Edited">Modified</option>
                    <option value="Deleted">Deleted / Reset</option>
                    <option value="Imported">Imports</option>
                  </select>
                </div>

                {/* Performed By dropdown */}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <span>User:</span>
                  <select
                    value={timelineAdminFilter}
                    onChange={(e) => setTimelineAdminFilter(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-150 rounded-lg text-[11px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    <option value="All">All Users</option>
                    <option value="System">System</option>
                    {uniqueAdmins.filter(adm => adm !== "System").map(admin => (
                      <option key={admin} value={admin}>{admin}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Export Logs button */}
              <button
                type="button"
                onClick={handleExportTimeline}
                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shadow-xs transition-all"
              >
                <Download className="w-3 h-3" />
                <span>Export Audit to CSV</span>
              </button>
            </div>

            {/* List panel */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 relative">
              {filteredActivities.length === 0 ? (
                <div className="text-center italic text-slate-400 py-10">
                  No registered actions matched the filter criteria.
                </div>
              ) : (
                <div className="relative border-l-2 border-indigo-100 pl-6 ml-3 space-y-4">
                  {filteredActivities.map((act) => {
                    const d = new Date(act.timestamp);
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const dd = String(d.getDate()).padStart(2, "0");
                    const yyyy = d.getFullYear();
                    const hh = String(d.getHours()).padStart(2, "0");
                    const min = String(d.getMinutes()).padStart(2, "0");
                    const ss = String(d.getSeconds()).padStart(2, "0");
                    const localTime = `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
                    
                    // Categorize colors
                    let badgeClass = "bg-slate-100 border-slate-200 text-slate-700";
                    if (act.actionType.includes("Created") || act.actionType.includes("Logged") || act.actionType.includes("Added")) {
                      badgeClass = "bg-emerald-50 border-emerald-155/30 text-emerald-700";
                    } else if (act.actionType.includes("Edited") || act.actionType.includes("Updated") || act.actionType.includes("Modified")) {
                      badgeClass = "bg-indigo-50 border-indigo-155/30 text-indigo-700";
                    } else if (act.actionType.includes("Deleted") || act.actionType.includes("Cleared") || act.actionType.includes("Removed")) {
                      badgeClass = "bg-rose-50 border-rose-155/30 text-rose-700";
                    } else if (act.actionType.includes("Imported")) {
                      badgeClass = "bg-purple-50 border-purple-155/30 text-purple-700";
                    }

                    return (
                      <div key={act.id} className="relative group select-text">
                        {/* Bullet circle dot */}
                        <span className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-indigo-400 bg-white group-hover:scale-110 transition-transform flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        </span>

                        {/* Event Content Cards */}
                        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-200 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-100 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded ${badgeClass}`}>
                                {act.actionType}
                              </span>
                              {act.employeeName !== "System" && act.employeeName !== "Database" && act.employeeName !== "Spreadsheet" && (
                                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-400 inline" />
                                  <span>{act.employeeName}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{localTime}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed select-text">
                            {act.details}
                          </p>
                          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-semibold select-none">
                            <span>User: {act.adminEmail || "System"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bulk CSV import alignment modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        employees={employees}
        onImportComplete={handleImportSuccess}
      />

      <BatchCollectionsModal
        isOpen={isBatchRecoupOpen}
        onClose={() => setIsBatchRecoupOpen(false)}
        employees={employees}
        year={selectedYear}
        onBatchSave={handleBatchUpdateEmployees}
      />



    </div>
  );
}
