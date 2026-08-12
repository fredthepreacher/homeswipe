"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type PreviewRole = "consumer" | "broker" | "landlord" | null;

interface PreviewContextValue {
  previewRole: PreviewRole;
  setPreviewRole: (role: PreviewRole) => void;
  exitPreview: () => void;
  blockedCount: number;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

let _setBlockedCount: React.Dispatch<React.SetStateAction<number>> | null = null;

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [previewRole, setPreviewRoleState] = useState<PreviewRole>(null);
  const [blockedCount, setBlockedCount]   = useState(0);
  const origFetch = useRef<typeof fetch | null>(null);

  if (origFetch.current === null && typeof window !== "undefined") {
    origFetch.current = window.fetch.bind(window);
  }

  _setBlockedCount = setBlockedCount;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const orig = origFetch.current!;

    if (previewRole) {
      window.fetch = (input, init) => {
        const method = ((init as RequestInit | undefined)?.method ?? "GET").toUpperCase();
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          _setBlockedCount?.((c) => c + 1);
          return Promise.resolve(
            new Response(JSON.stringify({ success: true, _preview: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        return orig(input, init);
      };
    } else {
      window.fetch = orig;
    }

    return () => { window.fetch = orig; };
  }, [previewRole]);

  function setPreviewRole(role: PreviewRole) {
    setPreviewRoleState(role);
    setBlockedCount(0);
  }

  function exitPreview() {
    setPreviewRoleState(null);
    setBlockedCount(0);
  }

  return (
    <PreviewContext.Provider value={{ previewRole, setPreviewRole, exitPreview, blockedCount }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error("usePreview must be inside PreviewProvider");
  return ctx;
}
