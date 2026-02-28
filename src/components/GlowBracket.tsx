/**
 * GlowBracket – a yellow bracket-and-arrows SVG overlay that sits
 * between a heading and a row of three buttons.
 *
 * The bracket is shaped like:
 *        |          (vertical stem from heading)
 *   ┌────┴────┐     (horizontal bar)
 *   ↓    ↓    ↓     (three arrow tips pointing to buttons)
 *
 * A traveling glow pulse travels top→bottom in sync with the
 * horizontal-bounce of the pointing-hand emojis (0.7 s cycle).
 * The component disappears when `visible` is false.
 */

import { useEffect, useState } from "react";

interface GlowBracketProps {
  visible: boolean;
}

export function GlowBracket({ visible }: GlowBracketProps) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!mounted) return null;

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
          <linearGradient id="glowTravel" x1="0" y1="0" x2="0" y2="1">
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
          <filter id="bracketGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arrow marker */}
          <marker
            id="arrowTip"
            viewBox="0 0 8 8"
            refX="4"
            refY="8"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 L4 8 L8 0" fill="none" stroke="url(#glowTravel)" strokeWidth="1.5" />
          </marker>
        </defs>

        <g filter="url(#bracketGlow)">
          {/* Center vertical stem */}
          <line
            x1="150" y1="0" x2="150" y2="16"
            stroke="url(#glowTravel)" strokeWidth="2" strokeLinecap="round"
          />

          {/* Horizontal bar */}
          <line
            x1="50" y1="16" x2="250" y2="16"
            stroke="url(#glowTravel)" strokeWidth="2" strokeLinecap="round"
          />

          {/* Left arrow */}
          <line
            x1="50" y1="16" x2="50" y2="44"
            stroke="url(#glowTravel)" strokeWidth="2" strokeLinecap="round"
            markerEnd="url(#arrowTip)"
          />

          {/* Center arrow */}
          <line
            x1="150" y1="16" x2="150" y2="44"
            stroke="url(#glowTravel)" strokeWidth="2" strokeLinecap="round"
            markerEnd="url(#arrowTip)"
          />

          {/* Right arrow */}
          <line
            x1="250" y1="16" x2="250" y2="44"
            stroke="url(#glowTravel)" strokeWidth="2" strokeLinecap="round"
            markerEnd="url(#arrowTip)"
          />
        </g>
      </svg>
    </div>
  );
}
