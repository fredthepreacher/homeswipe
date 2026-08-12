"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Building2, Plus, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";

const TABS = [
  { path: "/broker",             icon: LayoutDashboard, label: "Dashboard" },
  { path: "/broker/listings",    icon: Building2,       label: "Listings"  },
  { path: "/broker/add-listing", icon: Plus,            label: "Add"       },
  { path: "/broker/messages",    icon: MessageCircle,   label: "Messages"  },
  { path: "/broker/profile",     icon: User,            label: "Profile"   },
];

export function BrokerBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl shadow-black/10 z-50">
      <div className="flex items-stretch justify-around px-1 h-16">
        {TABS.map((tab) => {
          const isActive = tab.path === "/broker"
            ? pathname === "/broker" || pathname === "/broker/"
            : pathname.startsWith(tab.path);
          const isAdd = tab.path === "/broker/add-listing";

          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 relative transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isAdd ? (
                <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-md shadow-primary/30 -mt-5">
                  <tab.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              ) : (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="broker-nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[9px] font-semibold tracking-wide ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
