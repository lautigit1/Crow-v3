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
    // Intencional: corre una sola vez al montar. Los consumidores suelen
    // pasar un objeto `options` literal inline en cada render -- si
    // `options` estuviera en las deps, el observer se recrearía en cada
    // render de esos consumidores en vez de una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}
