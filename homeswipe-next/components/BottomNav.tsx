"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const isHome    = pathname === "/";
  const isSearch  = pathname === "/search";
  const isSaved   = pathname === "/saved";
  const isProfile = pathname === "/profile";

  // Hide nav on full-screen pages
  const isThread      = pathname.startsWith("/inbox/");
  const isPreferences = pathname === "/preferences";
  if (isThread || isPreferences) return null;

  const isSavedOrMessages = isSaved || pathname.startsWith("/inbox");

  const navItems = [
    { href: "/",       icon: Home,   label: "Home",    isActive: isHome },
    { href: "/search", icon: Search, label: "Search",  isActive: isSearch },
    { href: "/saved",  icon: Heart,  label: "Saved",   isActive: isSavedOrMessages },
    { href: "/profile", icon: User,  label: "Profile", isActive: isProfile },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 relative",
              item.isActive
                ? "text-primary scale-110"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <item.icon
              className={cn(
                "w-6 h-6 transition-all duration-300",
                item.isActive && "fill-primary/20 stroke-primary"
              )}
              strokeWidth={item.isActive ? 2.5 : 2}
            />
            {item.isActive && (
              <span className="w-1 h-1 rounded-full bg-primary absolute bottom-1 shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
