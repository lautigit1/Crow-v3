import { useEffect } from "react";

const BASE      = "Crow Repuestos";
const SITE_URL  = "https://crowrepuestos.com.ar";
const OG_IMAGE  = `${SITE_URL}/og-image.png`;

function setMeta(selector: string, content: string, attr = "name") {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${selector}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, selector);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(path: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = `${SITE_URL}${path}`;
}

/**
 * Sets <title>, meta description, Open Graph, and Twitter Card tags for the
 * current page. Call at the top of each page component.
 *
 * @param title       Page title — appended with " · Crow Repuestos" unless brand is already present.
 * @param description Meta description (also used for OG/Twitter).
 * @param image       Optional OG image URL (defaults to site-wide og-image.png).
 */
export function usePageMeta(title: string, description?: string, image?: string) {
  useEffect(() => {
    const fullTitle = title.includes(BASE) ? title : `${title} · ${BASE}`;
    const desc      = description ?? "Repuestos, lubricantes, baterías y detailing para autos, motos y camiones. Atención directa desde Mendoza.";
    const img       = image ?? OG_IMAGE;
    const path      = window.location.pathname + window.location.search;

    // <title>
    document.title = fullTitle;

    // Primary
    setMeta("description", desc);

    // Open Graph
    setMeta("og:title",       fullTitle,             "property");
    setMeta("og:description", desc,                  "property");
    setMeta("og:image",       img,                   "property");
    setMeta("og:url",         `${SITE_URL}${path}`,  "property");

    // Twitter
    setMeta("twitter:title",       fullTitle);
    setMeta("twitter:description", desc);
    setMeta("twitter:image",       img);

    // Canonical
    setCanonical(path);
  }, [title, description, image]);
}
