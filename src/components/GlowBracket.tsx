/**
 * GlowBracket – yellow bracket-and-arrows SVG overlay.
 *
 * Shape:
 *        |              (vertical stem from top center)
 *   ┌────┴────┐         (horizontal bar)
 *   |    |    |         (three vertical drops)
 *   ↓    ↓    ↓         (arrow tips)
 *
 * A single light-ball travels: top stem → splits at bar → three drops simultaneously.
 * One full cycle = 0.7s, synced with the pointing-finger bounce.
 */

import { useId } from "react";

interface GlowBracketProps {
  visible: boolean;
}

export function GlowBracket({ visible }: GlowBracketProps) {
  const uid = useId().replace(/:/g, "");

  const yellow = "hsl(42, 92%, 58%)";
  const yellowBright = "hsl(42, 100%, 85%)";
  const sw = 2.5;
  const dur = "0.7s";

  // Unique IDs for this instance
  const glowId = `glow${uid}`;
  const ballStem = `ballStem${uid}`;
  const ballBarL = `ballBarL${uid}`;
  const ballBarR = `ballBarR${uid}`;
  const ballDropL = `ballDropL${uid}`;
  const ballDropC = `ballDropC${uid}`;
  const ballDropR = `ballDropR${uid}`;

  // Geometry
  const cx = 150, barY = 14, stemTop = 2;
  const lx = 40, rx = 260;
  const dropEnd = 48, chevronTip = 52;

  return (
    <div
      className="w-full flex justify-center"
      aria-hidden="true"
      style={{
        margin: "4px 0",
        transition: "opacity 500ms ease, max-height 500ms ease",
        opacity: visible ? 1 : 0,
        maxHeight: visible ? "80px" : "0px",
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 300 62"
        className="w-full h-auto"
        style={{ maxWidth: "100%", minHeight: "40px", overflow: "visible" }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial glow ball */}
          <radialGradient id={`ball${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={yellowBright} stopOpacity="1" />
            <stop offset="100%" stopColor={yellowBright} stopOpacity="0" />
          </radialGradient>
        </defs>

        <g filter={`url(#${glowId})`}>
          {/* === Static bracket structure in base yellow === */}

          {/* Top vertical stem */}
          <line x1={cx} y1={stemTop} x2={cx} y2={barY}
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" />

          {/* Horizontal bar */}
          <line x1={lx} y1={barY} x2={rx} y2={barY}
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" />

          {/* Left vertical drop */}
          <line x1={lx} y1={barY} x2={lx} y2={dropEnd}
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" />

          {/* Center vertical drop */}
          <line x1={cx} y1={barY} x2={cx} y2={dropEnd}
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" />

          {/* Right vertical drop */}
          <line x1={rx} y1={barY} x2={rx} y2={dropEnd}
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" />

          {/* Left arrow chevron */}
          <polyline points={`${lx-8},${dropEnd-8} ${lx},${chevronTip} ${lx+8},${dropEnd-8}`}
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Center arrow chevron */}
          <polyline points={`${cx-8},${dropEnd-8} ${cx},${chevronTip} ${cx+8},${dropEnd-8}`}
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Right arrow chevron */}
          <polyline points={`${rx-8},${dropEnd-8} ${rx},${chevronTip} ${rx+8},${dropEnd-8}`}
            stroke={yellow} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        {/* === Animated light balls === */}

        {/* Ball traveling down center stem (phase 1: 0% → 20%) */}
        <circle r="5" fill={`url(#ball${uid})`} opacity="0">
          <animate attributeName="cx" values={`${cx};${cx}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${stemTop};${barY}`} dur={dur} repeatCount="indefinite"
            keyTimes="0;0.2" keySplines="0.4 0 0.2 1" calcMode="spline" />
          <animate attributeName="opacity" values="1;1;0;0" dur={dur} repeatCount="indefinite"
            keyTimes="0;0.18;0.22;1" calcMode="linear" />
        </circle>

        {/* Ball splitting left along bar (phase 2: 20% → 40%) */}
        <circle r="5" fill={`url(#ball${uid})`} opacity="0">
          <animate attributeName="cx" values={`${cx};${lx}`} dur={dur} repeatCount="indefinite"
            keyTimes="0.2;0.4" keySplines="0.4 0 0.2 1" calcMode="spline" />
          <animate attributeName="cy" values={`${barY};${barY}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0;0" dur={dur} repeatCount="indefinite"
            keyTimes="0;0.2;0.38;0.42;1" calcMode="linear" />
        </circle>

        {/* Ball splitting right along bar (phase 2: 20% → 40%) */}
        <circle r="5" fill={`url(#ball${uid})`} opacity="0">
          <animate attributeName="cx" values={`${cx};${rx}`} dur={dur} repeatCount="indefinite"
            keyTimes="0.2;0.4" keySplines="0.4 0 0.2 1" calcMode="spline" />
          <animate attributeName="cy" values={`${barY};${barY}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0;0" dur={dur} repeatCount="indefinite"
            keyTimes="0;0.2;0.38;0.42;1" calcMode="linear" />
        </circle>

        {/* Left drop ball (phase 3: 40% → 85%) */}
        <circle r="5" fill={`url(#ball${uid})`} opacity="0">
          <animate attributeName="cx" values={`${lx};${lx}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${barY};${chevronTip}`} dur={dur} repeatCount="indefinite"
            keyTimes="0.4;0.85" keySplines="0.4 0 0.2 1" calcMode="spline" />
          <animate attributeName="opacity" values="0;0;1;1;0;0" dur={dur} repeatCount="indefinite"
            keyTimes="0;0.38;0.42;0.83;0.87;1" calcMode="linear" />
        </circle>

        {/* Center drop ball (phase 3: 40% → 85%) */}
        <circle r="5" fill={`url(#ball${uid})`} opacity="0">
          <animate attributeName="cx" values={`${cx};${cx}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${barY};${chevronTip}`} dur={dur} repeatCount="indefinite"
            keyTimes="0.4;0.85" keySplines="0.4 0 0.2 1" calcMode="spline" />
          <animate attributeName="opacity" values="0;0;1;1;0;0" dur={dur} repeatCount="indefinite"
            keyTimes="0;0.38;0.42;0.83;0.87;1" calcMode="linear" />
        </circle>

        {/* Right drop ball (phase 3: 40% → 85%) */}
        <circle r="5" fill={`url(#ball${uid})`} opacity="0">
          <animate attributeName="cx" values={`${rx};${rx}`} dur={dur} repeatCount="indefinite" />
          <animate attributeName="cy" values={`${barY};${chevronTip}`} dur={dur} repeatCount="indefinite"
            keyTimes="0.4;0.85" keySplines="0.4 0 0.2 1" calcMode="spline" />
          <animate attributeName="opacity" values="0;0;1;1;0;0" dur={dur} repeatCount="indefinite"
            keyTimes="0;0.38;0.42;0.83;0.87;1" calcMode="linear" />
        </circle>
      </svg>
    </div>
  );
}
