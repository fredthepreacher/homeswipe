"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { BrokerBottomNav } from "@/components/BrokerBottomNav";
import { AdminNav } from "@/components/AdminNav";
import { AdminPreviewBar } from "@/components/AdminPreviewBar";
import { useEffectiveRole, useRealRole, useRoleLoading, isAdmin } from "@/hooks/use-role";
import { usePreview } from "@/context/PreviewContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Gates nav rendering until the authoritative role has loaded — otherwise a
  // broker or admin briefly gets the consumer nav on every page load.
  const roleLoading = useRoleLoading();
  const realRole = useRealRole();
  const effectiveRole = useEffectiveRole();
  const { previewRole } = usePreview();
  const pathname = usePathname();

  const isPreview = isAdmin(realRole) && previewRole !== null;

  function renderNav() {
    if (roleLoading) return null;

    // Admin (not previewing) → admin nav
    if (effectiveRole === "admin") {
      return <AdminNav />;
    }

    // Broker / Landlord
    if (effectiveRole === "broker" || effectiveRole === "landlord") {
      const isThread = /^\/broker\/messages\/[^/]+/.test(pathname);
      if (isThread) return null;
      return <BrokerBottomNav />;
    }

    // Consumer (BottomNav hides itself on thread / preferences pages)
    return <BottomNav />;
  }

  return (
    <div className="mx-auto max-w-md bg-background min-h-screen shadow-2xl relative overflow-hidden ring-1 ring-border sm:my-8 sm:rounded-[3rem] sm:h-[844px] sm:min-h-0 flex flex-col">
      {isPreview && <AdminPreviewBar />}

      <div className="flex-1 relative overflow-y-auto min-h-0">
        {children}
        {renderNav()}
      </div>
    </div>
  );
}
