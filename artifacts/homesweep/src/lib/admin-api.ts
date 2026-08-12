const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("homeswipe_token") ?? "";
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export type AdminStats = {
  totalUsers: number;
  totalListings: number;
  totalInquiries: number;
  eventsToday: number;
  usersByRole: { role: string; count: number }[];
};

export type AdminUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  licenseState: string | null;
  brokerage: string | null;
  createdAt: string;
};

export type AdminListing = {
  id: number;
  price: number;
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  imageUrl: string;
  propertyType: string;
  subtype: string | null;
  description: string;
  createdAt: string;
  ownerId: number | null;
  ownerName: string;
};

export type AdminInquiry = {
  id: number;
  listingId: number;
  listingAddress: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

export type AuditLog = {
  id: number;
  userId: number | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
};

export const adminApi = {
  stats:     () => get<AdminStats>("/admin/stats"),
  users:     () => get<AdminUser[]>("/admin/users"),
  listings:  () => get<AdminListing[]>("/admin/listings"),
  inquiries: () => get<AdminInquiry[]>("/admin/inquiries"),
  auditLogs: (limit = 100) => get<AuditLog[]>(`/admin/audit-logs?limit=${limit}`),
};
