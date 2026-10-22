import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * useScrollAnimation Hook
 * Automatically discovers all elements with `.wow`, `[data-animate]`,
 * `.text-anime-style-1`, `.text-anime-style-2`, `.text-anime-style-3`, and `.image-anime`
 * across the DOM and smoothly animates them when they enter the viewport.
 * Automatically refreshes on route changes.
 */
export function useScrollAnimation() {
  const location = useLocation();

  useEffect(() => {
    // Small timeout to allow React to finish painting DOM on route change
    const timeout = setTimeout(() => {
      const animatedElements = document.querySelectorAll(
        ".wow, [data-animate], .text-anime-style-1, .text-anime-style-2, .text-anime-style-3, .image-anime"
      );

      if (!animatedElements.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target;

              // Extract custom delay and duration if specified
              const delay = el.getAttribute("data-wow-delay") || el.getAttribute("data-delay");
              const duration = el.getAttribute("data-wow-duration") || el.getAttribute("data-duration");

              if (delay) {
                el.style.animationDelay = delay;
                el.style.transitionDelay = delay;
              }
              if (duration) {
                el.style.animationDuration = duration;
                el.style.transitionDuration = duration;
              }

              // Add active animation classes
              el.classList.add("animated");
              el.classList.add("in-view");

              // Once animated, stop observing this element
              observer.unobserve(el);
            }
          });
        },
        {
          root: null,
          rootMargin: "0px 0px -40px 0px",
          threshold: 0.1
        }
      );

      animatedElements.forEach((el) => {
        // Only observe if not already animated
        if (!el.classList.contains("in-view")) {
          // If already in viewport on mount, animate immediately
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            const delay = el.getAttribute("data-wow-delay") || el.getAttribute("data-delay");
            if (delay) {
              el.style.animationDelay = delay;
              el.style.transitionDelay = delay;
            }
            el.classList.add("animated");
            el.classList.add("in-view");
          } else {
            observer.observe(el);
          }
        }
      });

      return () => {
        observer.disconnect();
      };
    }, 100);

    return () => clearTimeout(timeout);
  }, [location.pathname, location.search]);
}
