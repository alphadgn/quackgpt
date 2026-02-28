/**
 * GlowBracket – a yellow bracket-and-arrows SVG overlay.
 *
 * Shape:
 *        |          (vertical stem)
 *   ┌────┴────┐     (horizontal bar)
 *   ↓    ↓    ↓     (three arrow tips)
 *
 * A traveling glow pulse sweeps top→bottom over 0.7s.
 * Uses a unique `id` prefix so multiple instances don't clash.
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
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!mounted) return null;

  const gradId = `glowTravel${uid}`;
  const filterId = `bracketGlow${uid}`;
  const markerId = `arrowTip${uid}`;

  return (
    <div
      className={`w-full flex justify-center transition-opacity duration-400 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 300 48"
        className="w-full max-w-[340px] h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Traveling glow gradient – animates top to bottom */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(42 92% 58%)" stopOpacity="0.25">
              <animate
                attributeName="stopOpacity"
                values="0.25;1;0.25"
                dur="0.7s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="hsl(42 92% 68%)" stopOpacity="1">
              <animate
                attributeName="stopOpacity"
                values="1;0.3;1"
                dur="0.7s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="hsl(42 92% 58%)" stopOpacity="0.25">
              <animate
                attributeName="stopOpacity"
                values="0.25;1;0.25"
                dur="0.7s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>

          {/* Glow filter */}
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow marker */}
          <marker
            id={markerId}
            viewBox="0 0 8 8"
            refX="4"
            refY="8"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 L4 8 L8 0" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.5" />
          </marker>
        </defs>

        <g filter={`url(#${filterId})`}>
          {/* Center vertical stem */}
          <line
            x1="150" y1="0" x2="150" y2="16"
            stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round"
          />

          {/* Horizontal bar */}
          <line
            x1="50" y1="16" x2="250" y2="16"
            stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round"
          />

          {/* Left vertical + corner */}
          <line
            x1="50" y1="16" x2="50" y2="44"
            stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />

          {/* Center arrow */}
          <line
            x1="150" y1="16" x2="150" y2="44"
            stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />

          {/* Right arrow */}
          <line
            x1="250" y1="16" x2="250" y2="44"
            stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />
        </g>
      </svg>
    </div>
  );
}
