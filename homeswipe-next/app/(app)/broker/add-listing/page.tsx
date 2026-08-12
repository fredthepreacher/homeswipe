"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, AlertCircle, DollarSign, MapPin, BedDouble, Bath, Square, Image as ImageIcon, FileText, Tag, Play } from "lucide-react";
import { brokerApi } from "@/lib/broker-api";

const BROKER_AD_AFTER = 2;

type PropertyType = "Apartment" | "House" | "Condo" | "Townhouse";

const PROPERTY_TYPES: PropertyType[] = ["Apartment", "House", "Condo", "Townhouse"];

const SUBTYPES: Record<PropertyType, string[]> = {
  Apartment: ["Studio", "1 Bedroom", "2 Bedrooms", "3 Bedrooms"],
  House:     ["Ranch Style", "Two-Story", "Colonial", "Modern"],
  Condo:     ["Loft", "Garden", "Penthouse"],
  Townhouse: ["End Unit", "Corner Unit", "Row Home"],
};

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1512917774085-f5ad8e282eb4?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
];

export default function BrokerAddListing() {
  const router = useRouter();
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAd, setShowAd]   = useState(false);
  const [adCountdown, setAdCountdown] = useState(30);

  const [propertyType, setPropertyType] = useState<PropertyType>("Apartment");
  const [subtype, setSubtype]           = useState("");
  const [price, setPrice]               = useState("");
  const [address, setAddress]           = useState("");
  const city  = "Manhattan";
  const state = "NY";
  const [bedrooms, setBedrooms]        = useState("1");
  const [bathrooms, setBathrooms]      = useState("1");
  const [sqft, setSqft]                = useState("");
  const [imageUrl, setImageUrl]        = useState(DEFAULT_IMAGES[0]);
  const [description, setDescription] = useState("");

  function startAd() {
    setAdCountdown(30);
    setShowAd(true);
    const t = setInterval(() => {
      setAdCountdown((n) => {
        if (n <= 1) { clearInterval(t); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!price || !address || !sqft || !description) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      await brokerApi.createListing({
        price: parseFloat(price),
        address,
        city,
        state,
        bedrooms: parseInt(bedrooms, 10),
        bathrooms: parseFloat(bathrooms),
        sqft: parseInt(sqft, 10),
        imageUrl,
        propertyType,
        subtype: subtype || undefined,
        description,
      });
      const prev = parseInt(sessionStorage.getItem("hs_broker_listings") ?? "0", 10);
      const next = prev + 1;
      sessionStorage.setItem("hs_broker_listings", String(next));
      if (next % BROKER_AD_AFTER === 0) {
        setSuccess(true);
        startAd();
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/broker/listings"), 1500);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create listing");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 relative">
        <AnimatePresence>
          {showAd && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.88, y: 32 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.88, y: 32 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className="bg-card rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl"
              >
                <div className="bg-gradient-to-br from-primary/80 to-primary h-44 flex flex-col items-center justify-center gap-3 px-4 text-center">
                  <Play className="w-10 h-10 text-white/90" strokeWidth={1.5} />
                  <p className="text-white font-bold text-lg">HomeSwipe Ad</p>
                  <p className="text-white/70 text-xs">Sponsored · 30s</p>
                </div>
                <div className="p-5 flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground text-center">
                    {adCountdown > 0
                      ? `Watch this short ad to continue · ${adCountdown}s`
                      : "Thanks for watching!"}
                  </p>
                  {adCountdown === 0 && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => { setShowAd(false); router.push("/broker/listings"); }}
                      className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-2xl text-sm"
                    >
                      Go to My Listings
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <h2 className="text-xl font-bold">Listing published!</h2>
          <p className="text-muted-foreground text-sm">Your Manhattan property is now live for renters to discover.</p>
          {!showAd && (
            <button onClick={() => router.push("/broker/listings")} className="text-primary font-semibold text-sm">
              View My Listings →
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition";

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 overflow-y-auto">
      <header className="px-5 pt-7 pb-4 sticky top-0 bg-background/95 backdrop-blur-xl z-10 border-b border-border/40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/broker/listings")} className="text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Add Listing</h1>
            <p className="text-xs text-muted-foreground">Fill in the property details below</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 px-5 pt-5 space-y-5">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            <Tag className="w-3.5 h-3.5" /> Property Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_TYPES.map((pt) => (
              <button key={pt} type="button"
                onClick={() => { setPropertyType(pt); setSubtype(""); setBedrooms(pt === "Apartment" ? "0" : "1"); }}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                  propertyType === pt ? "bg-primary text-white border-primary" : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {pt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {propertyType === "Apartment" ? "Bedrooms" : "Style"}
          </label>
          <div className="flex flex-wrap gap-2">
            {SUBTYPES[propertyType].map((st) => (
              <button key={st} type="button"
                onClick={() => { setSubtype(st); if (propertyType === "Apartment") setBedrooms(st === "Studio" ? "0" : st.split(" ")[0]); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  subtype === st ? "bg-foreground text-background border-foreground" : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            <DollarSign className="w-3.5 h-3.5" /> Price / Rent
          </label>
          <input type="number" placeholder="e.g. 2500 for rent or 450000 for sale"
            value={price} onChange={(e) => setPrice(e.target.value)} required className={inputCls} />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5" /> Address
          </label>
          <input type="text" placeholder="e.g. 250 West 57th Street, Apt 4B" value={address}
            onChange={(e) => setAddress(e.target.value)} required className={inputCls} />
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            Listings are locked to <span className="font-semibold text-primary">Manhattan, NY</span> for launch.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              <BedDouble className="w-3 h-3" /> Beds
            </label>
            <input type="number" min="0" max="10" value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              <Bath className="w-3 h-3" /> Baths
            </label>
            <input type="number" min="1" max="10" step="0.5" value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              <Square className="w-3 h-3" /> Sqft
            </label>
            <input type="number" placeholder="850" value={sqft}
              onChange={(e) => setSqft(e.target.value)} required className={inputCls} />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            <ImageIcon className="w-3.5 h-3.5" /> Photo
          </label>
          <p className="text-xs text-muted-foreground mb-2">Choose a stock photo or paste your own URL</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {DEFAULT_IMAGES.map((url) => (
              <button key={url} type="button"
                onClick={() => setImageUrl(url)}
                className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  imageUrl === url ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={url} alt="Property" className="w-full h-full object-cover" />
                {imageUrl === url && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <input type="url" placeholder="Or paste your own image URL…" value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)} className={inputCls} />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            <FileText className="w-3.5 h-3.5" /> Description
          </label>
          <textarea rows={4} placeholder="Describe the property — highlights, amenities, neighborhood…"
            value={description} onChange={(e) => setDescription(e.target.value)} required
            className={`${inputCls} resize-none`} />
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2.5 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
          className="w-full bg-primary text-white font-bold rounded-2xl py-4 hover:bg-primary/90 transition disabled:opacity-60 mb-4"
        >
          {loading ? "Publishing…" : "Publish Listing"}
        </motion.button>
      </form>
    </div>
  );
}
