/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  KeyRound, 
  LogOut, 
  RefreshCw,
  ArrowRight 
} from "lucide-react";

interface TwoFactorScreenProps {
  userEmail: string;
  correctCode: string;
  onVerifySuccess: () => void;
  onResendCode: () => void;
  onCancel: () => void;
  logoSrc?: string;
}

export default function TwoFactorScreen({
  userEmail,
  correctCode,
  onVerifySuccess,
  onResendCode,
  onCancel,
  logoSrc,
}: TwoFactorScreenProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [resendCountdown, setResendCountdown] = useState<number>(30);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Count down resend timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Auto focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const handleChange = (index: number, val: string) => {
    // Only accept numeric inputs
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    const char = cleanVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto advance focus to the next field if filled
    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Clear previous and focus it
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasteData)) return; // verify 6 digits

    const newDigits = pasteData.split("");
    setDigits(newDigits);
    inputRefs.current[5]?.focus();
  };

  // Perform validation check
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const enteredCode = digits.join("");
    if (enteredCode.length < 6) {
      setErrorMsg("Please enter all 6 digits.");
      return;
    }

    setLoading(true);

    // Simulate database network check latency
    setTimeout(() => {
      if (enteredCode === correctCode) {
        setSuccessMsg("Access verification approved! Redirecting...");
        setTimeout(() => {
          onVerifySuccess();
        }, 1000);
      } else {
        setErrorMsg("Incorrect authentication code. Please check and try again.");
        setDigits(Array(6).fill(""));
        inputRefs.current[0]?.focus();
        setLoading(false);
      }
    }, 800);
  };

  // Trigger verify automatically once 6th digit is typed
  useEffect(() => {
    if (digits.every(d => d !== "")) {
      handleVerify();
    }
  }, [digits]);

  const handleResend = () => {
    if (resendCountdown > 0) return;
    setDigits(Array(6).fill(""));
    setErrorMsg("");
    setSuccessMsg("");
    setResendCountdown(30);
    onResendCode();
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  return (
    <div id="two_factor_container" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white font-sans select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/30 via-slate-950 to-indigo-900 pointer-events-none" />

      <div id="two_factor_card" className="relative w-full max-w-md p-8 mx-4 bg-slate-950/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl flex flex-col items-center transition-all duration-300">
        
        {/* Logo Display */}
        {logoSrc ? (
          <img
            id="company_logo_2fa"
            src={logoSrc}
            alt="LGL Technologies Logo"
            className="h-14 w-auto max-w-[260px] mb-4 object-contain bg-transparent"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div id="fallback_logo_2fa" className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-pulse">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
        )}

        <h1 id="app_title_2fa" className="text-xl font-bold tracking-wide text-slate-100">
          LGL EMS
        </h1>
        <p id="app_subtitle_2fa" className="text-xs text-slate-400 mt-1 mb-6 uppercase tracking-wider font-mono">
          Security Gate Authorization
        </p>

        <form onSubmit={handleVerify} className="w-full space-y-5 flex flex-col items-center">
          <div className="text-center space-y-1.5">
            <h2 className="text-sm font-bold text-slate-200">
              Two-Factor Authentication
            </h2>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs select-text">
              We've dispatched a 6-digit verification code to: <br/>
              <span className="font-semibold text-indigo-400 font-mono text-[11.5px] select-all">{userEmail}</span>
            </p>
          </div>

          {/* 6-Digit input boxes */}
          <div className="flex justify-center gap-2.5 my-2 w-full">
            {digits.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={digit}
                disabled={loading}
                ref={el => { inputRefs.current[index] = el; }}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-11 h-12 bg-slate-900 border border-slate-800 rounded-xl text-center font-mono font-black text-lg text-white placeholder:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-40 transition-all shadow-inner shadow-black/25"
                placeholder="•"
                required
              />
            ))}
          </div>

          {/* Error and Success alerts */}
          {errorMsg && (
            <div id="2fa_error_banner" className="w-full flex items-start gap-2.5 text-rose-455 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-[11px] font-semibold text-rose-400 select-text">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div id="2fa_success_banner" className="w-full flex items-start gap-2.5 text-emerald-455 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-[11px] font-semibold text-emerald-400 select-text">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Verification execution action */}
          <button
            type="submit"
            id="verify_code_submit_btn"
            disabled={loading || digits.some(d => d === "")}
            className={`w-full py-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 cursor-pointer transition-all ${
              loading || digits.some(d => d === "")
                ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-indigo-600 hover:bg-indigo-700 hover:border-indigo-800 hover:shadow-lg hover:shadow-indigo-650/15 text-white border-indigo-650 active:scale-98"
            }`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Verify Access Token</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Resend and Cancel layout links */}
        <div id="2fa_links" className="mt-6 flex flex-col items-center gap-3 text-[11px] font-mono select-none">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCountdown > 0 || loading}
            className={`flex items-center gap-1.5 ${
              resendCountdown > 0 || loading
                ? "text-slate-500 cursor-not-allowed"
                : "text-indigo-400 font-bold hover:text-indigo-300 underline cursor-pointer"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {resendCountdown > 0 ? (
              <span>Resend code in {resendCountdown}s</span>
            ) : (
              <span>Resend Verification Code</span>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors underline cursor-pointer disabled:opacity-50 mt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cancel Sign-In / Log Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
