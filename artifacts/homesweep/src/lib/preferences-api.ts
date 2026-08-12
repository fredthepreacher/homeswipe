const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("homeswipe_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface Amenities {
  pool:          boolean;
  petFriendly:   boolean;
  inUnitLaundry: boolean;
  gym:           boolean;
  yard:          boolean;
  parking:       boolean;
  elevator:      boolean;
  garageType:    "none" | "1-car" | "2-car";
}

export interface BuyerPreferences {
  id?:           number;
  userId?:       number;
  budgetMin:     number | null;
  budgetMax:     number | null;
  budgetType:    "rent" | "purchase" | null;
  locations:     string[] | null;
  moveTimeline:  "asap" | "1-3m" | "3-6m" | "6m+" | "browsing" | null;
  bedroomsMin:   number | null;
  propertyTypes: string[] | null;
  amenities:     Amenities | null;
  updatedAt?:    string;
}

export const preferencesApi = {
  async get(): Promise<BuyerPreferences | null> {
    const res = await fetch(`${BASE}/api/preferences`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
  },

  async save(data: Omit<BuyerPreferences, "id" | "userId" | "updatedAt">): Promise<BuyerPreferences> {
    const res = await fetch(`${BASE}/api/preferences`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save preferences");
    return res.json();
  },
};

/* ── Formatting helpers ── */
export function formatBudget(prefs: BuyerPreferences): string {
  const type = prefs.budgetType === "rent" ? "/mo" : "";
  if (prefs.budgetMin && prefs.budgetMax)
    return `$${prefs.budgetMin.toLocaleString()} – $${prefs.budgetMax.toLocaleString()}${type}`;
  if (prefs.budgetMax)
    return `Up to $${prefs.budgetMax.toLocaleString()}${type}`;
  if (prefs.budgetMin)
    return `$${prefs.budgetMin.toLocaleString()}+${type}`;
  return "";
}

export function formatTimeline(t: string | null): string {
  const map: Record<string, string> = {
    asap:     "ASAP",
    "1-3m":   "1–3 Months",
    "3-6m":   "3–6 Months",
    "6m+":    "6+ Months",
    browsing: "Just Browsing",
  };
  return t ? (map[t] ?? t) : "";
}

export function formatBedrooms(n: number | null): string {
  if (n === null) return "";
  if (n === 0) return "Studio+";
  return `${n}+ Bed`;
}

export function activeAmenities(a: Amenities | null): string[] {
  if (!a) return [];
  const list: string[] = [];
  if (a.pool)          list.push("Pool");
  if (a.garageType === "2-car") list.push("2-Car Garage");
  else if (a.garageType === "1-car") list.push("1-Car Garage");
  if (a.petFriendly)   list.push("Pet Friendly");
  if (a.inUnitLaundry) list.push("In-Unit Laundry");
  if (a.gym)           list.push("Gym");
  if (a.yard)          list.push("Backyard");
  if (a.parking)       list.push("Parking");
  if (a.elevator)      list.push("Elevator");
  return list;
}
