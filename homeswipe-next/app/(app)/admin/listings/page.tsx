"use client";

import { useEffect, useState } from "react";
import { adminApi, type AdminListing } from "@/lib/admin-api";
import { Search, Bed, Bath, SquareDashedBottom } from "lucide-react";

function formatPrice(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const TYPE_COLORS: Record<string, string> = {
  Apartment: "bg-blue-500/20 text-blue-400",
  House:     "bg-emerald-500/20 text-emerald-400",
  Condo:     "bg-amber-500/20 text-amber-400",
  Townhouse: "bg-purple-500/20 text-purple-400",
};

export default function AdminListings() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setType]   = useState<string>("all");

  useEffect(() => {
    adminApi.listings().then(setListings).finally(() => setLoading(false));
  }, []);

  const types = ["all", "Apartment", "House", "Condo", "Townhouse"];

  const visible = listings.filter((l) => {
    const matchType = typeFilter === "all" || l.propertyType === typeFilter;
    const matchQ    = !query || [l.address, l.city, l.state, l.ownerName]
      .join(" ").toLowerCase().includes(query.toLowerCase());
    return matchType && matchQ;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 overflow-y-auto">
      <header className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-gray-900 px-5 pt-8 pb-5">
        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Admin Portal</p>
        <h1 className="text-xl font-bold">All Listings</h1>
        <p className="text-indigo-300/70 text-xs mt-0.5">{listings.length} properties across all agents</p>
      </header>

      <div className="px-4 pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address, city, owner…"
            className="w-full bg-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition ${
                typeFilter === t ? "bg-indigo-500 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {t === "all" ? `All (${listings.length})` : t}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading…</p>}

        <div className="space-y-3">
          {visible.map((l) => (
            <div key={l.id} className="bg-gray-800/60 rounded-2xl overflow-hidden">
              <div className="h-28 bg-gray-700 relative">
                {l.imageUrl && (
                  <img src={l.imageUrl} alt={l.address} className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_COLORS[l.propertyType] ?? "bg-gray-500/20 text-gray-400"}`}>
                    {l.propertyType}
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {formatPrice(l.price)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="font-semibold text-sm text-white leading-tight">{l.address}</p>
                <p className="text-xs text-gray-400">{l.city}, {l.state}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{l.bedrooms} bd</span>
                  <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{l.bathrooms} ba</span>
                  <span className="flex items-center gap-1"><SquareDashedBottom className="w-3 h-3" />{l.sqft.toLocaleString()} sqft</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-[8px] text-indigo-400 font-bold">{l.ownerName.charAt(0)}</span>
                  </div>
                  <span className="text-[11px] text-gray-500">Listed by {l.ownerName}</span>
                </div>
              </div>
            </div>
          ))}

          {!loading && visible.length === 0 && (
            <div className="py-12 text-center text-gray-600 text-sm">No listings match</div>
          )}
        </div>
      </div>
    </div>
  );
}
