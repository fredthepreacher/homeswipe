import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import {
  Settings, Bell, Shield, CircleHelp, LogOut, ChevronRight,
  Home, Pencil, DollarSign, MapPin, Clock, Bed, Star, Plus,
} from "lucide-react";
import { preferencesApi, type BuyerPreferences, formatBudget, formatTimeline, formatBedrooms, activeAmenities } from "@/lib/preferences-api";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, navigate]     = useLocation();
  const [prefs, setPrefs] = useState<BuyerPreferences | null>(null);

  useEffect(() => {
    preferencesApi.get().then(setPrefs).catch(() => {});
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const menuItems = [
    { icon: Settings, label: "Account Settings" },
    { icon: Bell,     label: "Notifications" },
    { icon: Shield,   label: "Privacy & Security" },
    { icon: CircleHelp, label: "Help & Support" },
  ];

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      {/* Hero header */}
      <header className="pt-safe px-6 py-8 bg-card border-b border-border/50 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-lg bg-primary/10 shrink-0 flex items-center justify-center">
            <span className="text-primary font-bold text-3xl">{initials}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">{user?.name ?? "User"}</h1>
            <p className="text-muted-foreground font-medium text-sm">{user?.email ?? user?.phone ?? ""}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
              <Home className="w-3 h-3" />
              Renter / Buyer
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 space-y-5">
        {/* ── My Preferences card ── */}
        <PreferencesCard prefs={prefs} onEdit={() => navigate("/preferences")} />

        {/* ── Settings menu ── */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              className={`w-full flex items-center p-5 text-left transition-colors hover:bg-muted/50 active:bg-muted ${
                i !== menuItems.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mr-4 text-foreground">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="flex-1 font-semibold text-foreground text-lg">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* ── Log out ── */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center p-5 bg-card rounded-3xl border border-destructive/20 text-destructive font-bold text-lg hover:bg-destructive/5 transition-colors shadow-sm"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </button>
      </main>
    </div>
  );
}

/* ── Preferences card ────────────────────────────────── */
function PreferencesCard({ prefs, onEdit }: { prefs: BuyerPreferences | null; onEdit: () => void }) {
  const hasPrefs = prefs && (
    prefs.budgetMax || prefs.budgetMin || prefs.locations?.length ||
    prefs.moveTimeline || prefs.bedroomsMin !== null || prefs.propertyTypes?.length || prefs.amenities
  );

  if (!hasPrefs) {
    return (
      <button
        onClick={onEdit}
        className="w-full flex items-center gap-4 p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all group"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-foreground text-base">Set Your Preferences</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tell us your budget, location, and must-haves so we can find your perfect home.
          </p>
        </div>
        <Plus className="w-5 h-5 text-primary shrink-0" />
      </button>
    );
  }

  const amenityList = activeAmenities(prefs.amenities);
  const budget      = formatBudget(prefs);
  const timeline    = formatTimeline(prefs.moveTimeline);
  const bedrooms    = formatBedrooms(prefs.bedroomsMin);

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Star className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
          </div>
          <h2 className="text-base font-bold text-foreground">My Preferences</h2>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      </div>

      {/* Info rows */}
      <div className="px-5 py-4 space-y-3">
        {budget && (
          <PrefsRow icon={<DollarSign className="w-4 h-4" />} label="Budget" value={budget} color="text-green-600" bg="bg-green-50 dark:bg-green-950/30" />
        )}
        {prefs.locations && prefs.locations.length > 0 && (
          <PrefsRow icon={<MapPin className="w-4 h-4" />} label="Location" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950/30">
            <div className="flex flex-wrap gap-1.5">
              {prefs.locations.map((loc) => (
                <span key={loc} className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg">
                  {loc}
                </span>
              ))}
            </div>
          </PrefsRow>
        )}
        {timeline && (
          <PrefsRow icon={<Clock className="w-4 h-4" />} label="Timeline" value={timeline} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-950/30" />
        )}
        {(bedrooms || (prefs.propertyTypes && prefs.propertyTypes.length > 0)) && (
          <PrefsRow icon={<Bed className="w-4 h-4" />} label="Home Size" color="text-purple-600" bg="bg-purple-50 dark:bg-purple-950/30">
            <div className="flex flex-wrap gap-1.5">
              {bedrooms && (
                <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-lg">
                  {bedrooms}
                </span>
              )}
              {prefs.propertyTypes?.map((t) => (
                <span key={t} className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-lg">
                  {t}
                </span>
              ))}
            </div>
          </PrefsRow>
        )}
        {amenityList.length > 0 && (
          <PrefsRow icon={<Star className="w-4 h-4" />} label="Amenities" color="text-rose-600" bg="bg-rose-50 dark:bg-rose-950/30">
            <div className="flex flex-wrap gap-1.5">
              {amenityList.map((a) => (
                <span key={a} className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg">
                  {a}
                </span>
              ))}
            </div>
          </PrefsRow>
        )}
      </div>
    </div>
  );
}

function PrefsRow({ icon, label, value, children, color, bg }: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-lg ${bg} ${color} flex items-center justify-center shrink-0 mt-0.5`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
        {value ? <p className="text-sm font-semibold text-foreground">{value}</p> : children}
      </div>
    </div>
  );
}
