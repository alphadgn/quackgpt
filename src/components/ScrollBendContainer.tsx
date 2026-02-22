import { useRef, useEffect, useCallback } from "react";

/**
 * Wraps content and applies a 3D bend effect based on viewport position:
 * items near the top of the viewport tilt backward,
 * items near the bottom tilt forward,
 * items in the center appear flat.
 */
export function ScrollBendContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const applyBend = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewH = window.innerHeight;
    const topZone = viewH * 0.33;
    const bottomZone = viewH * 0.67;

    const items = container.querySelectorAll<HTMLElement>("[data-bend]");
    items.forEach((el) => {
      const elRect = el.getBoundingClientRect();
      // Center of element relative to the viewport
      const elCenter = elRect.top + elRect.height / 2;

      let rotateX = 0;
      let scale = 1;
      let opacity = 1;

      if (elCenter < topZone) {
        // Top third of viewport: bend backward
        const progress = Math.min(1, Math.max(0, 1 - elCenter / topZone));
        rotateX = progress * 12;
        scale = 1 - progress * 0.05;
        opacity = 1 - progress * 0.4;
      } else if (elCenter > bottomZone) {
        // Bottom third of viewport: bend forward
        const progress = Math.min(1, Math.max(0, (elCenter - bottomZone) / (viewH - bottomZone)));
        rotateX = -progress * 12;
        scale = 1 - progress * 0.05;
        opacity = 1 - progress * 0.4;
      }

      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) scale(${scale})`;
      el.style.opacity = String(opacity);
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const markChildren = () => {
      Array.from(container.children).forEach((child) => {
        if (child instanceof HTMLElement && !child.hasAttribute("data-bend")) {
          child.setAttribute("data-bend", "");
          child.style.transition = "transform 0.15s ease-out, opacity 0.15s ease-out";
          child.style.willChange = "transform, opacity";
          child.style.transformOrigin = "center center";
        }
      });
    };

    markChildren();
    applyBend();

    const onScroll = () => requestAnimationFrame(applyBend);

    window.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const observer = new MutationObserver(() => {
      markChildren();
      applyBend();
    });
    observer.observe(container, { childList: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
    };
  }, [applyBend]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
