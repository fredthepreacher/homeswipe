"use client";

import { useState, useRef, useCallback } from "react";
import { useGetListings } from "@/hooks/use-listings";
import { SwipeCard } from "@/components/SwipeCard";
import { useSwipeActions } from "@/hooks/use-swipe-actions";
import { MapPin, X, Star, Heart, Home as HomeIcon, Play } from "lucide-react";
import { HomeSwipeLogo } from "@/components/HomeSwipeLogo";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

const AD_EVERY = 5;

export default function Home() {
  const { data: listings, isLoading, isError } = useGetListings();
  const { handleSwipe } = useSwipeActions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(30);
  const adTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startAd() {
    setAdCountdown(30);
    setShowAd(true);
    adTimerRef.current = setInterval(() => {
      setAdCountdown((n) => {
        if (n <= 1) {
          clearInterval(adTimerRef.current!);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }

  const dragX = useMotionValue(0);

  const rejectScale = useTransform(dragX, [-130, -20, 0, 20], [1.32, 1.1, 1, 1]);
  const rejectBg    = useTransform(dragX, [-130, -20, 0], ["rgba(244,63,94,0.15)", "rgba(244,63,94,0.06)", "rgba(244,63,94,0)"]);
  const rejectShadow = useTransform(dragX, [-130, -20, 0], ["0 0 20px 6px rgba(244,63,94,0.3)", "0 0 8px 2px rgba(244,63,94,0.12)", "0 0 0px 0px rgba(244,63,94,0)"]);

  const saveScale   = useTransform(dragX, [-20, 0, 20, 130], [1, 1, 1.1, 1.32]);
  const saveBg      = useTransform(dragX, [0, 20, 130], ["rgba(52,211,153,0)", "rgba(52,211,153,0.06)", "rgba(52,211,153,0.15)"]);
  const saveShadow  = useTransform(dragX, [0, 20, 130], ["0 0 0px 0px rgba(52,211,153,0)", "0 0 8px 2px rgba(52,211,153,0.12)", "0 0 20px 6px rgba(52,211,153,0.3)"]);

  type CardRef = { swipeLeft: () => void; swipeRight: () => void };
  const activeCardRef = useRef<CardRef>(null);

  const onDragXChange = useCallback((v: number) => dragX.set(v), [dragX]);

  const onRemoveCard = async (id: number, direction: "left" | "right") => {
    dragX.set(0);
    setCurrentIndex((prev) => prev + 1);
    const next = swipeCount + 1;
    setSwipeCount(next);
    if (next % AD_EVERY === 0) startAd();
    try { await handleSwipe(id, direction); } catch (_) {}
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-20 h-20 flex items-center justify-center bg-primary/10 rounded-3xl mb-6 shadow-lg shadow-primary/15"
        >
          <HomeIcon className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="text-xl font-semibold text-foreground">Finding homes...</h2>
        <p className="text-sm text-muted-foreground mt-1">Curating the best listings for you</p>
      </div>
    );
  }

  if (isError || !listings) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground">We couldn&apos;t load properties. Please try again.</p>
      </div>
    );
  }

  const activeListings = listings.slice(currentIndex, currentIndex + 3).reverse();
  const isExhausted = currentIndex >= listings.length;
  const remaining = listings.length - currentIndex;

  return (
    <div className="h-screen w-full bg-background overflow-hidden flex flex-col">
      <AnimatePresence>
        {showAd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.88, y: 32 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 32 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              className="bg-card rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-br from-primary/80 to-primary h-44 flex flex-col items-center justify-center gap-3 px-4 text-center">
                <Play className="w-10 h-10 text-white/90" strokeWidth={1.5} />
                <p className="text-white font-bold text-lg leading-tight">HomeSwipe Ad</p>
                <p className="text-white/70 text-xs">Your ad message here · 30s</p>
              </div>
              <div className="p-5 flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground text-center">
                  A short message from our partners. Free swipes resume in {adCountdown}s.
                </p>
                {adCountdown === 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setShowAd(false)}
                    className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-2xl text-sm"
                  >
                    Continue Swiping
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-6 py-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-bold">
          <HomeSwipeLogo />
        </h1>
        <div className="flex items-center gap-2">
          {!isExhausted && (
            <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-full">
              {remaining} left
            </span>
          )}
          <div className="bg-background border border-border px-3 py-1.5 rounded-full flex items-center text-sm font-medium shadow-sm">
            <MapPin className="w-4 h-4 text-primary mr-1" />
            Manhattan, NY
          </div>
        </div>
      </header>

      <div
        className="relative w-full max-w-md mx-auto px-4"
        style={{ flex: "1 1 0", minHeight: 0 }}
      >
        {isExhausted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="absolute inset-4 flex flex-col items-center justify-center bg-card rounded-3xl border-2 border-dashed border-border text-center p-8 shadow-sm"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <MapPin className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re all caught up!</h2>
            <p className="text-muted-foreground mb-8 text-sm">
              No more properties in this area. Check back soon.
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setCurrentIndex(0)}
              className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25"
            >
              Start Over
            </motion.button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {activeListings.map((property, idx) => {
              const isTop = idx === activeListings.length - 1;
              return (
                <SwipeCard
                  key={property.id}
                  ref={isTop ? activeCardRef : null}
                  property={property}
                  active={isTop}
                  removeCard={onRemoveCard}
                  zIndex={currentIndex + idx}
                  onDragXChange={isTop ? onDragXChange : undefined}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {!isExhausted && (
        <div className="flex-shrink-0 flex justify-center items-center gap-5 py-4">
          <motion.button
            onClick={() => activeCardRef.current?.swipeLeft()}
            style={{ scale: rejectScale }}
            whileTap={{ scale: 0.86 }}
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-background border border-rose-200/60 text-rose-500 transition-colors overflow-hidden"
          >
            <motion.div className="absolute inset-0 rounded-full" style={{ background: rejectBg }} />
            <motion.div className="absolute inset-0 rounded-full" style={{ boxShadow: rejectShadow }} />
            <X className="w-7 h-7 relative z-10" strokeWidth={2.5} />
          </motion.button>

          <motion.button
            onClick={() => activeCardRef.current?.swipeRight()}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.86 }}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-background border border-sky-200/60 text-sky-500 hover:bg-sky-50 transition-colors"
          >
            <Star className="w-6 h-6" strokeWidth={2.5} />
          </motion.button>

          <motion.button
            onClick={() => activeCardRef.current?.swipeRight()}
            style={{ scale: saveScale }}
            whileTap={{ scale: 0.86 }}
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-background border border-emerald-200/60 text-emerald-500 transition-colors overflow-hidden"
          >
            <motion.div className="absolute inset-0 rounded-full" style={{ background: saveBg }} />
            <motion.div className="absolute inset-0 rounded-full" style={{ boxShadow: saveShadow }} />
            <Heart className="w-7 h-7 relative z-10" strokeWidth={2.5} />
          </motion.button>
        </div>
      )}

      <div className="flex-shrink-0 h-16" />
    </div>
  );
}
