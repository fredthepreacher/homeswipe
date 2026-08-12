"use client";

import { useState } from "react";
import { useGetSavedListings } from "@/hooks/use-listings";
import type { Listing } from "@/lib/types";
import { Heart, MapPin, Bed, Bath, Square, MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ConsumerInbox } from "@/components/ConsumerInbox";

type Tab = "homes" | "messages";

export default function Saved() {
  const [tab, setTab] = useState<Tab>("homes");

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="pt-safe px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/50">
        <h1 className="text-2xl font-display font-bold text-center tracking-tight mb-3">Favorites</h1>

        <div className="flex rounded-2xl bg-muted p-1 gap-1">
          <TabBtn active={tab === "homes"} onClick={() => setTab("homes")} icon={<Heart className="w-3.5 h-3.5" />}>
            Saved Homes
          </TabBtn>
          <TabBtn active={tab === "messages"} onClick={() => setTab("messages")} icon={<MessageCircle className="w-3.5 h-3.5" />}>
            Messages
          </TabBtn>
        </div>
      </header>

      <main className="flex-1">
        {tab === "homes" ? <HomesTab /> : <ConsumerInbox />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children, icon }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function HomesTab() {
  const { data: savedListings, isLoading } = useGetSavedListings();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="p-4 grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  const hasSaved = savedListings && savedListings.length > 0;

  return (
    <div className="p-4">
      {!hasSaved ? (
        <div className="h-[55vh] flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Heart className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-2">No saved homes yet</h2>
          <p className="text-muted-foreground mb-8">
            Swipe right on properties you love to save them here.
          </p>
          <Link href="/" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/30 hover:-translate-y-1 transition-transform">
            Start Swiping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {savedListings.map((property, idx) => (
            <SavedPropertyCard
              key={property.id}
              property={property}
              index={idx}
              onMessage={() => router.push(`/inbox/new-${property.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedPropertyCard({
  property,
  index,
  onMessage,
}: {
  property: Listing;
  index: number;
  onMessage: () => void;
}) {
  const fallbackImage = `https://images.unsplash.com/photo-${1512917774085 + property.id}?w=600&h=400&fit=crop`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-xl transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={property.imageUrl || fallbackImage}
          alt={property.address}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
        />
        <button className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur-md rounded-full text-success shadow-sm">
          <Heart className="w-4 h-4 fill-success" />
        </button>
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wide">
          {property.propertyType}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-display font-bold text-foreground mb-1">
          {formatPrice(property.price)}
        </h3>
        <p className="text-muted-foreground flex items-center text-xs mb-3">
          <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
          <span className="truncate">{property.address}, {property.city}</span>
        </p>
        <div className="flex items-center justify-between text-foreground/70 text-xs font-medium border-t border-border pt-3 mb-3">
          <div className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5 text-muted-foreground" />{property.bedrooms}
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5 text-muted-foreground" />{property.bathrooms}
          </div>
          <div className="flex items-center gap-1">
            <Square className="w-3.5 h-3.5 text-muted-foreground" />{property.sqft} sqft
          </div>
        </div>

        <button
          onClick={onMessage}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 active:scale-[0.97] transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          Message Agent
        </button>
      </div>
    </motion.div>
  );
}
