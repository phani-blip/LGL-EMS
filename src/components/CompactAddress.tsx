import React from "react";

interface CompactAddressProps {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  fallback?: string;
}

export const CompactAddress: React.FC<CompactAddressProps> = ({
  address1,
  address2,
  city,
  state,
  zip,
  fallback,
}) => {
  const parts: string[] = [];

  if (address1?.trim()) {
    parts.push(address1.trim());
  }
  if (address2?.trim()) {
    parts.push(address2.trim());
  }
  if (city?.trim()) {
    parts.push(city.trim());
  }
  if (state?.trim()) {
    parts.push(state.trim());
  }
  if (zip?.trim()) {
    parts.push(zip.trim());
  }

  const output = parts.length > 0 ? parts.join(", ") : (fallback || "").trim();

  if (!output) {
    return <span className="text-slate-400 italic">No address provided</span>;
  }

  return <span>{output}</span>;
};
