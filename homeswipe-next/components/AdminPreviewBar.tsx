"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePreview, type PreviewRole } from "@/context/PreviewContext";
import { X, Home, Briefcase, Building2, AlertCircle, ChevronDown } from "lucide-react";

const ROLES: { role: PreviewRole; label: string; short: string; Icon: React.ElementType; color: string; home: string }[] = [
  { role: "consumer", label: "Renter / Buyer", short: "Renter",   Icon: Home,      color: "text-sky-300 bg-sky-500/20",     home: "/"       },
  { role: "broker",   label: "Broker",         short: "Broker",   Icon: Briefcase, color: "text-emerald-300 bg-emerald-500/20", home: "/broker" },
  { role: "landlord", label: "Landlord",       short: "Landlord", Icon: Building2, color: "text-amber-300 bg-amber-500/20", home: "/broker" },
];

const BAR_COLORS: Record<NonNullable<PreviewRole>, string> = {
  consumer: "from-sky-900/95 to-gray-900/95 border-sky-700/50",
  broker:   "from-emerald-900/95 to-gray-900/95 border-emerald-700/50",
  landlord: "from-amber-900/95 to-gray-900/95 border-amber-700/50",
};

export function AdminPreviewBar() {
  const { previewRole, setPreviewRole, exitPreview, blockedCount } = usePreview();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  if (!previewRole) return null;

  const current = ROLES.find((r) => r.role === previewRole)!;
  const others  = ROLES.filter((r) => r.role !== previewRole);

  function handleSwitch(r: typeof ROLES[0]) {
    setPreviewRole(r.role);
    router.push(r.home);
    setSwitching(false);
  }

  function handleExit() {
    exitPreview();
    router.push("/admin");
  }

  return (
    <div className={`relative z-50 bg-gradient-to-r border-b backdrop-blur-sm ${BAR_COLORS[previewRole]}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${current.color}`}>
          <current.Icon className="w-3 h-3" />
          <span className="hidden xs:inline">Preview: </span>{current.short}
        </div>

        {blockedCount > 0 && (
          <div className="flex items-center gap-1 text-amber-400 text-[10px] font-medium">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{blockedCount} blocked</span>
          </div>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setSwitching((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 text-xs font-semibold transition"
        >
          Switch <ChevronDown className={`w-3 h-3 transition-transform ${switching ? "rotate-180" : ""}`} />
        </button>

        <button
          onClick={handleExit}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white/80 hover:bg-red-500/30 hover:text-red-300 text-xs font-semibold transition"
        >
          <X className="w-3 h-3" />
          <span className="hidden xs:inline">Exit</span>
        </button>
      </div>

      {switching && (
        <div className="absolute top-full left-0 right-0 bg-gray-900/98 border-b border-gray-700 px-3 py-2.5 flex gap-2 z-50 shadow-xl">
          <p className="sr-only">Switch preview role</p>
          {others.map((r) => (
            <button
              key={r.role}
              onClick={() => handleSwitch(r)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${r.color} hover:opacity-80`}
            >
              <r.Icon className="w-3.5 h-3.5" />
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div className="px-3 pb-1.5 flex items-center gap-1">
        <span className="text-[10px] text-white/30 font-medium">
          Read-only preview · writes are intercepted · logout will end session
        </span>
      </div>
    </div>
  );
}
