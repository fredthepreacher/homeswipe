"use client";

import { useEffect, useState } from "react";
import { adminApi, type AuditLog } from "@/lib/admin-api";
import { Search, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  "user.registered":    "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "user.login":         "bg-gray-600/30 text-gray-400 border-gray-600/30",
  "listing.created":    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "listing.deleted":    "bg-red-500/20 text-red-400 border-red-500/30",
  "inquiry.submitted":  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "admin.login":        "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
  return (
    <span className={`inline-block border rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${cls}`}>
      {action}
    </span>
  );
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <div className="bg-gray-800/60 rounded-xl overflow-hidden">
      <button
        className="w-full text-left p-3.5 flex items-start gap-3"
        onClick={() => hasDetails && setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <ActionBadge action={log.action} />
          <div className="flex items-center gap-2 flex-wrap">
            {log.userName && (
              <span className="text-xs text-white font-medium">{log.userName}</span>
            )}
            {log.userRole && (
              <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full capitalize">
                {log.userRole}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {fmt(log.createdAt)}
            {log.entityType && log.entityId && (
              <span className="ml-1 text-gray-600">· {log.entityType} #{log.entityId}</span>
            )}
          </p>
        </div>
        {hasDetails && (
          <div className="text-gray-600 mt-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      {expanded && log.details && (
        <div className="px-3.5 pb-3.5 -mt-1">
          <pre className="text-[10px] text-gray-400 bg-gray-900/60 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(log.details, null, 2)}
          </pre>
          {log.ipAddress && (
            <p className="text-[10px] text-gray-600 mt-1">IP: {log.ipAddress}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAuditLog() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [refreshing, setRefreshing]     = useState(false);

  async function load(showSpin = false) {
    if (showSpin) setRefreshing(true);
    try {
      const data = await adminApi.auditLogs(200);
      setLogs(data);
    } catch {/* ignore */} finally {
      setLoading(false);
      if (showSpin) setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const uniqueActions = ["all", ...new Set(logs.map((l) => l.action))];

  const visible = logs.filter((l) => {
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    const matchQ = !query ||
      [l.action, l.userName, l.userRole, String(l.entityId ?? "")]
        .join(" ").toLowerCase().includes(query.toLowerCase());
    return matchAction && matchQ;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 overflow-y-auto">
      <header className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-gray-900 px-5 pt-8 pb-5">
        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Admin Portal</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Audit Log</h1>
            <p className="text-indigo-300/70 text-xs mt-0.5">{logs.length} total events recorded</p>
          </div>
          <button
            onClick={() => load(true)}
            className="p-2 rounded-xl bg-indigo-700/40 text-indigo-300 hover:bg-indigo-700/60 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by action, user, entity…"
            className="w-full bg-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {uniqueActions.map((a) => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold font-mono transition ${
                actionFilter === a ? "bg-indigo-500 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {a === "all" ? `all (${logs.length})` : a}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading…</p>}

        <p className="text-xs text-gray-600">
          Tap an entry to expand details · {visible.length} entries shown
        </p>

        <div className="space-y-2">
          {visible.map((log) => <LogRow key={log.id} log={log} />)}
          {!loading && visible.length === 0 && (
            <div className="py-12 text-center text-gray-600 text-sm">No audit events found</div>
          )}
        </div>
      </div>
    </div>
  );
}
