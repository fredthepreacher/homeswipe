/**
 * HomeSweep logo with:
 *  • "H" shaped as a house (two pillars + peaked roof + door)
 *  • "S" shaped as a swipe gesture (S-curve stroke with arrowheads at each end)
 */
export function HomeSweepLogo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-end gap-0 font-bold tracking-tight leading-none select-none ${className ?? ""}`}
      aria-label="HomeSweep"
    >
      {/* ── H as a house glyph ── */}
      <svg
        width="17"
        height="26"
        viewBox="0 0 17 26"
        fill="none"
        className="text-primary flex-shrink-0"
        aria-hidden="true"
      >
        {/* Peaked roof */}
        <path
          d="M8.5 1.5 L16.5 9 L0.5 9 Z"
          fill="currentColor"
        />
        {/* Left wall */}
        <rect x="0.5" y="9" width="5" height="16" rx="0.6" fill="currentColor" />
        {/* Right wall */}
        <rect x="11.5" y="9" width="5" height="16" rx="0.6" fill="currentColor" />
        {/* Door (cut-out feel via lower opacity) */}
        <rect x="6" y="17.5" width="5" height="7.5" rx="0.8" fill="currentColor" opacity="0.28" />
      </svg>

      {/* "ome" — regular text */}
      <span className="text-foreground" style={{ fontSize: "inherit", lineHeight: 1 }}>
        ome
      </span>

      {/* ── S as a swipe glyph ── */}
      <svg
        width="14"
        height="26"
        viewBox="0 0 14 26"
        fill="none"
        className="text-primary flex-shrink-0"
        aria-hidden="true"
      >
        {/* S-curve stroke */}
        <path
          d="M11.5 6.5 C11.5 6.5 2.5 6 2.5 10.5 C2.5 15 11.5 14 11.5 18.5 C11.5 23 2.5 22.5 2.5 22.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrowhead at top — swipe right direction */}
        <path
          d="M9 3.5 L12 6.5 L9 9.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Arrowhead at bottom — swipe left direction */}
        <path
          d="M5 16.5 L2 19.5 L5 22.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {/* "weep" — regular text */}
      <span className="text-foreground" style={{ fontSize: "inherit", lineHeight: 1 }}>
        weep
      </span>
    </span>
  );
}
