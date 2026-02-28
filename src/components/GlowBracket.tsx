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
 */

import { useId } from "react";

interface GlowBracketProps {
  visible: boolean;
}

export function GlowBracket({ visible }: GlowBracketProps) {
  const uid = useId().replace(/:/g, "");

  const glowId = `bracketGlow${uid}`;
  const travelId = `travelGlow${uid}`;

  const yellow = "hsl(42, 92%, 58%)";
  const yellowBright = "hsl(42, 100%, 75%)";
  const sw = 2.5;

  return (
    <div
      className="w-full flex justify-center"
      aria-hidden="true"
      style={{
        margin: "4px 0",
        transition: "opacity 500ms ease, max-height 500ms ease",
        opacity: visible ? 1 : 0,
        maxHeight: visible ? "60px" : "0px",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 300 52"
        className="w-full h-auto"
        style={{ maxWidth: "100%", minHeight: "36px", overflow: "visible" }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Soft glow filter */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Traveling glow gradient – animates top→bottom */}
          <linearGradient id={travelId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={yellowBright} stopOpacity="1">
              <animate
                attributeName="stopOpacity"
                values="1;0.5;0.5;1"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor={yellow} stopOpacity="1">
              <animate
                attributeName="stopOpacity"
                values="0.5;1;0.5;0.5"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor={yellowBright} stopOpacity="1">
              <animate
                attributeName="stopOpacity"
                values="0.5;0.5;1;0.5"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>

        <g filter={`url(#${glowId})`}>
          {/* Top vertical stem: center top down to bar */}
          <line x1="150" y1="2" x2="150" y2="14"
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" />

          {/* Horizontal bar spanning full width */}
          <line x1="40" y1="14" x2="260" y2="14"
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" />

          {/* Left vertical drop */}
          <line x1="40" y1="14" x2="40" y2="38"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" />

          {/* Center vertical drop */}
          <line x1="150" y1="14" x2="150" y2="38"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" />

          {/* Right vertical drop */}
          <line x1="260" y1="14" x2="260" y2="38"
            stroke={`url(#${travelId})`} strokeWidth={sw} strokeLinecap="round" />

          {/* Left arrow chevron */}
          <polyline points="32,30 40,42 48,30"
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Center arrow chevron */}
          <polyline points="142,30 150,42 158,30"
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Right arrow chevron */}
          <polyline points="252,30 260,42 268,30"
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}
