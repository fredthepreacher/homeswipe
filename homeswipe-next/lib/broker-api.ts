const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Request failed");
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
