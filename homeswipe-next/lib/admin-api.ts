async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" } });
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
  id: string;
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
  ownerId: string | null;
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
  userId: string | null;
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
