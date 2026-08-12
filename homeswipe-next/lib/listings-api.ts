import type { Listing } from "./types";

export type { Listing };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...((init?.headers as Record<string, string>) || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const listingsApi = {
  getListings: () => apiFetch<Listing[]>("/api/listings"),
  getSaved: () => apiFetch<Listing[]>("/api/saved"),
  swipe: (id: number, direction: "left" | "right") =>
    apiFetch<{ success: boolean; saved: boolean }>(`/api/listings/${id}/swipe`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    }),
};
