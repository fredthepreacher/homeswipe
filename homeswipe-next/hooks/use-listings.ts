"use client";

import { useQuery } from "@tanstack/react-query";
import { listingsApi, type Listing } from "@/lib/listings-api";

export const getGetListingsQueryKey = () => ["listings"] as const;
export const getGetSavedListingsQueryKey = () => ["saved-listings"] as const;

export function useGetListings() {
  return useQuery<Listing[]>({
    queryKey: getGetListingsQueryKey(),
    queryFn: listingsApi.getListings,
  });
}

export function useGetSavedListings() {
  return useQuery<Listing[]>({
    queryKey: getGetSavedListingsQueryKey(),
    queryFn: listingsApi.getSaved,
  });
}
