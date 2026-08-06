import { useEffect, useRef } from "react";
import type { AISignal, ExpertInsight, DrawerContent } from "@/types/content";
import type { Phenomenon } from "@/types/phenomenon";
import { matchPath, itemPath } from "./deepLinkPath";

interface UseDeepLinkArgs {
  insights: ExpertInsight[];
  signals: AISignal[];
  phenomena: Phenomenon[];
  isLoading: boolean;
  drawerContent: DrawerContent | null;
  setDrawerContent: (c: DrawerContent | null) => void;
}

export function useDeepLink({
  insights,
  signals,
  phenomena,
  isLoading,
  drawerContent,
  setDrawerContent,
}: UseDeepLinkArgs): void {
  const baseUrl = import.meta.env.BASE_URL;
  const initialized = useRef(false);

  // URL -> state: resolve on first load (once content is ready) and on back/forward.
  useEffect(() => {
    if (isLoading) return;

    const openFromUrl = () => {
      const match = matchPath(window.location.pathname, baseUrl);
      if (!match) {
        setDrawerContent(null);
        return;
      }
      if (match.type === "insight") {
        const found = insights.find((i) => i.id === match.id);
        setDrawerContent(found ? { type: "insight", data: found } : null);
      } else if (match.type === "phenomenon") {
        const found = phenomena.find((p) => p.id === match.id);
        setDrawerContent(found ? { type: "phenomenon", data: found } : null);
      } else {
        const found = signals.find((s) => s.id === match.id);
        setDrawerContent(found ? { type: "signal", data: found } : null);
      }
    };

    openFromUrl();
    initialized.current = true;

    window.addEventListener("popstate", openFromUrl);
    return () => window.removeEventListener("popstate", openFromUrl);
  }, [isLoading, insights, signals, phenomena, baseUrl, setDrawerContent]);

  // state -> URL: push a new URL when the user opens/closes the drawer.
  // Skipped until the initial URL resolution has run, so a shared article URL
  // is not clobbered before content finishes loading.
  useEffect(() => {
    if (!initialized.current) return;
    const desired = itemPath(drawerContent, baseUrl);
    const current = window.location.pathname;
    if (current.replace(/\/$/, "") !== desired.replace(/\/$/, "")) {
      window.history.pushState({}, "", desired);
    }
  }, [drawerContent, baseUrl]);
}
