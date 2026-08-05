import { useCallback, useState } from "react";
import Hero from "./components/Hero";
import ContentStream from "./components/ContentStream";
import ContentDrawer from "./components/ContentDrawer";
import AboutProject from "./components/AboutProject";
import WhatIfSection from "./components/WhatIf/WhatIfSection";
import { useContent } from "@/hooks/useContent";
import { useDeepLink } from "@/hooks/useDeepLink";
import { useArticleMeta } from "@/hooks/useArticleMeta";
import type { DrawerContent } from "@/types/content";

function App() {
  const { signals, insights, isLoading } = useContent({
    maxInsights: Infinity,
  });

  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(
    null,
  );
  const closeDrawer = useCallback(() => setDrawerContent(null), []);
  const openDrawer = useCallback(
    (content: DrawerContent) => setDrawerContent(content),
    [],
  );

  useDeepLink({
    insights,
    signals,
    isLoading,
    drawerContent,
    setDrawerContent,
  });

  useArticleMeta(drawerContent);

  return (
    <div className="bg-midnight min-h-screen text-white font-sans selection:bg-electric-blue selection:text-white">
      <Hero />
      <WhatIfSection />
      <ContentStream
        signals={signals}
        insights={insights}
        isLoading={isLoading}
        onOpen={openDrawer}
      />
      <AboutProject />

      <footer className="bg-black py-12 text-center text-gray-500 text-sm">
        <p>© 2026 Alternative Futures of Software Work Project. </p>
        <p className="mt-2">
          A collaboration between VTT, University of Helsinki, and Business
          Finland.
        </p>
      </footer>

      <ContentDrawer content={drawerContent} onClose={closeDrawer} />
    </div>
  );
}

export default App;
