"use client";

import { useEffect, useState } from "react";
import { adminApi, type AdminUser } from "@/lib/admin-api";
import { Users, Search, Briefcase, Building2, Home, ShieldCheck } from "lucide-react";

function roleBadge(role: string) {
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    consumer: { label: "Consumer",  cls: "bg-blue-500/20 text-blue-400",    Icon: Home        },
    broker:   { label: "Broker",    cls: "bg-emerald-500/20 text-emerald-400", Icon: Briefcase  },
    landlord: { label: "Landlord",  cls: "bg-amber-500/20 text-amber-400",  Icon: Building2   },
    admin:    { label: "Admin",     cls: "bg-indigo-500/20 text-indigo-400", Icon: ShieldCheck },
  };
  const cfg = map[role] ?? { label: role, cls: "bg-gray-500/20 text-gray-400", Icon: Users };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.cls}`}>
      <cfg.Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function ago(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUsers() {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [query, setQuery]   = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    adminApi.users().then(setUsers).finally(() => setLoading(false));
  }, []);

  const roles = ["all", "consumer", "broker", "landlord", "admin"];

  const visible = users.filter((u) => {
    const matchRole = filter === "all" || u.role === filter;
    const matchQ    = !query || [u.name, u.email, u.phone, u.brokerage]
      .filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase());
    return matchRole && matchQ;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 overflow-y-auto">
      <header className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-gray-900 px-5 pt-8 pb-5">
        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Admin Portal</p>
        <h1 className="text-xl font-bold">All Users</h1>
        <p className="text-indigo-300/70 text-xs mt-0.5">{users.length} total accounts</p>
      </header>

      <div className="px-4 pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email…"
            className="w-full bg-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold capitalize transition ${
                filter === r ? "bg-indigo-500 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {r === "all" ? `All (${users.length})` : r}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading…</p>}

        <div className="space-y-2">
          {visible.map((u) => (
            <div key={u.id} className="bg-gray-800/60 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <span className="text-indigo-300 font-bold text-base">{u.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-white">{u.name}</span>
                  {roleBadge(u.role)}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email ?? u.phone}</p>
                {u.brokerage && <p className="text-xs text-gray-500 mt-0.5">{u.brokerage}</p>}
                <p className="text-[10px] text-gray-600 mt-1">Joined {ago(u.createdAt)}</p>
              </div>
            </div>
          ))}

          {!loading && visible.length === 0 && (
            <div className="py-12 text-center text-gray-600 text-sm">No users match this filter</div>
          )}
        </div>
      </div>
    </div>
  );
}
