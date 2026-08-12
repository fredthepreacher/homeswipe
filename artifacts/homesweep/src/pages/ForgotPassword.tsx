import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, Phone, ArrowLeft, AlertCircle, CheckCircle2, SendHorizonal } from "lucide-react";
import { authApi } from "@/lib/auth-api";
import { HomeSwipeLogo } from "@/components/HomeSwipeLogo";

type Tab = "email" | "phone";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("email");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(identifier);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 pt-12 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col flex-1"
      >
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-1.5 text-muted-foreground mb-8 w-fit hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to login</span>
        </button>

        <div className="mb-8">
          <HomeSwipeLogo className="text-3xl mb-3" />
        </div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center gap-5 flex-1 justify-center"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Check your inbox</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-medium text-foreground">{identifier}</span>.
                Check your {tab === "email" ? "email" : "messages"} and follow the instructions.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-primary text-white font-semibold rounded-2xl py-4 hover:bg-primary/90 transition"
            >
              Back to Login
            </button>
            <button
              onClick={() => { setSent(false); setIdentifier(""); }}
              className="text-sm text-muted-foreground hover:underline"
            >
              Try a different {tab === "email" ? "email" : "phone number"}
            </button>
          </motion.div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Forgot your password?</h2>
              <p className="text-muted-foreground text-sm">
                Enter your {tab === "email" ? "email" : "phone number"} and we&apos;ll send you a link to reset it.
              </p>
            </div>

            <div className="flex bg-muted rounded-xl p-1 mb-5">
              {(["email", "phone"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setIdentifier(""); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {t === "email" ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                  {t === "email" ? "Email" : "Phone"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
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
                className="w-full bg-primary text-white font-semibold rounded-2xl py-4 mt-1 flex items-center justify-center gap-2 hover:bg-primary/90 transition disabled:opacity-60"
              >
                <SendHorizonal className="w-4 h-4" />
                {loading ? "Sending…" : "Send Reset Link"}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
