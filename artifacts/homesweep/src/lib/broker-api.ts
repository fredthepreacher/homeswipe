const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "") + "/api";

function getToken() {
  return localStorage.getItem("homesweep_token");
}

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json as T;
}

export const brokerApi = {
  getListings: () => request<any[]>("/broker/listings"),

  createListing: (data: {
    price: number;
    address: string;
    city: string;
    state: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    imageUrl: string;
    propertyType: string;
    subtype?: string;
    description: string;
  }) =>
    request<any>("/broker/listings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteListing: (id: number) =>
    request<{ success: boolean }>(`/broker/listings/${id}`, { method: "DELETE" }),

  getInquiries: () => request<any[]>("/broker/inquiries"),
};
