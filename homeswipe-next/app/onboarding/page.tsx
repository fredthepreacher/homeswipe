"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, ArrowLeft, Home, Briefcase, Building,
  Hash, MapPin, Map, FileText,
} from "lucide-react";
import { HomeSwipeLogo } from "@/components/HomeSwipeLogo";

type Role = "consumer" | "broker" | "landlord";
type StepName = "role" | "form";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const inputCls =
  "w-full bg-muted border border-border rounded-xl px-4 py-3.5 pl-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition";
const selectCls =
  "w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition appearance-none";

const ROLES: { id: Role; icon: React.ElementType; title: string; subtitle: string }[] = [
  { id: "consumer", icon: Home,      title: "Renter / Buyer", subtitle: "Swipe through listings, save favorites, and find your perfect home." },
  { id: "broker",   icon: Briefcase, title: "Broker",         subtitle: "Licensed real estate professional. List properties and connect with clients." },
  { id: "landlord", icon: Building,  title: "Landlord",       subtitle: "Property owner or manager. Post rentals and manage tenant inquiries." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();

  const [step, setStep] = useState<StepName>("role");
  const [role, setRole] = useState<Role>("consumer");

  const [licenseId, setLicenseId]           = useState("");
  const [licenseState, setLicenseState]     = useState("");
  const [brokerage, setBrokerage]           = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function validateProfessional(): string {
    if (role === "broker") {
      if (!licenseId.trim())       return "Broker license ID is required.";
      if (!licenseState)           return "State of licensure is required.";
      if (!brokerage.trim())       return "Associated brokerage is required.";
      if (!businessAddress.trim()) return "Business address is required.";
    }
    if (role === "landlord") {
      if (!licenseState)           return "State of operation is required.";
      if (!brokerage.trim())       return "Company / business name is required.";
      if (!businessAddress.trim()) return "Business address is required.";
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const profError = validateProfessional();
    if (profError) { setError(profError); return; }

    setLoading(true);
    try {
      const body: Record<string, unknown> = { role };
      if (role === "broker" || role === "landlord") {
        if (licenseId)       body.licenseId       = licenseId.trim();
        if (licenseState)    body.licenseState     = licenseState;
        if (brokerage)       body.brokerage        = brokerage.trim();
        if (businessAddress) body.businessAddress  = businessAddress.trim();
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Onboarding failed");
      }

      // Refresh Clerk session so publicMetadata.role is up to date client-side
      await user?.reload();

      router.push(role === "consumer" ? "/" : "/broker");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── ROLE SELECTION ── */
  if (step === "role") {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-10 overflow-y-auto max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col flex-1"
        >
          <div className="mb-8">
            <HomeSwipeLogo className="text-3xl mb-4" />
            <h2 className="text-2xl font-bold mb-1">How will you use HomeSwipe?</h2>
            <p className="text-muted-foreground text-sm">Choose your account type to get started.</p>
          </div>

          <div className="flex flex-col gap-3 mb-8">
            {ROLES.map(({ id, icon: Icon, title, subtitle }) => {
              const active = role === id;
              return (
                <motion.button key={id} whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-bold">{title}</span>
                      {active && (
                        <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <motion.button whileTap={{ scale: 0.98 }}
            onClick={() => (role === "consumer" ? handleSubmit(new Event("submit") as unknown as React.FormEvent) : setStep("form"))}
            disabled={loading}
            className="w-full bg-primary text-white font-semibold rounded-2xl py-4 hover:bg-primary/90 transition disabled:opacity-60"
          >
            Continue as {ROLES.find((r) => r.id === role)?.title}
          </motion.button>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2.5 rounded-xl mt-4">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  /* ── PROFESSIONAL FORM ── */
  const roleInfo = ROLES.find((r) => r.id === role)!;

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-10 pb-10 overflow-y-auto max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col flex-1"
      >
        <button onClick={() => { setStep("role"); setError(""); }}
          className="flex items-center gap-1.5 text-muted-foreground mb-7 w-fit hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Change account type</span>
        </button>

        <div className="mb-6">
          <HomeSwipeLogo className="text-2xl mb-3" />
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
            <roleInfo.icon className="w-3 h-3" />
            {roleInfo.title}
          </div>
          <p className="text-muted-foreground text-sm mt-2">Create your professional account below.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              {role === "broker" ? "License & Brokerage" : "Property Info"}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {role === "broker" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Broker License ID <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input type="text" placeholder="e.g. BRE-1234567"
                  value={licenseId} onChange={(e) => setLicenseId(e.target.value)} className={inputCls} />
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              {role === "broker" ? "State of Licensure" : "State of Operation"} <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <select value={licenseState} onChange={(e) => setLicenseState(e.target.value)} className={`${selectCls} pl-10`}>
                <option value="">Select state…</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              {role === "broker" ? "Associated Brokerage" : "Company / Business Name"} <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input type="text"
                placeholder={role === "broker" ? "e.g. Coldwell Banker" : "e.g. Skyline Properties LLC"}
                value={brokerage} onChange={(e) => setBrokerage(e.target.value)} className={inputCls} />
              <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Business Address <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input type="text" placeholder="123 Main St, City, State 00000"
                value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className={inputCls} />
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2.5 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
            className="w-full bg-primary text-white font-semibold rounded-2xl py-4 mt-1 hover:bg-primary/90 transition disabled:opacity-60"
          >
            {loading ? "Finishing…" : "Complete Setup"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
