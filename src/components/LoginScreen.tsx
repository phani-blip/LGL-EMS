/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowRight 
} from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth } from "../firebase";

interface LoginScreenProps {
  logoSrc?: string;
}

export default function LoginScreen({ logoSrc }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (isRegistering) {
        // Register user with Firebase
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg("Account created! Please wait while we check your access permissions...");
      } else {
        // Sign in user with Firebase
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg("Sign in successful! Connecting to portal...");
      }
    } catch (err: any) {
      console.error("Firebase auth error:", err);
      let message = "An error occurred. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        message = "This email is already registered. Please sign in instead.";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        message = "Incorrect email or password. Please try again.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email format.";
      } else if (err.code === "auth/weak-password") {
        message = "Password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many login attempts. Please try again later.";
      }
      setErrorMsg(message);
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  return (
    <div id="login_screen_container" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-indigo-900 pointer-events-none" />
      
      <div id="login_card" className="relative w-full max-w-md p-8 mx-4 bg-slate-950/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl flex flex-col items-center transition-all duration-300">
        
        {/* Logo Display */}
        {logoSrc ? (
          <img
            id="company_logo_login"
            src={logoSrc}
            alt="LGL Technologies Logo"
            className="h-14 w-auto max-w-[260px] mb-4 object-contain bg-transparent"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div id="fallback_logo_login" className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
        )}

        <h1 id="app_title_login" className="text-xl font-bold tracking-wide text-slate-100">
          LGL EMS
        </h1>
        <p id="app_subtitle_login" className="text-xs text-slate-400 mt-1 mb-6 uppercase tracking-wider font-mono">
          Internal Expense & LCA Management System
        </p>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <h2 id="login_flow_heading" className="text-base font-semibold text-slate-200 text-center mb-2">
            {isRegistering ? "Register Company Account" : "Secure Portal Sign-In"}
          </h2>

          {/* Email input field */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Company Email</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="email"
                placeholder="yourname@lgltechnologies.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold"
                required
              />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Password</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono font-bold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                title="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password input field (Registration only) */}
          {isRegistering && (
            <div className="space-y-1 transition-all duration-200">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Confirm Password</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono font-bold"
                  required={isRegistering}
                />
              </div>
            </div>
          )}

          {/* Error and Success alerts */}
          {errorMsg && (
            <div id="login_error_banner" className="flex items-start gap-2.5 text-rose-400 text-xs font-semibold bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div id="login_success_banner" className="flex items-start gap-2.5 text-emerald-400 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            id="login_submit_btn"
            disabled={loading}
            className={`w-full py-3 rounded-xl mt-4 font-bold text-sm border flex items-center justify-center gap-2 cursor-pointer transition-all ${
              loading
                ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 hover:border-indigo-800 hover:shadow-lg hover:shadow-indigo-650/15 text-white border-indigo-650 active:scale-98"
            }`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin" />
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Company Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Authorize Login</span>
              </>
            )}
          </button>
        </form>

        {/* Navigation toggles */}
        <div id="login_toggle_action" className="mt-6 flex flex-col items-center gap-2 text-xs font-mono text-slate-400">
          <div>
            {isRegistering ? "Already have an account?" : "Need portal credentials?"}{" "}
            <button
              id="toggle_login_mode"
              onClick={toggleMode}
              disabled={loading}
              className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors underline cursor-pointer disabled:opacity-50"
            >
              {isRegistering ? "Sign In" : "Register Account"}
            </button>
          </div>
          <div className="text-[10px] text-slate-500 text-center mt-2 px-4">
            Security Notice: Only whitelisted email addresses registered in the LGL administrator console can access employee database records.
          </div>
        </div>

      </div>
    </div>
  );
}
