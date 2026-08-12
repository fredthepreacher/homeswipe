"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { usePreview } from "@/context/PreviewContext";

export type Role = "consumer" | "broker" | "landlord" | "admin";

const ROLES: Role[] = ["consumer", "broker", "landlord", "admin"];

function toRole(value: unknown): Role | null {
  return typeof value === "string" && (ROLES as string[]).includes(value)
    ? (value as Role)
    : null;
}

export interface Me {
  id: string;
  role: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  licenseId: string | null;
  licenseState: string | null;
  brokerage: string | null;
  businessAddress: string | null;
}

/**
 * The caller's user record from Postgres, which is authoritative for role.
 *
 * Deliberately not Clerk publicMetadata: role lives in the database because
 * that is what the API routes and RLS policies enforce against. Reading a
 * mirrored copy on the client meant a failed mirror write showed one role in
 * the nav and a different one to every endpoint.
 */
export function useMe() {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery<Me>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
      return res.json();
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 60_000,
  });
}

/** True until the real role is known, so callers can avoid rendering the wrong nav. */
export function useRoleLoading(): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  const { isPending } = useMe();

  if (!isLoaded) return true;
  // The query is disabled when signed out, which leaves isPending stuck true.
  if (!isSignedIn) return false;
  return isPending;
}

export function useRealRole(): Role {
  const { data } = useMe();
  return toRole(data?.role) ?? "consumer";
}

/** The real role, unless an admin is previewing the app as another role. */
export function useEffectiveRole(): Role {
  const realRole = useRealRole();
  const { previewRole } = usePreview();

  if (previewRole && isAdmin(realRole)) {
    return toRole(previewRole) ?? realRole;
  }
  return realRole;
}

export function isProfessional(role?: string) {
  return role === "broker" || role === "landlord";
}
export function isAdmin(role?: string) {
  return role === "admin";
}
