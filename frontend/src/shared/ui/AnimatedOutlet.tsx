import { useLocation, Outlet } from "react-router-dom";

/**
 * Drop-in replacement for <Outlet> that fades the page in on each route change.
 * Use this inside layout components instead of <Outlet>.
 *
 * The `routeFadeIn` keyframe now lives in app/styles/index.css (same
 * treatment the M6 audit fix already gave the shimmer animation) instead of
 * being injected into <head> via JS on first render.
 */
export function AnimatedOutlet() {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="animate-[routeFadeIn_150ms_ease_both]">
      <Outlet />
    </div>
  );
}
