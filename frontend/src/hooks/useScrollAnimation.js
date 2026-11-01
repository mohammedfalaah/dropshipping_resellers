import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * useScrollAnimation Hook
 * Automatically discovers all elements with `.wow`, `[data-animate]`,
 * `.text-anime-style-1`, `.text-anime-style-2`, `.text-anime-style-3`, and `.image-anime`
 * across the DOM and smoothly animates them when they enter the viewport.
 * Uses both IntersectionObserver and MutationObserver to detect dynamically mounted content.
 */
export function useScrollAnimation() {
  const location = useLocation();

  useEffect(() => {
    const selector =
      ".wow, [data-animate], .text-anime-style-1, .text-anime-style-2, .text-anime-style-3, .image-anime";

    const revealElement = (el) => {
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

      el.classList.add("animated");
      el.classList.add("in-view");
      el.style.visibility = "visible";
      el.style.opacity = "1";
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -20px 0px",
        threshold: 0.05,
      }
    );

    const checkAndObserve = (el) => {
      if (el.classList.contains("in-view")) return;

      const rect = el.getBoundingClientRect();
      // If already in or above viewport, reveal immediately
      if (rect.top < window.innerHeight + 50 && rect.bottom > -50) {
        revealElement(el);
      } else {
        observer.observe(el);
      }
    };

    const scanAll = () => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(checkAndObserve);
    };

    // Immediate and delayed scan
    scanAll();
    const timeout = setTimeout(scanAll, 120);

    // Watch for dynamic DOM mutations (products, categories, filters changing)
    const mutationObserver = new MutationObserver(() => {
      scanAll();
    });

    if (document.body) {
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [location.pathname, location.search]);
}
