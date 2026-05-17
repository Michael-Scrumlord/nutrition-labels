// hooks/usePageMeta.ts — set per-route <title> and <meta name="description">.
//
// Google's crawler executes client-side JS and will pick up updates made
// here. Social-card crawlers (Facebook, X/Twitter, LinkedIn) do NOT run
// JS, so OG / Twitter tags must live statically in index.html — the
// homepage tags are what those crawlers will see for every URL. If we
// ever want per-route social cards we'll need SSR/SSG.

import { useEffect } from "react";

const SITE_NAME = "Nutrition Label Generator";

function ensureMeta(name: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  return el;
}

function ensureLink(rel: string): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  return el;
}

interface PageMeta {
  /** Page title — `" — Nutrition Label Generator"` is appended automatically
   *  unless the supplied title already contains the site name. */
  title: string;
  description: string;
  /** Path-only canonical (e.g. "/about"). Origin is filled from window.location. */
  canonical?: string;
}

export function usePageMeta({ title, description, canonical }: PageMeta) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;
    ensureMeta("description").content = description;

    if (canonical) {
      ensureLink("canonical").href = window.location.origin + canonical;
    }
  }, [title, description, canonical]);
}
