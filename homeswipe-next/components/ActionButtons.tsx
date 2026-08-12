"use client";

import { X, Star, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  onReject: () => void;
  onSuperLike: () => void;
  onSave: () => void;
  disabled?: boolean;
}

export function ActionButtons({ onReject, onSuperLike, onSave, disabled }: ActionButtonsProps) {
  return (
    <div className="absolute bottom-20 left-0 right-0 z-40 flex justify-center items-center gap-6 pb-safe px-4">
      <button
        onClick={onReject}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center w-16 h-16 rounded-full bg-background shadow-lg border border-border/50",
          "text-destructive transition-transform duration-200 hover:scale-110 active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        )}
      >
        <X className="w-8 h-8" strokeWidth={2.5} />
      </button>

      <button
        onClick={onSuperLike}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-full bg-background shadow-lg border border-border/50",
          "text-primary transition-transform duration-200 hover:scale-110 active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        )}
      >
        <Star className="w-6 h-6 fill-primary/20" strokeWidth={2.5} />
      </button>

      <button
        onClick={onSave}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center w-16 h-16 rounded-full bg-background shadow-lg border border-border/50",
          "text-success transition-transform duration-200 hover:scale-110 active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        )}
      >
        <Heart className="w-8 h-8 fill-success/20" strokeWidth={2.5} />
      </button>
    </div>
  );
}
