// hooks/useAdSenseBootstrap.ts — runs the AdSense + CMP script injection
// exactly once on app mount. Called from <App>. The underlying bootstrap
// is itself idempotent (deduped by script src) so StrictMode's
// double-invocation in dev is harmless.

import { useEffect } from "react";
import { bootstrapAdSense } from "../config/adsense";

export function useAdSenseBootstrap(): void {
  useEffect(() => {
    bootstrapAdSense();
  }, []);
}
