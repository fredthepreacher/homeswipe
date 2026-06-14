import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Mail, Phone, User, Fingerprint,
  AlertCircle, CheckCircle2, ArrowLeft, Home, Briefcase, Building,
  Hash, MapPin, Map, FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/auth-api";
import { useWebAuthn } from "@/hooks/use-webauthn";
import { HomeSweepLogo } from "@/components/HomeSweepLogo";

type Tab       = "email" | "phone";
type Role      = "consumer" | "broker" | "landlord";
type StepName  = "role" | "form" | "biometric";

/* ── US state codes ─────────────────────────────────────── */
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

/* ── Shared input style ─────────────────────────────────── */
const inputCls =
  "w-full bg-muted border border-border rounded-xl px-4 py-3.5 pl-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition";

const selectCls =
  "w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition appearance-none";

/* ── Role card data ─────────────────────────────────────── */
const ROLES: { id: Role; icon: React.ElementType; title: string; subtitle: string }[] = [
  {
    id: "consumer",
    icon: Home,
    title: "Renter / Buyer",
    subtitle: "Swipe through listings, save favorites, and find your perfect home.",
  },
  {
    id: "broker",
    icon: Briefcase,
    title: "Broker",
    subtitle: "Licensed real estate professional. List properties and connect with clients.",
  },
  {
    id: "landlord",
    icon: Building,
    title: "Landlord",
    subtitle: "Property owner or manager. Post rentals and manage tenant inquiries.",
  },
];

/* ════════════════════════════════════════════════════════ */
export default function SignUp() {
  const [, navigate] = useLocation();
  const { login }    = useAuth();
  const { isSupported, register } = useWebAuthn();

  /* step state */
  const [step, setStep] = useState<StepName>("role");
  const [role, setRole] = useState<Role>("consumer");

  /* form state */
  const [tab, setTab]               = useState<Tab>("email");
  const [name, setName]             = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* professional fields */
  const [licenseId, setLicenseId]           = useState("");
  const [licenseState, setLicenseState]     = useState("");
  const [brokerage, setBrokerage]           = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  /* status */
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  /* biometric step */
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricDone, setBiometricDone]       = useState(false);
  const [loggedInToken, setLoggedInToken]       = useState("");
  const [loggedInUserId, setLoggedInUserId]     = useState(0);
  const [loggedInName, setLoggedInName]         = useState("");

  /* ── validation ─────────────────────────────────────── */
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

  /* ── submit ─────────────────────────────────────────── */
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }

    const profError = validateProfessional();
    if (profError) { setError(profError); return; }

    setLoading(true);
    try {
      const body: Record<string, any> = { name, password, role };
      if (tab === "email") body.email = identifier;
      else body.phone = identifier.replace(/\D/g, "");

      if (role === "broker" || role === "landlord") {
        if (licenseId)       body.licenseId       = licenseId.trim();
        if (licenseState)    body.licenseState     = licenseState;
        if (brokerage)       body.brokerage        = brokerage.trim();
        if (businessAddress) body.businessAddress  = businessAddress.trim();
      }

      const { token: t, user: u } = await authApi.register(body);
      setLoggedInToken(t);
      setLoggedInUserId(u.id);
      setLoggedInName(u.name);

      if (isSupported) {
        setStep("biometric");
        login(t, u);
      } else {
        login(t, u);
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricSetup() {
    setBiometricLoading(true);
    setError("");
    try {
      const credentialId = await register(loggedInUserId, loggedInName);
      await authApi.webauthnRegisterCredential(credentialId, loggedInToken);
      localStorage.setItem("homesweep_webauthn_id", credentialId);
      setBiometricDone(true);
      setTimeout(() => navigate("/"), 1200);
    } catch (err: any) {
      setError(err.message || "Biometric setup failed.");
    } finally {
      setBiometricLoading(false);
    }
  }

  /* ════════════════════════════════════════════════════════
     BIOMETRIC STEP
  ════════════════════════════════════════════════════════ */
  if (step === "biometric") {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center gap-5 w-full max-w-sm"
        >
          {biometricDone ? (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h2 className="text-xl font-bold">All set!</h2>
              <p className="text-muted-foreground text-sm">Face ID enabled. Taking you home…</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Fingerprint className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Enable Face ID?</h2>
              <p className="text-muted-foreground text-sm">
                Use your face or fingerprint to sign in instantly — no password needed next time.
              </p>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2.5 rounded-xl w-full text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleBiometricSetup}
                disabled={biometricLoading}
                className="w-full bg-primary text-white font-semibold rounded-2xl py-4 hover:bg-primary/90 transition disabled:opacity-60"
              >
                {biometricLoading ? "Setting up…" : "Enable Face ID / Fingerprint"}
              </motion.button>
              <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:underline">
                Skip for now
              </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     ROLE SELECTION STEP
  ════════════════════════════════════════════════════════ */
  if (step === "role") {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col flex-1"
        >
          <button onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-muted-foreground mb-8 w-fit hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to login</span>
          </button>

          <div className="mb-8">
            <HomeSweepLogo className="text-3xl mb-4" />
            <h2 className="text-2xl font-bold mb-1">How will you use HomeSweep?</h2>
            <p className="text-muted-foreground text-sm">Choose your account type to get started.</p>
          </div>

          <div className="flex flex-col gap-3 mb-8">
            {ROLES.map(({ id, icon: Icon, title, subtitle }) => {
              const active = role === id;
              return (
                <motion.button key={id} whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:bg-muted"
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
            onClick={() => setStep("form")}
            className="w-full bg-primary text-white font-semibold rounded-2xl py-4 hover:bg-primary/90 transition"
          >
            Continue as {ROLES.find((r) => r.id === role)?.title}
          </motion.button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-primary font-medium hover:underline">
              Sign in
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     FORM STEP
  ════════════════════════════════════════════════════════ */
  const isProfessional = role === "broker" || role === "landlord";
  const roleInfo = ROLES.find((r) => r.id === role)!;

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-10 pb-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col flex-1"
      >
        {/* Back */}
        <button onClick={() => { setStep("role"); setError(""); }}
          className="flex items-center gap-1.5 text-muted-foreground mb-7 w-fit hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Change account type</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <HomeSweepLogo className="text-2xl mb-3" />
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
            <roleInfo.icon className="w-3 h-3" />
            {roleInfo.title}
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            {isProfessional
              ? "Create your professional account below."
              : "Create your account to start swiping."}
          </p>
        </div>

        {/* Email / Phone tabs */}
        <div className="flex bg-muted rounded-xl p-1 mb-5">
          {(["email", "phone"] as Tab[]).map((t) => (
            <button key={t}
              onClick={() => { setTab(t); setIdentifier(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "email" ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
              {t === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">

          {/* ── Account fields ── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Full name
            </label>
            <div className="relative">
              <input type="text" placeholder="Jane Smith" value={name}
                onChange={(e) => setName(e.target.value)} required
                className={inputCls}
              />
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              {tab === "email" ? "Email address" : "Phone number"}
            </label>
            <div className="relative">
              <input
                type={tab === "email" ? "email" : "tel"}
                placeholder={tab === "email" ? "you@example.com" : "+1 (555) 000-0000"}
                value={identifier} onChange={(e) => setIdentifier(e.target.value)} required
                className={inputCls}
              />
              {tab === "email"
                ? <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                : <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              }
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} placeholder="Min. 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Confirm password
            </label>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} placeholder="••••••••"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ── Professional fields (broker / landlord only) ── */}
          {isProfessional && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 pt-2"
            >
              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                  {role === "broker" ? "License & Brokerage" : "Property Info"}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Broker license ID — broker only */}
              {role === "broker" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Broker License ID <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input type="text" placeholder="e.g. BRE-1234567"
                      value={licenseId} onChange={(e) => setLicenseId(e.target.value)}
                      className={inputCls}
                    />
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* State of licensure / operation */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  {role === "broker" ? "State of Licensure" : "State of Operation"}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select value={licenseState} onChange={(e) => setLicenseState(e.target.value)}
                    className={`${selectCls} pl-10`}
                  >
                    <option value="">Select state…</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Brokerage / company name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  {role === "broker" ? "Associated Brokerage" : "Company / Business Name"}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input type="text"
                    placeholder={role === "broker" ? "e.g. Coldwell Banker" : "e.g. Skyline Properties LLC"}
                    value={brokerage} onChange={(e) => setBrokerage(e.target.value)}
                    className={inputCls}
                  />
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Business address */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Business Address <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input type="text" placeholder="123 Main St, City, State 00000"
                    value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)}
                    className={inputCls}
                  />
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Error */}
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

          {/* Submit */}
          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
            className="w-full bg-primary text-white font-semibold rounded-2xl py-4 mt-1 hover:bg-primary/90 transition disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create Account"}
          </motion.button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-primary font-medium hover:underline">
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
