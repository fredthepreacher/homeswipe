"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { LayoutDashboard, Users, Building2, ScrollText, LogOut, X } from "lucide-react";

const TABS = [
  { href: "/admin",          Icon: LayoutDashboard, label: "Overview"  },
  { href: "/admin/users",    Icon: Users,           label: "Users"     },
  { href: "/admin/listings", Icon: Building2,       label: "Listings"  },
  { href: "/admin/audit",    Icon: ScrollText,      label: "Audit Log" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [showDialog, setShowDialog] = useState(false);

  async function confirmSignOut() {
    // Navigating alone left the Clerk session intact — the next request would
    // still be authenticated.
    await signOut({ redirectUrl: "/sign-in" });
  }

  return (
    <>
      {showDialog && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowDialog(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-md bg-gray-900 rounded-t-3xl border-t border-gray-700 p-6 pb-10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDialog(false)}
              className="absolute right-4 top-4 p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center">
                <LogOut className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Sign out of Admin?</h2>
                <p className="text-sm text-gray-400 mt-1">
                  You&apos;ll be returned to the login screen. All roles and settings remain unchanged.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={confirmSignOut}
                className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition active:scale-95"
              >
                Yes, sign me out
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className="w-full py-3.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm transition active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-950 border-t border-gray-800 z-50">
        <div className="flex items-center px-1 py-2 pb-safe">
          <div className="flex flex-1 items-center justify-around">
            {TABS.map(({ href, Icon, label }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                    active ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="h-8 w-px bg-gray-800 mx-1 shrink-0" />

          <button
            onClick={() => setShowDialog(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] font-semibold tracking-wide">Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  );
}
