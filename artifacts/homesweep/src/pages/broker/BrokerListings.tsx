import { useEffect, useState } from "react";
import { brokerApi } from "@/lib/broker-api";
import { formatPrice } from "@/lib/utils";
import { Plus, Trash2, MapPin, BedDouble, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

export default function BrokerListings() {
  const [, navigate] = useLocation();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function load() {
    try {
      const l = await brokerApi.getListings();
      setListings(l);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await brokerApi.deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="px-5 pt-7 pb-4 sticky top-0 bg-background/95 backdrop-blur-xl z-10 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Listings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{listings.length} active</p>
          </div>
          <button
            onClick={() => navigate("/broker/add-listing")}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center gap-3">
            <Building2 className="w-12 h-12 text-muted-foreground/30" />
            <div>
              <h3 className="text-lg font-bold">No listings yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Add your first property to start attracting renters and buyers.</p>
            </div>
            <button
              onClick={() => navigate("/broker/add-listing")}
              className="bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition"
            >
              + Add First Listing
            </button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {listings.map((l) => (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm p-3 gap-3"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-muted">
                    <img src={l.imageUrl} alt={l.address} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1512917774085-f5ad8e282eb4?w=200&h=200&fit=crop"; }}
                    />
                  </div>
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-base truncate">{formatPrice(l.price)}</p>
                        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                          {l.propertyType}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />{l.address}, {l.city}
                      </p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-0.5">
                          <BedDouble className="w-3 h-3" />
                          {l.bedrooms === 0 ? "Studio" : `${l.bedrooms} bd`}
                        </span>
                        <span>·</span>
                        <span>{l.bathrooms} ba</span>
                        <span>·</span>
                        <span>{l.sqft.toLocaleString()} sqft</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-2">
                      <button
                        onClick={() => handleDelete(l.id)}
                        disabled={deleting === l.id}
                        className="flex items-center gap-1 text-destructive text-xs font-medium hover:bg-destructive/10 px-2 py-1 rounded-lg transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        {deleting === l.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
