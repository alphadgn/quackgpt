import { useRef, useEffect, useCallback } from "react";

/**
 * Wraps scrollable content and applies a 3D bend effect:
 * items in the top third rotate away (tilt backward), 
 * items in the bottom third rotate away (tilt forward),
 * items in the center are flat.
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

    const rect = container.getBoundingClientRect();
    const viewH = rect.height;
    const topZone = viewH * 0.33;
    const bottomZone = viewH * 0.67;

    // Direct children with data-bend attribute
    const items = container.querySelectorAll<HTMLElement>("[data-bend]");
    items.forEach((el) => {
      const elRect = el.getBoundingClientRect();
      const elCenter = elRect.top + elRect.height / 2 - rect.top;

      let rotateX = 0;
      let scale = 1;
      let opacity = 1;

      if (elCenter < topZone) {
        // Top third: bend backward
        const progress = 1 - elCenter / topZone; // 0 at boundary, 1 at top
        rotateX = progress * 8; // degrees tilting back
        scale = 1 - progress * 0.04;
        opacity = 1 - progress * 0.3;
      } else if (elCenter > bottomZone) {
        // Bottom third: bend forward
        const progress = (elCenter - bottomZone) / (viewH - bottomZone);
        rotateX = -progress * 8;
        scale = 1 - progress * 0.04;
        opacity = 1 - progress * 0.3;
      }

      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) scale(${scale})`;
      el.style.opacity = String(opacity);
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mark direct section children for bending
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

    // Listen for scroll on the container or window
    const scrollParent = container.closest("[style*='overflow']") || window;
    const onScroll = () => requestAnimationFrame(applyBend);

    window.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("scroll", onScroll, { passive: true });

    // Also re-calc on resize
    window.addEventListener("resize", onScroll, { passive: true });

    // MutationObserver to catch dynamic children
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
