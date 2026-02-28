/**
 * GlowBracket – yellow bracket-and-arrows SVG overlay matching the 1077 sketch.
 *
 * Shape (symmetrical, all lines connected):
 *        |              (vertical stem from top center)
 *   ┌────┴────┐         (horizontal bar)
 *   |    |    |         (three vertical drops)
 *   ↓    ↓    ↓         (arrow tips)
 *
 * A traveling glow pulse sweeps top→bottom continuously.
 * Uses useId() so multiple instances don't clash.
 */

import { useEffect, useState, useId } from "react";

interface GlowBracketProps {
  visible: boolean;
}

export function GlowBracket({ visible }: GlowBracketProps) {
  const [mounted, setMounted] = useState(visible);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    if (visible) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 500);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!mounted) return null;

  const glowId = `bracketGlow${uid}`;
  const travelId = `travelGlow${uid}`;

  // Yellow color matching --primary (hsl 42 92% 58%)
  const yellow = "hsl(42, 92%, 58%)";
  const yellowBright = "hsl(42, 100%, 70%)";
  const sw = 2.5; // stroke width

  return (
    <div
      className={`w-full flex justify-center transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
      style={{ margin: "2px 0" }}
    >
      <svg
        viewBox="0 0 260 44"
        className="w-full max-w-[320px] h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Soft glow filter */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Traveling glow gradient – animates top→bottom */}
          <linearGradient id={travelId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={yellowBright} stopOpacity="0.3">
              <animate
                attributeName="stopOpacity"
                values="1;0.3;0.3;1"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="40%" stopColor={yellow} stopOpacity="1">
              <animate
                attributeName="stopOpacity"
                values="0.3;1;0.3;0.3"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor={yellowBright} stopOpacity="0.3">
              <animate
                attributeName="stopOpacity"
                values="0.3;0.3;1;0.3"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>

        <g filter={`url(#${glowId})`}>
          {/* === Connected bracket path ===
              Start at top center (130,2),
              go down to bar level (130,14),
              bar goes left to (30,14),
              left arrow goes down (30,36),
              jump back to center bar junction,
              center arrow goes down (130,36),
              jump back to right bar junction,
              bar goes right to (230,14),
              right arrow goes down (230,36)
          */}

          {/* Top stem */}
          <line x1="130" y1="2" x2="130" y2="14"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" />

          {/* Horizontal bar - full width */}
          <line x1="30" y1="14" x2="230" y2="14"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" />

          {/* Left vertical drop */}
          <line x1="30" y1="14" x2="30" y2="34"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" />

          {/* Center vertical drop */}
          <line x1="130" y1="14" x2="130" y2="34"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" />

          {/* Right vertical drop */}
          <line x1="230" y1="14" x2="230" y2="34"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" />

          {/* Left arrow tip (chevron) */}
          <polyline points="24,28 30,38 36,28"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Center arrow tip (chevron) */}
          <polyline points="124,28 130,38 136,28"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Right arrow tip (chevron) */}
          <polyline points="224,28 230,38 236,28"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}
