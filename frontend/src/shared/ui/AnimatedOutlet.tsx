import { useLocation, Outlet } from "react-router-dom";

const STYLE = `
@keyframes routeFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

let injected = false;

function injectStyle() {
  if (injected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = STYLE;
  document.head.appendChild(el);
  injected = true;
}

/**
 * Drop-in replacement for <Outlet> that fades the page in on each route change.
 * Use this inside layout components instead of <Outlet>.
 */
export function AnimatedOutlet() {
  injectStyle();
  const { pathname } = useLocation();

  return (
    <div
      key={pathname}
      style={{ animation: "routeFadeIn 150ms ease both" }}
    >
      <Outlet />
    </div>
  );
}
