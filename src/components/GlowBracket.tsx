/**
 * GlowBracket – orange bracket-and-arrows SVG overlay with heartbeat pulse.
 *
 * Shape:
 *        |              (vertical stem from top center)
 *   ┌────┴────┐         (horizontal bar)
 *   |    |    |         (three vertical drops)
 *   ↓    ↓    ↓         (arrow tips)
 *
 * A single heartbeat pulse travels:
 *   Phase 1 (0%–20%):   Down the center stem to the junction
 *   Phase 2 (20%–45%):  Splits left & right along bar to edges
 *   Phase 3 (45%–90%):  All three drops travel down simultaneously to arrow tips
 *   Phase 4 (90%–100%): Fade out, reset
 *
 * One full cycle = 0.7s, synced with the pointing-finger bounce.
 */

import { useId } from "react";

interface GlowBracketProps {
  visible: boolean;
}

export function GlowBracket({ visible }: GlowBracketProps) {
  const uid = useId().replace(/:/g, "");

  const orange = "hsl(18, 95%, 58%)";
  const sw = 2.5;

  // Geometry
  const cx = 150, barY = 14, stemTop = 2;
  const lx = 40, rx = 260;
  const dropEnd = 46, chevronTip = 54;

  // Unique filter/gradient IDs
  const glowId = `glow${uid}`;
  const pulseGrad = `pulse${uid}`;

  // CSS keyframe animation names scoped by uid
  const stemAnim = `stem${uid}`;
  const barLAnim = `barL${uid}`;
  const barRAnim = `barR${uid}`;
  const dropLAnim = `dropL${uid}`;
  const dropCAnim = `dropC${uid}`;
  const dropRAnim = `dropR${uid}`;

  const dur = "0.7s";

  // Keyframes CSS for the heartbeat pulse
  const keyframesCSS = `
    @keyframes ${stemAnim} {
      0%   { offset-distance: 0%; opacity: 1; }
      20%  { offset-distance: 100%; opacity: 1; }
      21%  { opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes ${barLAnim} {
      0%   { offset-distance: 0%; opacity: 0; }
      19%  { opacity: 0; }
      20%  { offset-distance: 0%; opacity: 1; }
      45%  { offset-distance: 100%; opacity: 1; }
      46%  { opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes ${barRAnim} {
      0%   { offset-distance: 0%; opacity: 0; }
      19%  { opacity: 0; }
      20%  { offset-distance: 0%; opacity: 1; }
      45%  { offset-distance: 100%; opacity: 1; }
      46%  { opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes ${dropLAnim} {
      0%   { offset-distance: 0%; opacity: 0; }
      44%  { opacity: 0; }
      45%  { offset-distance: 0%; opacity: 1; }
      90%  { offset-distance: 100%; opacity: 1; }
      95%  { opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes ${dropCAnim} {
      0%   { offset-distance: 0%; opacity: 0; }
      44%  { opacity: 0; }
      45%  { offset-distance: 0%; opacity: 1; }
      90%  { offset-distance: 100%; opacity: 1; }
      95%  { opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes ${dropRAnim} {
      0%   { offset-distance: 0%; opacity: 0; }
      44%  { opacity: 0; }
      45%  { offset-distance: 0%; opacity: 1; }
      90%  { offset-distance: 100%; opacity: 1; }
      95%  { opacity: 0; }
      100% { opacity: 0; }
    }
  `;

  const ballSize = 8;
  const ballStyle = (animName: string, path: string): React.CSSProperties => ({
    position: "absolute" as const,
    width: ballSize,
    height: ballSize,
    borderRadius: "50%",
    background: "radial-gradient(circle, hsl(24,100%,85%) 0%, hsl(18,100%,58%,0) 70%)",
    boxShadow: "0 0 6px 2px hsl(18,100%,65%,0.6)",
    offsetPath: `path("${path}")`,
    offsetRotate: "0deg",
    animation: `${animName} ${dur} ease-in-out infinite`,
    pointerEvents: "none" as const,
  });

  // SVG path strings for each segment (in SVG viewBox coords, scaled via transform)
  // We'll use absolutely positioned divs with offset-path instead
  // But offset-path works better with the SVG coordinate system, so let's use SVG circles with SMIL

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
      <style>{keyframesCSS}</style>
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
          <radialGradient id={pulseGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(24,100%,85%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(18,100%,58%)" stopOpacity="0" />
          </radialGradient>

          {/* Paths for the heartbeat pulse to follow */}
          <path id={`pathStem${uid}`} d={`M${cx},${stemTop} L${cx},${barY}`} />
          <path id={`pathBarL${uid}`} d={`M${cx},${barY} L${lx},${barY}`} />
          <path id={`pathBarR${uid}`} d={`M${cx},${barY} L${rx},${barY}`} />
          <path id={`pathDropL${uid}`} d={`M${lx},${barY} L${lx},${chevronTip}`} />
          <path id={`pathDropC${uid}`} d={`M${cx},${barY} L${cx},${chevronTip}`} />
          <path id={`pathDropR${uid}`} d={`M${rx},${barY} L${rx},${chevronTip}`} />
        </defs>

        <g filter={`url(#${glowId})`}>
          {/* === Static bracket structure === */}

          {/* Top vertical stem */}
          <line x1={cx} y1={stemTop} x2={cx} y2={barY}
            stroke={orange} strokeWidth={sw} strokeLinecap="round" />

          {/* Horizontal bar */}
          <line x1={lx} y1={barY} x2={rx} y2={barY}
            stroke={orange} strokeWidth={sw} strokeLinecap="round" />

          {/* Left vertical drop */}
          <line x1={lx} y1={barY} x2={lx} y2={dropEnd}
            stroke={orange} strokeWidth={sw} strokeLinecap="round" />

          {/* Center vertical drop */}
          <line x1={cx} y1={barY} x2={cx} y2={dropEnd}
            stroke={orange} strokeWidth={sw} strokeLinecap="round" />

          {/* Right vertical drop */}
          <line x1={rx} y1={barY} x2={rx} y2={dropEnd}
            stroke={orange} strokeWidth={sw} strokeLinecap="round" />

          {/* Left arrow chevron */}
          <polyline points={`${lx-8},${dropEnd-8} ${lx},${chevronTip} ${lx+8},${dropEnd-8}`}
            stroke={orange} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Center arrow chevron */}
          <polyline points={`${cx-8},${dropEnd-8} ${cx},${chevronTip} ${cx+8},${dropEnd-8}`}
            stroke={orange} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* Right arrow chevron */}
          <polyline points={`${rx-8},${dropEnd-8} ${rx},${chevronTip} ${rx+8},${dropEnd-8}`}
            stroke={orange} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        {/* === Heartbeat pulse balls using SMIL animateMotion === */}

        {/* Phase 1: Down the center stem */}
        <circle r="5" fill={`url(#${pulseGrad})`}>
          <animateMotion dur={dur} repeatCount="indefinite" keyTimes="0;0.2;0.201;1" keyPoints="0;1;1;1" calcMode="linear">
            <mpath href={`#pathStem${uid}`} />
          </animateMotion>
          <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.19;0.21;1" dur={dur} repeatCount="indefinite" />
        </circle>

        {/* Phase 2: Split left along bar */}
        <circle r="5" fill={`url(#${pulseGrad})`}>
          <animateMotion dur={dur} repeatCount="indefinite" keyTimes="0;0.2;0.45;1" keyPoints="0;0;1;1" calcMode="linear">
            <mpath href={`#pathBarL${uid}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.19;0.2;0.44;0.46;1" dur={dur} repeatCount="indefinite" />
        </circle>

        {/* Phase 2: Split right along bar */}
        <circle r="5" fill={`url(#${pulseGrad})`}>
          <animateMotion dur={dur} repeatCount="indefinite" keyTimes="0;0.2;0.45;1" keyPoints="0;0;1;1" calcMode="linear">
            <mpath href={`#pathBarR${uid}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.19;0.2;0.44;0.46;1" dur={dur} repeatCount="indefinite" />
        </circle>

        {/* Phase 3: Left drop */}
        <circle r="5" fill={`url(#${pulseGrad})`}>
          <animateMotion dur={dur} repeatCount="indefinite" keyTimes="0;0.45;0.9;1" keyPoints="0;0;1;1" calcMode="linear">
            <mpath href={`#pathDropL${uid}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.45;0.89;0.92;1" dur={dur} repeatCount="indefinite" />
        </circle>

        {/* Phase 3: Center drop */}
        <circle r="5" fill={`url(#${pulseGrad})`}>
          <animateMotion dur={dur} repeatCount="indefinite" keyTimes="0;0.45;0.9;1" keyPoints="0;0;1;1" calcMode="linear">
            <mpath href={`#pathDropC${uid}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.45;0.89;0.92;1" dur={dur} repeatCount="indefinite" />
        </circle>

        {/* Phase 3: Right drop */}
        <circle r="5" fill={`url(#${pulseGrad})`}>
          <animateMotion dur={dur} repeatCount="indefinite" keyTimes="0;0.45;0.9;1" keyPoints="0;0;1;1" calcMode="linear">
            <mpath href={`#pathDropR${uid}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.45;0.89;0.92;1" dur={dur} repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
