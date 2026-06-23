import { useEffect } from "react";

const BASE = "Crow Repuestos";

/**
 * Sets document.title and the meta[name="description"] for the current page.
 * Call at the top of each page component.
 *
 * @param title       Page title — will be appended with " · Crow Repuestos" unless it already contains the brand.
 * @param description Meta description for SEO.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title.includes(BASE) ? title : `${title} · ${BASE}`;

    if (description) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);
}
