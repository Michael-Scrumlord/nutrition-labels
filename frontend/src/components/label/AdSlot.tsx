// label/AdSlot.tsx — sidebar advertisement.
//
// Renders nothing until BOTH VITE_ADSENSE_PUBLISHER_ID and
// VITE_ADSENSE_SIDEBAR_SLOT are set to real values — see
// src/config/adsense.ts. That gate is the reason this component is safe
// to leave in the tree before AdSense approval: with placeholders in
// place, nothing about it is visible to the user or to a reviewer.
//
// When configured, it renders a single <ins class="adsbygoogle"> and
// pushes to window.adsbygoogle on mount. Push is idempotent (guarded by
// a ref) so React StrictMode's double-effect in dev doesn't double-push.
//
// A MutationObserver watches data-ad-status on the <ins>; when AdSense
// reports "unfilled" we collapse the whole section so the user never
// sees a styled-empty ad container. (AdSense's Ad Implementation Policy
// requires this behavior.)

import { useEffect, useRef, useState } from "react";
import {
  ADSENSE_PUBLISHER_ID,
  ADSENSE_SIDEBAR_SLOT,
  IS_ADSENSE_CONFIGURED,
} from "../../config/adsense";

declare global {
  interface Window {
    adsbygoogle?: object[];
  }
}

export function AdSlot() {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!IS_ADSENSE_CONFIGURED) return;
    const el = insRef.current;
    if (!el) return;

    if (!pushedRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle ?? []).push({});
        pushedRef.current = true;
      } catch {
        // adsbygoogle.js hasn't finished loading yet. Auto Ads will
        // retry on its own; nothing to do here. Don't set pushedRef so a
        // remount in dev gets another chance.
      }
    }

    const observer = new MutationObserver(() => {
      if (el.getAttribute("data-ad-status") === "unfilled") {
        setHidden(true);
      }
    });
    observer.observe(el, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, []);

  if (!IS_ADSENSE_CONFIGURED || hidden) return null;

  return (
    <section
      aria-label="Advertisement"
      style={{
        width: "100%",
        maxWidth: 380,
        paddingTop: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 9,
          letterSpacing: "0.28em",
          color: "var(--ink-3)",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Advertisement
      </div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: 250 }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={ADSENSE_SIDEBAR_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
