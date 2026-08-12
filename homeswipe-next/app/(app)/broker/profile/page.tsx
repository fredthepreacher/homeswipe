"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, LogOut, Settings, Bell, Shield, ChevronRight, Hash, Map, FileText, MapPin } from "lucide-react";

export default function BrokerProfile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  function handleLogout() {
    signOut(() => router.push("/sign-in"));
  }

  const meta = (user?.publicMetadata ?? {}) as Record<string, string | null | undefined>;
  const role = (meta.role as string) ?? "broker";
  const isBroker   = role === "broker";

  const name = user?.fullName ?? user?.username ?? "Agent";
  const contact = user?.primaryEmailAddress?.emailAddress ?? user?.primaryPhoneNumber?.phoneNumber ?? "";

  const menuItems = [
    { icon: Settings, label: "Account Settings" },
    { icon: Bell,     label: "Notifications" },
    { icon: Shield,   label: "Privacy & Security" },
  ];

  const profDetails = [
    isBroker && meta.licenseId
      ? { icon: Hash,     label: "License ID",    value: meta.licenseId as string }
      : null,
    meta.licenseState
      ? { icon: Map,      label: isBroker ? "State of Licensure" : "State of Operation", value: meta.licenseState as string }
      : null,
    meta.brokerage
      ? { icon: FileText, label: isBroker ? "Associated Brokerage" : "Company / Business", value: meta.brokerage as string }
      : null,
    meta.businessAddress
      ? { icon: MapPin,   label: "Business Address", value: meta.businessAddress as string }
      : null,
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 overflow-y-auto">
      <header className="pt-8 pb-6 px-6 bg-card border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-2xl">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold">{name}</h1>
            <p className="text-sm text-muted-foreground">{contact}</p>
            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-0.5 rounded-full text-xs font-bold">
              {isBroker
                ? <><Briefcase className="w-3 h-3" /> Broker</>
                : <><Building2 className="w-3 h-3" /> Landlord</>
              }
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pt-5 space-y-4">
        {profDetails.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Professional Details
            </p>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {profDetails.map((item, i) => (
                <div key={item.label}
                  className={`flex items-center gap-3 px-4 py-3.5 ${
                    i !== profDetails.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Account</p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {menuItems.map((item, i) => (
              <button key={item.label}
                className={`w-full flex items-center p-4 text-left transition hover:bg-muted/50 ${
                  i !== menuItems.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mr-3 shrink-0">
                  <item.icon className="w-4 h-4 text-foreground" />
                </div>
                <span className="flex-1 text-sm font-semibold">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-card rounded-2xl border border-destructive/20 text-destructive font-bold hover:bg-destructive/5 transition"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </main>
    </div>
  );
}
