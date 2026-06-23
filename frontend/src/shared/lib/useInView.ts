import { useEffect, useRef, useState } from "react";

/**
 * Returns a [ref, inView] tuple.
 * `inView` becomes true once the element intersects the viewport and stays true.
 * Useful for triggering CSS reveal animations exactly once on scroll.
 */
export function useInView(options?: IntersectionObserverInit): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, ...options }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, inView];
}
