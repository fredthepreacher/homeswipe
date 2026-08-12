"use client";

import { useState, useMemo } from "react";
import { useGetListings } from "@/hooks/use-listings";
import {
  Search as SearchIcon, SlidersHorizontal, MapPin, X,
  BedDouble, DollarSign, Building2, Home, Building,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type PropertyType = "All" | "Apartment" | "House" | "Condo" | "Townhouse";

const PROPERTY_TYPES: PropertyType[] = ["All", "Apartment", "House", "Condo", "Townhouse"];

const TYPE_ICONS: Record<PropertyType, React.ReactNode> = {
  All: null,
  Apartment: <Building2 className="w-3.5 h-3.5" />,
  House: <Home className="w-3.5 h-3.5" />,
  Condo: <Building className="w-3.5 h-3.5" />,
  Townhouse: <Building className="w-3.5 h-3.5" />,
};

interface SubCard { label: string; sublabel: string; value: string; icon: string }

const SUBCARDS: Record<PropertyType, SubCard[]> = {
  All: [],
  Apartment: [
    { label: "Studio",     sublabel: "Open plan living",    value: "Studio",     icon: "🛋️" },
    { label: "1 Bedroom",  sublabel: "Perfect for one",     value: "1 Bedroom",  icon: "🛏️" },
    { label: "2 Bedrooms", sublabel: "Room to grow",        value: "2 Bedrooms", icon: "🏠" },
    { label: "3 Bedrooms", sublabel: "Space for the family",value: "3 Bedrooms", icon: "🏡" },
  ],
  House: [
    { label: "Ranch Style", sublabel: "Single-level living",  value: "Ranch Style", icon: "🌾" },
    { label: "Two-Story",   sublabel: "Classic family home",  value: "Two-Story",   icon: "🏠" },
    { label: "Colonial",    sublabel: "Timeless elegance",    value: "Colonial",    icon: "🏛️" },
    { label: "Modern",      sublabel: "Sleek & contemporary", value: "Modern",      icon: "✨" },
  ],
  Condo: [
    { label: "Loft",       sublabel: "Open industrial style", value: "Loft",       icon: "🏗️" },
    { label: "Garden",     sublabel: "Ground-level living",   value: "Garden",     icon: "🌿" },
    { label: "Penthouse",  sublabel: "Top-floor luxury",      value: "Penthouse",  icon: "🌆" },
  ],
  Townhouse: [
    { label: "End Unit",    sublabel: "Extra windows & light", value: "End Unit",    icon: "🏘️" },
    { label: "Corner Unit", sublabel: "Premium corner space",  value: "Corner Unit", icon: "📐" },
    { label: "Row Home",    sublabel: "Classic city living",   value: "Row Home",    icon: "🧱" },
  ],
};

const PRICE_RANGES = [
  { label: "Any price",        min: 0,       max: Infinity },
  { label: "Under $1,500/mo",  min: 0,       max: 1500 },
  { label: "$1,500 – $3,000",  min: 1500,    max: 3000 },
  { label: "$3,000 – $5,000",  min: 3000,    max: 5000 },
  { label: "$5,000+",          min: 5000,    max: Infinity },
  { label: "Under $500K",      min: 0,       max: 500000 },
  { label: "$500K – $1M",      min: 500000,  max: 1000000 },
  { label: "$1M+",             min: 1000000, max: Infinity },
];

export default function Search() {
  const { data: allListings, isLoading } = useGetListings();
  const [query, setQuery]             = useState("");
  const [activeType, setActiveType]   = useState<PropertyType>("All");
  const [activeSubtype, setActiveSubtype] = useState<string>("Any");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRangeIdx, setPriceRangeIdx] = useState(0);

  const filteredListings = useMemo(() => {
    if (!allListings) return [];
    const { min, max } = PRICE_RANGES[priceRangeIdx];
    return allListings.filter((l) => {
      const matchQuery =
        !query ||
        l.city.toLowerCase().includes(query.toLowerCase()) ||
        l.address.toLowerCase().includes(query.toLowerCase()) ||
        l.state.toLowerCase().includes(query.toLowerCase());
      const matchType    = activeType === "All" || l.propertyType === activeType;
      const matchSubtype = activeSubtype === "Any" || l.subtype === activeSubtype;
      const matchPrice   = l.price >= min && l.price <= max;
      return matchQuery && matchType && matchSubtype && matchPrice;
    });
  }, [allListings, query, activeType, activeSubtype, priceRangeIdx]);

  function countForSubtype(type: PropertyType, sub: string) {
    if (!allListings) return 0;
    return allListings.filter(
      (l) => (type === "All" || l.propertyType === type) && l.subtype === sub
    ).length;
  }

  const activeFilterCount = [
    activeType !== "All" ? 1 : 0,
    activeSubtype !== "Any" ? 1 : 0,
    priceRangeIdx !== 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  function resetFilters() {
    setActiveType("All");
    setActiveSubtype("Any");
    setPriceRangeIdx(0);
    setQuery("");
  }

  function selectType(type: PropertyType) {
    setActiveType(type);
    setActiveSubtype("Any");
  }

  const cards = SUBCARDS[activeType];
  const showCards = cards.length > 0 && !query;

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="px-5 pt-5 pb-3 sticky top-0 bg-background/95 backdrop-blur-xl z-20 border-b border-border/40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Explore</h1>
            {activeType !== "All" && (
              <p className="text-xs text-primary font-medium mt-0.5">{activeType}s near you</p>
            )}
          </div>
          {(activeFilterCount > 0 || !!query) && (
            <button onClick={resetFilters} className="text-xs text-destructive flex items-center gap-1 font-medium">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="City, neighborhood, or address…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none transition"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={`relative h-11 w-11 flex items-center justify-center rounded-xl border transition-all ${
              activeFilterCount > 0
                ? "bg-primary text-white border-primary"
                : "bg-card border-border text-foreground hover:bg-muted"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => selectType(type)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeType === type
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              {TYPE_ICONS[type]}
              {type === "All" ? "All" : `${type}s`}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-5 pt-4">
        <AnimatePresence mode="wait">
          {showCards && !isLoading && (
            <motion.div
              key={activeType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="mb-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-foreground">
                  Browse by {activeType === "Apartment" ? "bedrooms" : "style"}
                </p>
                {activeSubtype !== "Any" && (
                  <button onClick={() => setActiveSubtype("Any")} className="text-xs text-primary font-medium">
                    Show all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {cards.map((card) => {
                  const count = countForSubtype(activeType, card.value);
                  const isActive = activeSubtype === card.value;
                  return (
                    <motion.button
                      key={card.value}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveSubtype(isActive ? "Any" : card.value)}
                      className={`relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${
                        isActive
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                          : "bg-card border-border hover:bg-muted"
                      }`}
                    >
                      <span className="text-2xl mb-2">{card.icon}</span>
                      <span className={`text-sm font-bold leading-tight ${isActive ? "text-white" : "text-foreground"}`}>
                        {card.label}
                      </span>
                      <span className={`text-xs mt-0.5 ${isActive ? "text-white/75" : "text-muted-foreground"}`}>
                        {card.sublabel}
                      </span>
                      <span className={`absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      }`}>
                        {count}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <button
                onClick={() => setActiveSubtype("Any")}
                className={`w-full mt-2.5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  activeSubtype === "Any"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                Show all {activeType === "All" ? "properties" : `${activeType}s`}
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  {filteredListings.length} {filteredListings.length === 1 ? "listing" : "listings"}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-center gap-3">
            <SearchIcon className="w-10 h-10 text-muted-foreground/30" />
            <div>
              <h3 className="text-lg font-bold">No results found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
            </div>
            <button onClick={resetFilters} className="text-sm text-primary font-medium hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {!showCards && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {filteredListings.length} {filteredListings.length === 1 ? "Property" : "Properties"}
              </p>
            )}
            {filteredListings.map((property) => (
              <motion.div
                key={property.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-md transition-shadow p-3 gap-3"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-muted">
                  <img
                    src={property.imageUrl}
                    alt={property.address}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1512917774085-f5ad8e282eb4?w=200&h=200&fit=crop";
                    }}
                  />
                </div>
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {formatPrice(property.price)}
                    </h3>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {property.propertyType}
                      </span>
                      {property.subtype && (
                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                          {property.subtype}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center mb-2 truncate">
                    <MapPin className="w-3 h-3 mr-1 shrink-0" />
                    <span className="truncate">{property.city}, {property.state}</span>
                  </p>
                  <div className="flex gap-2 text-xs font-medium text-foreground/70">
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3 h-3" />
                      {property.bedrooms === 0 ? "Studio" : `${property.bedrooms} bd`}
                    </span>
                    <span>·</span>
                    <span>{property.bathrooms} ba</span>
                    <span>·</span>
                    <span>{property.sqft.toLocaleString()} sqft</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background rounded-t-3xl z-50 px-6 pt-5 pb-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Filters</h2>
                <button
                  onClick={() => { setActiveType("All"); setActiveSubtype("Any"); setPriceRangeIdx(0); }}
                  className="text-sm text-muted-foreground hover:text-destructive transition"
                >
                  Reset all
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Property Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => selectType(type)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        activeType === type
                          ? "bg-primary text-white border-primary"
                          : "bg-card border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {TYPE_ICONS[type]}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {SUBCARDS[activeType].length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    {activeType === "Apartment"
                      ? <><BedDouble className="w-4 h-4 text-primary" /> Bedrooms</>
                      : <><Building className="w-4 h-4 text-primary" /> Style</>
                    }
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveSubtype("Any")}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        activeSubtype === "Any"
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      Any
                    </button>
                    {SUBCARDS[activeType].map((card) => (
                      <button
                        key={card.value}
                        onClick={() => setActiveSubtype(card.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                          activeSubtype === card.value
                            ? "bg-foreground text-background border-foreground"
                            : "bg-card border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {card.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" /> Price Range
                </p>
                <div className="flex flex-col gap-2">
                  {PRICE_RANGES.map((range, i) => (
                    <button
                      key={i}
                      onClick={() => setPriceRangeIdx(i)}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        priceRangeIdx === i
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-card border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {range.label}
                      {priceRangeIdx === i && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowFilters(false)}
                className="w-full bg-primary text-white font-semibold rounded-2xl py-4 hover:bg-primary/90 transition"
              >
                Show {filteredListings.length} {filteredListings.length === 1 ? "result" : "results"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
