import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type PreviewRole = "consumer" | "broker" | "landlord" | null;

interface PreviewContextValue {
  previewRole: PreviewRole;
  setPreviewRole: (role: PreviewRole) => void;
  exitPreview: () => void;
  blockedCount: number;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

// Stable ref accessible outside React (so fetch patch can increment count)
let _setBlockedCount: React.Dispatch<React.SetStateAction<number>> | null = null;

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [previewRole, setPreviewRoleState] = useState<PreviewRole>(null);
  const [blockedCount, setBlockedCount]   = useState(0);
  const origFetch = useRef<typeof fetch>(window.fetch.bind(window));

  // Store setter so fetch patch can use it
  _setBlockedCount = setBlockedCount;

  useEffect(() => {
    const orig = origFetch.current;

    if (previewRole) {
      window.fetch = (input, init) => {
        const method = ((init as RequestInit | undefined)?.method ?? "GET").toUpperCase();
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          _setBlockedCount?.((c) => c + 1);
          // Return a fake success so pages don't error out
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
