"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { brokerApi } from "@/lib/broker-api";
import { formatPrice } from "@/lib/utils";
import { Building2, MessageSquare, Plus, TrendingUp, ChevronRight, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function BrokerDashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [l, i] = await Promise.all([brokerApi.getListings(), brokerApi.getInquiries()]);
        setListings(l);
        setInquiries(i);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = [
    { icon: Building2, label: "Active Listings", value: listings.length, color: "text-primary", bg: "bg-primary/10" },
    { icon: MessageSquare, label: "Inquiries", value: inquiries.length, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { icon: TrendingUp, label: "Total Views", value: listings.length * 12, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 overflow-y-auto">
      <header className="px-5 pt-7 pb-5 bg-card border-b border-border/40">
        <p className="text-sm text-muted-foreground mb-0.5">Good morning,</p>
        <h1 className="text-2xl font-bold">{user?.firstName ?? user?.fullName ?? "Agent"} 👋</h1>
        <p className="text-xs text-muted-foreground mt-1">Here&apos;s your portfolio overview</p>
      </header>

      <main className="flex-1 px-5 pt-5 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border/50 p-3 flex flex-col items-center text-center gap-1.5"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <p className="text-xl font-bold">
                {loading ? <span className="inline-block w-5 h-4 bg-muted animate-pulse rounded" /> : stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium leading-tight">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => router.push("/broker/add-listing")}
              className="flex flex-col items-center gap-2 bg-primary text-white p-4 rounded-2xl font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Listing
            </button>
            <button
              onClick={() => router.push("/broker/inquiries")}
              className="flex flex-col items-center gap-2 bg-card border border-border p-4 rounded-2xl font-semibold text-sm hover:bg-muted active:scale-95 transition-all"
            >
              <MessageSquare className="w-5 h-5 text-primary" />
              View Inquiries
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Listings</p>
            <button onClick={() => router.push("/broker/listings")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
              See all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No listings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first property to get started</p>
              <button
                onClick={() => router.push("/broker/add-listing")}
                className="mt-3 text-sm text-primary font-semibold hover:underline"
              >
                + Add a listing
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {listings.slice(0, 3).map((l) => (
                <div key={l.id} className="flex gap-3 bg-card border border-border/50 rounded-2xl p-3 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-muted">
                    <img src={l.imageUrl} alt={l.address} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1512917774085-f5ad8e282eb4?w=100&h=100&fit=crop"; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{formatPrice(l.price)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />{l.city}, {l.state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{l.propertyType} · {l.bedrooms === 0 ? "Studio" : `${l.bedrooms} bd`}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {inquiries.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Inquiries</p>
              <button onClick={() => router.push("/broker/inquiries")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
                See all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {inquiries.slice(0, 2).map((inq) => (
                <div key={inq.id} className="bg-card border border-border/50 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-sm">{inq.name}</p>
                    <span className="text-[10px] text-muted-foreground">{new Date(inq.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{inq.listingAddress}</p>
                  <p className="text-xs text-foreground/80 line-clamp-2">{inq.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
