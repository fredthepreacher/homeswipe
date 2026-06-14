import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Fingerprint, Mail, Phone, AlertCircle, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/auth-api";
import { useWebAuthn } from "@/hooks/use-webauthn";
import { HomeSweepLogo } from "@/components/HomeSweepLogo";

type Tab = "email" | "phone";

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.7 0 261 0 151.1c0-189.7 123.4-290 244.7-290 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function SocialButton({
  onClick,
  logo,
  label,
  bgClass,
  textClass,
  borderClass,
}: {
  onClick: () => void;
  logo: React.ReactNode;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-3 font-semibold rounded-2xl py-3.5 transition-all text-sm ${bgClass} ${textClass} ${borderClass ?? ""}`}
    >
      {logo}
      {label}
    </motion.button>
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { isSupported, authenticate } = useWebAuthn();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [tab, setTab] = useState<Tab>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [socialMsg, setSocialMsg] = useState("");

  const storedCredentialId = localStorage.getItem("homesweep_webauthn_id");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const id = tab === "phone" && !identifier.includes("@")
        ? identifier.replace(/\D/g, "")
        : identifier;
      const { token, user } = await authApi.login(id, password);
      login(token, user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleFaceLogin() {
    if (!storedCredentialId) return;
    setBiometricLoading(true);
    setError("");
    setSocialMsg("");
    try {
      const credentialId = await authenticate(storedCredentialId);
      const { token, user } = await authApi.webauthnLogin(credentialId);
      login(token, user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Face ID login failed");
    } finally {
      setBiometricLoading(false);
    }
  }

  function handleSocial(provider: string) {
    setSocialMsg(`${provider} login is coming soon. Please use email or phone for now.`);
    setError("");
    setTimeout(() => setSocialMsg(""), 4000);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-14 pb-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col flex-1"
      >
        {/* Logo */}
        <div className="mb-9">
          <HomeSweepLogo className="text-3xl mb-2" />
          <p className="text-muted-foreground text-sm">Find your perfect home, one swipe at a time.</p>
        </div>

        {/* Face ID — only shown if already registered */}
        {isSupported && storedCredentialId && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleFaceLogin}
            disabled={biometricLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-primary/10 border border-primary/20 text-primary font-semibold rounded-2xl py-3.5 mb-4 transition-all hover:bg-primary/15 disabled:opacity-60 text-sm"
          >
            <Fingerprint className="w-4.5 h-4.5" />
            {biometricLoading ? "Verifying…" : "Continue with Face ID / Fingerprint"}
          </motion.button>
        )}

        {/* Social login buttons */}
        <div className="flex flex-col gap-3 mb-5">
          <SocialButton
            onClick={() => handleSocial("Google")}
            logo={<GoogleLogo />}
            label="Continue with Google"
            bgClass="bg-white hover:bg-gray-50 border border-gray-200 shadow-sm"
            textClass="text-gray-700"
          />
          <SocialButton
            onClick={() => handleSocial("Apple")}
            logo={<AppleLogo />}
            label="Continue with Apple"
            bgClass="bg-black hover:bg-neutral-800"
            textClass="text-white"
          />
          <SocialButton
            onClick={() => handleSocial("Facebook")}
            logo={<FacebookLogo />}
            label="Continue with Facebook"
            bgClass="bg-[#1877F2] hover:bg-[#1565d8]"
            textClass="text-white"
          />
        </div>

        {/* Social message */}
        <AnimatePresence>
          {socialMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 text-sm bg-muted border border-border text-foreground px-3 py-2.5 rounded-xl mb-4"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
              {socialMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email / Phone toggle */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => setShowEmailForm((v) => !v)}
          className="w-full flex items-center justify-center gap-2 border border-border rounded-2xl py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition mb-1"
        >
          <Mail className="w-4 h-4 text-muted-foreground" />
          Continue with Email or Phone
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showEmailForm ? "rotate-180" : ""}`}
          />
        </motion.button>

        {/* Collapsible email/phone form */}
        <AnimatePresence initial={false}>
          {showEmailForm && (
            <motion.div
              key="email-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-4 flex flex-col gap-4">
                {/* Tab switcher */}
                <div className="flex bg-muted rounded-xl p-1">
                  {(["email", "phone"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTab(t); setIdentifier(""); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        tab === t
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      {t === "email"
                        ? <Mail className="w-3.5 h-3.5" />
                        : <Phone className="w-3.5 h-3.5" />}
                      {t === "email" ? "Email" : "Phone"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      {tab === "email" ? "Email address" : "Phone number"}
                    </label>
                    <input
                      type={tab === "email" ? "email" : "tel"}
                      placeholder={tab === "email" ? "you@example.com" : "+1 (555) 000-0000"}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      autoComplete={tab === "email" ? "email" : "tel"}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => navigate("/forgot-password")}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 pr-11 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2.5 rounded-xl"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white font-semibold rounded-2xl py-4 hover:bg-primary/90 transition disabled:opacity-60"
                  >
                    {loading ? "Signing in…" : "Sign In"}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => navigate("/signup")}
            className="text-primary font-medium hover:underline"
          >
            Create account
          </button>
        </p>
      </motion.div>
    </div>
  );
}
