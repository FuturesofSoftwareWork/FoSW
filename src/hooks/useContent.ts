import { useState, useEffect, useCallback } from "react";
import type {
  AISignal,
  ExpertInsight,
  AISignalIndexEntry,
  ExpertInsightIndexEntry,
  ContentIndex,
} from "@/types/content";
import { defaultAISignals, defaultExpertInsights } from "@/data/defaultContent";

interface UseContentOptions {
  maxInsights?: number;
}

interface UseContentReturn {
  signals: AISignal[];
  insights: ExpertInsight[];
  isLoading: boolean;
  error: string | null;
}

export const useContent = ({
  maxInsights = 3,
}: UseContentOptions = {}): UseContentReturn => {
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [insights, setInsights] = useState<ExpertInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const basePath = import.meta.env.BASE_URL;

  const fetchJson = useCallback(async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }, []);

  const fetchContentItems = useCallback(
    async <
      TIndex extends { file: string; status: string; date: string },
      TItem,
    >(
      contentPath: string,
      maxItems: number,
    ): Promise<TItem[]> => {
      const timestamp = new Date().getTime();
      const indexUrl = `${basePath}content/${contentPath}/index.json?t=${timestamp}`;
      const index = await fetchJson<ContentIndex<TIndex>>(indexUrl);

      const published = index.items
        .filter((entry) => entry.status === "published")
        .slice(0, maxItems);

      const results = await Promise.allSettled(
        published.map((entry) =>
          fetchJson<TItem>(
            `${basePath}content/${contentPath}/${entry.file}?t=${timestamp}`,
          ),
        ),
      );

      return results
        .filter(
          (result): result is PromiseFulfilledResult<Awaited<TItem>> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);
    },
    [basePath, fetchJson],
  );

  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      setIsLoading(true);
      setError(null);

      const [signalResult, insightResult] = await Promise.allSettled([
        fetchContentItems<AISignalIndexEntry, AISignal>(
          "ai-signals",
          Infinity,
        ),
        fetchContentItems<ExpertInsightIndexEntry, ExpertInsight>(
          "expert-insights",
          maxInsights,
        ),
      ]);

      if (cancelled) return;

      const fetchedSignals =
        signalResult.status === "fulfilled" && signalResult.value.length > 0
          ? signalResult.value
          : defaultAISignals;

      const fetchedInsights =
        insightResult.status === "fulfilled" && insightResult.value.length > 0
          ? insightResult.value
          : defaultExpertInsights;

      if (
        signalResult.status === "rejected" ||
        insightResult.status === "rejected"
      ) {
        setError("Some content could not be loaded. Showing cached content.");
      }

      setSignals(fetchedSignals);
      setInsights(fetchedInsights);
      setIsLoading(false);
    };

    loadContent();

    return () => {
      cancelled = true;
    };
  }, [maxInsights, fetchContentItems]);

  return { signals, insights, isLoading, error };
};
