"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { preferencesApi, type BuyerPreferences, type Amenities } from "@/lib/preferences-api";

const TOTAL_STEPS = 5;

const TIMELINES = [
  { value: "asap",     emoji: "🚀", label: "ASAP",        sub: "Ready to move now" },
  { value: "1-3m",     emoji: "📅", label: "1–3 Months",  sub: "Looking soon" },
  { value: "3-6m",     emoji: "🗓️",  label: "3–6 Months",  sub: "Planning ahead" },
  { value: "6m+",      emoji: "🌅", label: "6+ Months",   sub: "Exploring options" },
  { value: "browsing", emoji: "👀", label: "Just Browsing", sub: "No rush" },
] as const;

const PROPERTY_TYPES = ["Apartment", "House", "Condo", "Townhouse"];

const BEDROOM_OPTIONS = [
  { value: 0, label: "Studio" },
  { value: 1, label: "1 Bed" },
  { value: 2, label: "2 Beds" },
  { value: 3, label: "3 Beds" },
  { value: 4, label: "4+ Beds" },
];

const AMENITY_OPTIONS: { key: keyof Amenities | "garageType"; label: string; emoji: string; values?: string[] }[] = [
  { key: "pool",          label: "Pool",            emoji: "🏊" },
  { key: "garageType",    label: "1-Car Garage",    emoji: "🚗", values: ["1-car"] },
  { key: "garageType",    label: "2-Car Garage",    emoji: "🚙", values: ["2-car"] },
  { key: "petFriendly",   label: "Pet Friendly",    emoji: "🐾" },
  { key: "inUnitLaundry", label: "In-Unit Laundry", emoji: "👕" },
  { key: "gym",           label: "Gym / Fitness",   emoji: "💪" },
  { key: "yard",          label: "Backyard",        emoji: "🌿" },
  { key: "parking",       label: "Parking",         emoji: "🅿️" },
  { key: "elevator",      label: "Elevator",        emoji: "🏢" },
];

const DEFAULT_AMENITIES: Amenities = {
  pool: false, petFriendly: false, inUnitLaundry: false,
  gym: false, yard: false, parking: false, elevator: false,
  garageType: "none",
};

export default function Preferences() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [budgetType, setBudgetType]     = useState<"rent" | "purchase">("rent");
  const [budgetMin, setBudgetMin]       = useState("");
  const [budgetMax, setBudgetMax]       = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [locations, setLocations]       = useState<string[]>([]);
  const [timeline, setTimeline]         = useState<string | null>(null);
  const [bedroomsMin, setBedroomsMin]   = useState<number | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [amenities, setAmenities]       = useState<Amenities>({ ...DEFAULT_AMENITIES });

  useEffect(() => {
    preferencesApi.get().then((p) => {
      if (p) {
        setBudgetType((p.budgetType as "rent" | "purchase") ?? "rent");
        setBudgetMin(p.budgetMin != null ? String(p.budgetMin) : "");
        setBudgetMax(p.budgetMax != null ? String(p.budgetMax) : "");
        setLocations(p.locations ?? []);
        setTimeline(p.moveTimeline ?? null);
        setBedroomsMin(p.bedroomsMin ?? null);
        setPropertyTypes(p.propertyTypes ?? []);
        setAmenities(p.amenities ?? { ...DEFAULT_AMENITIES });
      }
    }).finally(() => setLoading(false));
  }, []);

  function goNext() {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      handleSave();
    }
  }

  function goBack() {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    } else {
      router.push("/profile");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await preferencesApi.save({
        budgetType,
        budgetMin:     budgetMin     ? parseInt(budgetMin)     : null,
        budgetMax:     budgetMax     ? parseInt(budgetMax)     : null,
        locations:     locations.length ? locations : null,
        moveTimeline:  timeline as BuyerPreferences["moveTimeline"],
        bedroomsMin,
        propertyTypes: propertyTypes.length ? propertyTypes : null,
        amenities,
      });
      router.push("/profile");
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  function addLocation() {
    const v = locationInput.trim();
    if (v && !locations.includes(v)) setLocations((l) => [...l, v]);
    setLocationInput("");
  }

  function togglePropertyType(t: string) {
    setPropertyTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function toggleAmenity(key: string, value?: string) {
    setAmenities((prev) => {
      if (key === "garageType") {
        return { ...prev, garageType: prev.garageType === value ? "none" : (value as Amenities["garageType"]) };
      }
      return { ...prev, [key]: !prev[key as keyof Amenities] };
    });
  }

  function isAmenityActive(key: string, value?: string): boolean {
    if (key === "garageType") return amenities.garageType === value;
    return !!(amenities as any)[key];
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const steps = [
    <BudgetStep key="budget"
      budgetType={budgetType} setBudgetType={setBudgetType}
      budgetMin={budgetMin}   setBudgetMin={setBudgetMin}
      budgetMax={budgetMax}   setBudgetMax={setBudgetMax}
    />,
    <LocationStep key="location"
      locationInput={locationInput} setLocationInput={setLocationInput}
      locations={locations}         setLocations={setLocations}
      addLocation={addLocation}
    />,
    <TimelineStep key="timeline" timeline={timeline} setTimeline={setTimeline} />,
    <HomeSizeStep key="size"
      bedroomsMin={bedroomsMin}   setBedroomsMin={setBedroomsMin}
      propertyTypes={propertyTypes} togglePropertyType={togglePropertyType}
    />,
    <AmenitiesStep key="amenities"
      amenities={amenities}
      isAmenityActive={isAmenityActive}
      toggleAmenity={toggleAmenity}
    />,
  ];

  const STEP_TITLES = [
    "What's your budget?",
    "Where do you want to live?",
    "When are you moving?",
    "What size home?",
    "What amenities matter?",
  ];

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="pt-safe px-4 py-3 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/50 z-10">
        <button onClick={goBack} className="p-2 rounded-xl hover:bg-muted transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold text-muted-foreground">Step {step + 1} of {TOTAL_STEPS}</p>
          <h1 className="text-lg font-bold text-foreground leading-tight">{STEP_TITLES[step]}</h1>
        </div>
      </header>

      <div className="h-1.5 bg-muted">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={false}
          animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <div className="flex justify-center gap-2 pt-4 pb-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step ? "w-6 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ x: direction * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -80, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="h-full px-5 pt-4 pb-36 overflow-y-auto"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-safe pt-4 bg-background/95 backdrop-blur-xl border-t border-border/50">
        <button
          onClick={goNext}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : isLastStep ? (
            <><Check className="w-5 h-5" /> Save My Preferences</>
          ) : (
            <>Continue <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
        {!isLastStep && (
          <button
            onClick={goNext}
            className="w-full text-center text-sm text-muted-foreground py-2 hover:text-foreground transition"
          >
            Skip this step
          </button>
        )}
      </div>
    </div>
  );
}

function BudgetStep({ budgetType, setBudgetType, budgetMin, setBudgetMin, budgetMax, setBudgetMax }: {
  budgetType: "rent" | "purchase"; setBudgetType: (v: "rent" | "purchase") => void;
  budgetMin: string; setBudgetMin: (v: string) => void;
  budgetMax: string; setBudgetMax: (v: string) => void;
}) {
  const rentPresets    = [500, 1000, 1500, 2000, 3000, 5000];
  const purchasePresets = [100000, 250000, 400000, 600000, 800000, 1000000];
  const presets = budgetType === "rent" ? rentPresets : purchasePresets;

  function fmt(v: number) {
    return budgetType === "rent"
      ? `$${v.toLocaleString()}`
      : v >= 1000000 ? `$${v / 1000000}M` : `$${v / 1000}K`;
  }

  return (
    <div className="space-y-6">
      <div className="flex rounded-2xl bg-muted p-1 gap-1">
        {(["rent", "purchase"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setBudgetType(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              budgetType === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "rent" ? "🏠 Renting" : "🔑 Buying"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Min Budget</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-3 py-3 bg-muted rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Max Budget</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="Any"
              className="w-full pl-7 pr-3 py-3 bg-muted rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Quick pick max</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setBudgetMax(String(p))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                budgetMax === String(p)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:border-primary/50"
              }`}
            >
              {fmt(p)}{budgetType === "rent" ? "/mo" : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationStep({ locationInput, setLocationInput, locations, setLocations, addLocation }: {
  locationInput: string; setLocationInput: (v: string) => void;
  locations: string[]; setLocations: (v: string[]) => void;
  addLocation: () => void;
}) {
  const SUGGESTIONS = ["New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Miami, FL", "Austin, TX", "Seattle, WA", "Denver, CO"];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Add one or more cities, neighborhoods, or ZIP codes where you&apos;d like to live.</p>

      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-3 py-3">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
            placeholder="City, neighborhood, or ZIP…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          onClick={addLocation}
          disabled={!locationInput.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-40 transition"
        >
          Add
        </button>
      </div>

      {locations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {locations.map((loc) => (
            <span key={loc} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-sm font-semibold">
              <MapPin className="w-3 h-3" />{loc}
              <button onClick={() => setLocations(locations.filter((l) => l !== loc))} className="ml-0.5 hover:text-destructive transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Popular cities</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !locations.includes(s)).map((s) => (
            <button
              key={s}
              onClick={() => { if (!locations.includes(s)) setLocations([...locations, s]); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5 transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ timeline, setTimeline }: {
  timeline: string | null; setTimeline: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {TIMELINES.map((t) => (
        <motion.button
          key={t.value}
          whileTap={{ scale: 0.97 }}
          onClick={() => setTimeline(t.value)}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
            timeline === t.value
              ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
              : "border-border bg-card hover:border-primary/30"
          }`}
        >
          <span className="text-3xl">{t.emoji}</span>
          <div className="flex-1">
            <p className={`font-bold text-base ${timeline === t.value ? "text-primary" : "text-foreground"}`}>
              {t.label}
            </p>
            <p className="text-sm text-muted-foreground">{t.sub}</p>
          </div>
          {timeline === t.value && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}

function HomeSizeStep({ bedroomsMin, setBedroomsMin, propertyTypes, togglePropertyType }: {
  bedroomsMin: number | null; setBedroomsMin: (v: number | null) => void;
  propertyTypes: string[]; togglePropertyType: (t: string) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <h3 className="font-bold text-foreground mb-3">Bedrooms (minimum)</h3>
        <div className="grid grid-cols-5 gap-2">
          {BEDROOM_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              whileTap={{ scale: 0.94 }}
              onClick={() => setBedroomsMin(bedroomsMin === opt.value ? null : opt.value)}
              className={`flex flex-col items-center py-3 rounded-2xl border-2 transition-all ${
                bedroomsMin === opt.value
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              <span className="text-xl font-bold">{opt.value === 0 ? "⬜" : opt.value === 4 ? "4+" : opt.value}</span>
              <span className={`text-[10px] font-semibold mt-1 ${bedroomsMin === opt.value ? "text-white/80" : "text-muted-foreground"}`}>
                {opt.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-foreground mb-3">Property Type <span className="text-muted-foreground text-sm font-normal">(select all that apply)</span></h3>
        <div className="grid grid-cols-2 gap-3">
          {PROPERTY_TYPES.map((type) => {
            const active = propertyTypes.includes(type);
            const icons: Record<string, string> = {
              Apartment: "🏢", House: "🏠", Condo: "🏙️", Townhouse: "🏘️",
            };
            return (
              <motion.button
                key={type}
                whileTap={{ scale: 0.96 }}
                onClick={() => togglePropertyType(type)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                <span className="text-2xl">{icons[type]}</span>
                <span className="font-semibold text-sm">{type}</span>
                {active && <Check className="w-4 h-4 ml-auto" />}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AmenitiesStep({ amenities, isAmenityActive, toggleAmenity }: {
  amenities: Amenities;
  isAmenityActive: (key: string, value?: string) => boolean;
  toggleAmenity: (key: string, value?: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Pick all the amenities that are important to you. These help us find your perfect match.</p>

      <div className="grid grid-cols-3 gap-3">
        {AMENITY_OPTIONS.map((opt) => {
          const active = isAmenityActive(opt.key, opt.values?.[0]);
          return (
            <motion.button
              key={opt.label}
              whileTap={{ scale: 0.92 }}
              onClick={() => toggleAmenity(opt.key, opt.values?.[0])}
              className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all relative ${
                active ? "border-primary bg-primary/8 shadow-sm" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {active && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <span className="text-2xl">{opt.emoji}</span>
              <span className={`text-[11px] font-semibold text-center leading-tight ${active ? "text-primary" : "text-muted-foreground"}`}>
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
