import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAdSenseBootstrap } from "./hooks/useAdSenseBootstrap";
import { AppShell } from "./components/layout/AppShell";
import { AboutPage } from "./pages/AboutPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { GuidesIndexPage } from "./pages/guides/GuidesIndexPage";
import { HowToReadANutritionFactsLabel } from "./pages/guides/HowToReadANutritionFactsLabel";
import { FdaLabelRequirementsForHomeBakers } from "./pages/guides/FdaLabelRequirementsForHomeBakers";
import { WhatPercentDailyValueActuallyMeans } from "./pages/guides/WhatPercentDailyValueActuallyMeans";
import { ServingSizeRulesRACCExplained } from "./pages/guides/ServingSizeRulesRACCExplained";
import { LabelingAllergensCorrectly } from "./pages/guides/LabelingAllergensCorrectly";

export function App() {
  // No-op until VITE_ADSENSE_PUBLISHER_ID and VITE_ADSENSE_SIDEBAR_SLOT
  // are set (see src/config/adsense.ts). Lives at the App root so a single
  // bootstrap runs regardless of which route the user lands on first.
  useAdSenseBootstrap();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        <Route path="/guides" element={<GuidesIndexPage />} />
        <Route
          path="/guides/how-to-read-a-nutrition-facts-label"
          element={<HowToReadANutritionFactsLabel />}
        />
        <Route
          path="/guides/fda-label-requirements-for-home-bakers"
          element={<FdaLabelRequirementsForHomeBakers />}
        />
        <Route
          path="/guides/what-percent-daily-value-actually-means"
          element={<WhatPercentDailyValueActuallyMeans />}
        />
        <Route
          path="/guides/serving-size-rules-racc-explained"
          element={<ServingSizeRulesRACCExplained />}
        />
        <Route
          path="/guides/labeling-allergens-correctly"
          element={<LabelingAllergensCorrectly />}
        />

        <Route path="*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}
