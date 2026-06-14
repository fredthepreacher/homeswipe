import React, { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  useSpring,
  PanInfo,
} from "framer-motion";
import { Bed, Bath, Square, MapPin } from "lucide-react";
import { type Listing } from "@workspace/api-client-react";
import { formatPrice } from "@/lib/utils";

interface SwipeCardProps {
  property: Listing;
  active: boolean;
  removeCard: (id: number, action: "left" | "right") => void;
  zIndex: number;
  onDragXChange?: (x: number) => void;
}

export const SwipeCard = React.forwardRef<
  { swipeLeft: () => void; swipeRight: () => void },
  SwipeCardProps
>(({ property, active, removeCard, zIndex, onDragXChange }, ref) => {
  const x = useMotionValue(0);
  const controls = useAnimation();

  // Spring-smoothed x for visual transforms — feels silky, not snappy
  const xSmooth = useSpring(x, { stiffness: 160, damping: 20, mass: 0.6 });

  // Rotation: tilts naturally with drag position, origin at bottom like holding a card
  const rotate = useTransform(xSmooth, [-260, 260], [-20, 20]);

  // Stamp overlays fade in as you drag far enough
  const opacityRight = useTransform(x, [12, 80], [0, 1]);
  const opacityLeft  = useTransform(x, [-12, -80], [0, 1]);

  // Color tint overlays — green on right drag, rose on left
  const greenOpacity = useTransform(x, [0, 130], [0, 0.20]);
  const roseOpacity  = useTransform(x, [0, -130], [0, 0.20]);

  // Shadow intensifies as card moves away from center
  const shadow = useTransform(
    xSmooth,
    [-260, 0, 260],
    [
      "0 28px 60px -8px rgba(0,0,0,0.45), 0 12px 24px -4px rgba(0,0,0,0.3)",
      "0 16px 32px -6px rgba(0,0,0,0.28), 0 6px 12px -3px rgba(0,0,0,0.18)",
      "0 28px 60px -8px rgba(0,0,0,0.45), 0 12px 24px -4px rgba(0,0,0,0.3)",
    ]
  );

  // Propagate x changes to parent for button feedback
  useEffect(() => {
    if (!onDragXChange) return;
    const unsub = x.on("change", onDragXChange);
    return unsub;
  }, [x, onDragXChange]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const DIST = 95;
    const VEL  = 440;
    const goRight = info.offset.x > DIST  || info.velocity.x > VEL;
    const goLeft  = info.offset.x < -DIST || info.velocity.x < -VEL;

    if (goRight) {
      controls.start({
        x: 720, rotate: 24, opacity: 0,
        transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
      });
      setTimeout(() => removeCard(property.id, "right"), 300);
    } else if (goLeft) {
      controls.start({
        x: -720, rotate: -24, opacity: 0,
        transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
      });
      setTimeout(() => removeCard(property.id, "left"), 300);
    } else {
      onDragXChange?.(0);
      controls.start({
        x: 0, rotate: 0,
        transition: { type: "spring", stiffness: 400, damping: 30, mass: 0.75 },
      });
    }
  };

  React.useImperativeHandle(ref, () => ({
    swipeLeft: () => {
      onDragXChange?.(-150);
      setTimeout(() => onDragXChange?.(0), 400);
      controls.start({
        x: -720, rotate: -24, opacity: 0,
        transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
      });
      setTimeout(() => removeCard(property.id, "left"), 300);
    },
    swipeRight: () => {
      onDragXChange?.(150);
      setTimeout(() => onDragXChange?.(0), 400);
      controls.start({
        x: 720, rotate: 24, opacity: 0,
        transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
      });
      setTimeout(() => removeCard(property.id, "right"), 300);
    },
  }));

  return (
    <motion.div
      className="absolute inset-0 origin-bottom select-none"
      style={{ x, rotate, zIndex }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileDrag={{ cursor: "grabbing" }}
      initial={false}
    >
      {/* Animated shadow layer */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ boxShadow: shadow, zIndex: -1 }}
      />

      <div
        className="w-full h-full rounded-3xl overflow-hidden"
        style={{ cursor: active ? "grab" : "default" }}
      >
        {/* SAVE stamp */}
        <motion.div
          style={{ opacity: opacityRight }}
          className="absolute top-10 left-5 z-20 pointer-events-none"
        >
          <div
            className="border-[3px] border-emerald-400 text-emerald-400 font-black text-3xl uppercase tracking-[0.18em] px-4 py-1.5 rounded-xl bg-emerald-400/12 backdrop-blur-sm"
            style={{ transform: "rotate(-13deg)" }}
          >
            SAVE
          </div>
        </motion.div>

        {/* PASS stamp */}
        <motion.div
          style={{ opacity: opacityLeft }}
          className="absolute top-10 right-5 z-20 pointer-events-none"
        >
          <div
            className="border-[3px] border-rose-400 text-rose-400 font-black text-3xl uppercase tracking-[0.18em] px-4 py-1.5 rounded-xl bg-rose-400/12 backdrop-blur-sm"
            style={{ transform: "rotate(13deg)" }}
          >
            PASS
          </div>
        </motion.div>

        {/* Property image */}
        <img
          src={property.imageUrl}
          alt={property.address}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80";
          }}
        />

        {/* Green tint overlay — right swipe feedback */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: useTransform(
              greenOpacity,
              (v: number) => `rgba(52,211,153,${v})`
            ),
          }}
        />

        {/* Rose tint overlay — left swipe feedback */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: useTransform(
              roseOpacity,
              (v: number) => `rgba(251,113,133,${v})`
            ),
          }}
        />

        {/* Info gradient and content */}
        <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-black/93 via-black/52 to-transparent pointer-events-none flex flex-col justify-end p-6 pb-5">
          <div className="flex items-end justify-between mb-1.5">
            <h2 className="text-[2rem] font-bold leading-none text-white drop-shadow-md tracking-tight">
              {formatPrice(property.price)}
            </h2>
            <span className="bg-sky-500/80 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 rounded-full mb-0.5 uppercase tracking-wide">
              {property.propertyType}
            </span>
          </div>

          <div className="flex items-center text-white/85 mb-3.5 text-sm font-medium">
            <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-65 flex-shrink-0" />
            <span className="truncate">
              {property.address}, {property.city}, {property.state}
            </span>
          </div>

          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/12 overflow-hidden w-fit">
            <div className="flex items-center text-white text-sm px-4 py-2.5">
              <Bed className="w-3.5 h-3.5 mr-1.5 opacity-65" />
              <span className="font-semibold">{property.bedrooms}</span>
              <span className="opacity-55 ml-1 text-xs">bd</span>
            </div>
            <div className="w-px h-5 bg-white/15" />
            <div className="flex items-center text-white text-sm px-4 py-2.5">
              <Bath className="w-3.5 h-3.5 mr-1.5 opacity-65" />
              <span className="font-semibold">{property.bathrooms}</span>
              <span className="opacity-55 ml-1 text-xs">ba</span>
            </div>
            <div className="w-px h-5 bg-white/15" />
            <div className="flex items-center text-white text-sm px-4 py-2.5">
              <Square className="w-3.5 h-3.5 mr-1.5 opacity-65" />
              <span className="font-semibold">{property.sqft.toLocaleString()}</span>
              <span className="opacity-55 ml-1 text-xs">sqft</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
SwipeCard.displayName = "SwipeCard";
