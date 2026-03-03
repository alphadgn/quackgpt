import { useRef, useEffect, useCallback } from "react";

/**
 * Wraps content and applies a 3D bend effect based on viewport position.
 * Uses GPU-only composite properties for smooth scrolling performance.
 */
export function ScrollBendContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number>(0);
  const ticking = useRef(false);

  const applyBend = useCallback(() => {
    ticking.current = false;
    const container = containerRef.current;
    if (!container) return;

    const viewH = window.innerHeight;
    const topZone = viewH * 0.33;
    const bottomZone = viewH * 0.67;

    const items = container.querySelectorAll<HTMLElement>("[data-bend]");
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      const elRect = el.getBoundingClientRect();

      // Skip off-screen elements entirely for performance
      if (elRect.bottom < -200 || elRect.top > viewH + 200) continue;

      const elCenter = elRect.top + elRect.height / 2;

      let rotateX = 0;
      let scale = 1;
      let opacity = 1;

      if (elCenter < topZone) {
        const progress = Math.min(1, Math.max(0, 1 - elCenter / topZone));
        rotateX = progress * 63.18;
        scale = 1 - progress * 0.14742;
        opacity = 1 - progress * 1;
      } else if (elCenter > bottomZone) {
        const progress = Math.min(1, Math.max(0, (elCenter - bottomZone) / (viewH - bottomZone)));
        rotateX = -progress * 63.18;
        scale = 1 - progress * 0.14742;
        opacity = 1 - progress * 1;
      }

      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) scale(${scale})`;
      el.style.opacity = String(opacity);
    }
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (!ticking.current) {
      ticking.current = true;
      rafId.current = requestAnimationFrame(applyBend);
    }
  }, [applyBend]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const markChildren = () => {
      Array.from(container.children).forEach((child) => {
        if (child instanceof HTMLElement && !child.hasAttribute("data-bend")) {
          child.setAttribute("data-bend", "");
          child.style.transition = "transform 0.12s linear, opacity 0.12s linear";
          child.style.willChange = "transform, opacity";
          child.style.transformOrigin = "center center";
          child.style.contain = "style";
        }
      });
    };

    markChildren();
    applyBend();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    const observer = new MutationObserver(() => {
      markChildren();
      scheduleUpdate();
    });
    observer.observe(container, { childList: true });

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("scroll", scheduleUpdate);
      container.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      observer.disconnect();
    };
  }, [applyBend, scheduleUpdate]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
