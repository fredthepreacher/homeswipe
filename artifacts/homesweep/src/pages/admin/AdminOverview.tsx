import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreview } from "@/context/PreviewContext";
import { useLocation } from "wouter";
import { adminApi, type AdminStats, type AuditLog } from "@/lib/admin-api";
import {
  Users, Building2, MessageSquare, Zap, RefreshCw,
  UserPlus, LogIn, Plus, Trash2, Send, ShieldCheck, Clock,
  Home, Briefcase, Eye
} from "lucide-react";

const POLL_INTERVAL = 15_000;

type SideFilter = "all" | "consumer" | "broker";

function actionIcon(action: string) {
  if (action === "user.registered") return <UserPlus className="w-3.5 h-3.5" />;
  if (action === "user.login")      return <LogIn className="w-3.5 h-3.5" />;
  if (action === "listing.created") return <Plus className="w-3.5 h-3.5" />;
  if (action === "listing.deleted") return <Trash2 className="w-3.5 h-3.5" />;
  if (action === "inquiry.submitted") return <Send className="w-3.5 h-3.5" />;
  if (action === "admin.login")     return <ShieldCheck className="w-3.5 h-3.5" />;
  return <Zap className="w-3.5 h-3.5" />;
}

function actionColor(action: string): string {
  if (action.startsWith("user."))     return "bg-blue-500/20 text-blue-400";
  if (action === "listing.created")   return "bg-emerald-500/20 text-emerald-400";
  if (action === "listing.deleted")   return "bg-red-500/20 text-red-400";
  if (action === "inquiry.submitted") return "bg-amber-500/20 text-amber-400";
  if (action === "admin.login")       return "bg-indigo-500/20 text-indigo-400";
  return "bg-gray-500/20 text-gray-400";
}

function actionLabel(log: AuditLog): string {
  const who = log.userName ?? log.details?.email ?? "Unknown";
  switch (log.action) {
    case "user.registered":   return `${who} signed up as ${log.details?.role ?? "user"}`;
    case "user.login":        return `${who} logged in`;
    case "listing.created":   return `${who} listed ${log.details?.address ?? "a property"}`;
    case "listing.deleted":   return `${who} removed "${log.details?.address ?? "a listing"}"`;
    case "inquiry.submitted": return `${log.details?.name ?? "Someone"} inquired about listing #${log.details?.listingId}`;
    case "admin.login":       return `Admin ${who} accessed the dashboard`;
    default:                  return log.action;
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SIDE_ACTIONS: Record<SideFilter, string[]> = {
  all:      [],
  consumer: ["user.login", "user.registered", "inquiry.submitted"],
  broker:   ["listing.created", "listing.deleted"],
};

function matchesSide(log: AuditLog, side: SideFilter): boolean {
  if (side === "all") return true;
  return SIDE_ACTIONS[side].includes(log.action);
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="bg-gray-800/60 rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

const VIEW_AS_ROLES = [
  {
    role: "consumer" as const,
    label: "Renter / Buyer",
    desc: "Swipe cards, search & saved homes",
    Icon: Home,
    home: "/",
    gradient: "from-sky-900/60 to-sky-800/30",
    ring: "ring-sky-600/40 hover:ring-sky-500/70",
    badge: "bg-sky-500/20 text-sky-300",
  },
  {
    role: "broker" as const,
    label: "Broker",
    desc: "Listings dashboard & inquiries",
    Icon: Briefcase,
    home: "/broker",
    gradient: "from-emerald-900/60 to-emerald-800/30",
    ring: "ring-emerald-600/40 hover:ring-emerald-500/70",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
  {
    role: "landlord" as const,
    label: "Landlord",
    desc: "Property management & inquiries",
    Icon: Building2,
    home: "/broker",
    gradient: "from-amber-900/60 to-amber-800/30",
    ring: "ring-amber-600/40 hover:ring-amber-500/70",
    badge: "bg-amber-500/20 text-amber-300",
  },
];

export default function AdminOverview() {
  const { user } = useAuth();
  const { setPreviewRole } = usePreview();
  const [, navigate] = useLocation();
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [logs, setLogs]     = useState<AuditLog[]>([]);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [side, setSide]     = useState<SideFilter>("all");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const knownIds = useRef<Set<number>>(new Set());

  async function fetchAll(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    try {
      const [s, l] = await Promise.all([adminApi.stats(), adminApi.auditLogs(40)]);
      setStats(s);

      const incoming = new Set(l.map((x) => x.id));
      const fresh = l.filter((x) => knownIds.current.size > 0 && !knownIds.current.has(x.id));
      setNewIds(new Set(fresh.map((x) => x.id)));
      knownIds.current = incoming;
      setLogs(l);
      setLastFetch(new Date());

      if (fresh.length > 0) {
        setTimeout(() => setNewIds(new Set()), 8_000);
      }
    } catch {/* ignore */} finally {
      if (showRefresh) setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(() => fetchAll(), POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const consumers = stats?.usersByRole.find((r) => r.role === "consumer")?.count ?? 0;
  const brokers   = (stats?.usersByRole.find((r) => r.role === "broker")?.count ?? 0)
                  + (stats?.usersByRole.find((r) => r.role === "landlord")?.count ?? 0);

  const filtered = logs.filter((l) => matchesSide(l, side));

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 overflow-y-auto">
      {/* Admin banner */}
      <header className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-gray-900 px-5 pt-8 pb-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Admin Portal</p>
            <h1 className="text-xl font-bold text-white">HomeSwipe Dashboard</h1>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-300" />
          </div>
        </div>
        <p className="text-indigo-300/70 text-xs">Welcome back, {user?.name?.split(" ")[0]}</p>
      </header>

      <div className="px-4 pt-4 space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users}          label="Total Users"  value={stats?.totalUsers ?? "—"}     color="bg-blue-500/20 text-blue-400" />
          <StatCard icon={Building2}      label="Listings"     value={stats?.totalListings ?? "—"}  color="bg-emerald-500/20 text-emerald-400" />
          <StatCard icon={MessageSquare}  label="Inquiries"    value={stats?.totalInquiries ?? "—"} color="bg-amber-500/20 text-amber-400" />
          <StatCard icon={Zap}            label="Events Today" value={stats?.eventsToday ?? "—"}    color="bg-indigo-500/20 text-indigo-400" />
        </div>

        {/* User breakdown */}
        <div className="bg-gray-800/50 rounded-2xl p-4 flex items-center justify-around">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{consumers}</p>
            <p className="text-xs text-gray-400">Consumers</p>
          </div>
          <div className="h-10 w-px bg-gray-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">{brokers}</p>
            <p className="text-xs text-gray-400">Professionals</p>
          </div>
          <div className="h-10 w-px bg-gray-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-400">{stats?.totalUsers ?? 0}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>

        {/* View Platform As */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">View Platform As</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {VIEW_AS_ROLES.map((r) => (
              <button
                key={r.role}
                onClick={() => {
                  setPreviewRole(r.role);
                  navigate(r.home);
                }}
                className={`bg-gradient-to-b ${r.gradient} ring-1 ${r.ring} rounded-2xl p-3 flex flex-col items-center gap-2 text-center transition-all active:scale-95`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.badge}`}>
                  <r.Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white leading-tight">{r.label}</span>
                <span className="text-[10px] text-gray-400 leading-tight">{r.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            Tap a role to enter read-only preview · writes are intercepted
          </p>
        </div>

        {/* Activity feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Live Activity Feed</h2>
              {lastFetch && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  Updated {timeAgo(lastFetch.toISOString())} · auto-refreshes every 15s
                </p>
              )}
            </div>
            <button
              onClick={() => fetchAll(true)}
              className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Side filter pills */}
          <div className="flex gap-2 mb-3">
            {(["all", "consumer", "broker"] as SideFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  side === s
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {s === "all" ? "All" : s === "consumer" ? "Consumer Side" : "Broker Side"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="py-10 text-center text-gray-600 text-sm">No activity yet</div>
            )}
            {filtered.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                  newIds.has(log.id)
                    ? "bg-indigo-900/50 ring-1 ring-indigo-500/50"
                    : "bg-gray-800/50"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${actionColor(log.action)}`}>
                  {actionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium leading-tight">
                    {actionLabel(log)}
                    {newIds.has(log.id) && (
                      <span className="ml-2 text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(log.createdAt)}
                    {log.userRole && (
                      <span className="ml-1 capitalize px-1.5 py-0.5 bg-gray-700 rounded-full text-[10px]">
                        {log.userRole}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
