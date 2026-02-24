import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Newspaper, Sparkles } from "lucide-react";
import { useContent } from "@/hooks/useContent";
import { SignalSkeleton, InsightSkeleton } from "@/components/ContentSkeleton";
import ContentDrawer from "@/components/ContentDrawer";
import SignalControls from "@/components/SignalControls";
import type { AISignalCategory, DrawerContent } from "@/types/content";

const formatDetectedDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const SIGNALS_PER_PAGE = 5;

const ContentStream = () => {
  const { signals, insights, isLoading } = useContent({
    maxInsights: 3,
  });

  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(
    null,
  );
  const closeDrawer = useCallback(() => setDrawerContent(null), []);

  const [activeCategory, setActiveCategory] = useState<AISignalCategory | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortField, setSortField] = useState<"date" | "detectedAt">("date");

  const [visibleCount, setVisibleCount] = useState(SIGNALS_PER_PAGE);

  const categories = useMemo(() => {
    const cats = new Set<AISignalCategory>();
    signals.forEach((s) => {
      if (!s.category) return;
      if (Array.isArray(s.category)) {
        s.category.forEach((c) => cats.add(c));
      } else {
        cats.add(s.category);
      }
    });
    return [...cats].sort();
  }, [signals]);

  const filteredSignals = useMemo(() => {
    let result = signals;

    // Filter by Category
    if (activeCategory) {
      result = result.filter((s) => {
        if (!s.category) return false;
        if (Array.isArray(s.category)) {
          return s.category.includes(activeCategory);
        }
        return s.category === activeCategory;
      });
    }

    // Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.summary.toLowerCase().includes(query),
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      const dateA = new Date(a[sortField]).getTime();
      const dateB = new Date(b[sortField]).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [signals, activeCategory, searchQuery, sortOrder, sortField]);

  const visibleSignals = filteredSignals.slice(0, visibleCount);

  return (
    <section className="bg-midnight min-h-screen py-20 px-4 relative">
      {/* Decorative Glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-electric-blue/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        {/* AI News Column */}
        <div className="relative" id="ai-signal">
          <div className="sticky top-24">
            <div className="flex items-center gap-3 mb-8 border-b border-hologram-cyan/30 pb-4">
              <Bot className="w-8 h-8 text-hologram-cyan" />
              <h2 className="text-3xl font-sans font-bold text-white tracking-wide">
                AI <span className="text-hologram-cyan">Signal</span>
              </h2>
            </div>

            {/* Search and Sort Controls */}
            <SignalControls
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              sortField={sortField}
              setSortField={setSortField}
              categories={categories}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              onVisibleCountReset={() => setVisibleCount(SIGNALS_PER_PAGE)}
            />

            {isLoading ? (
              <SignalSkeleton />
            ) : filteredSignals.length === 0 ? (
              <p className="text-gray-500 text-sm italic py-8">
                No signals in this category.
              </p>
            ) : (
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {visibleSignals.map((signal, index) => (
                    <motion.div
                      key={signal.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() =>
                        setDrawerContent({ type: "signal", data: signal })
                      }
                      className="bg-black/40 border border-hologram-cyan/20 p-6 rounded-none border-l-4 border-l-hologram-cyan hover:bg-hologram-cyan/5 transition-[background-color] group cursor-pointer backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 mb-3 text-xs text-hologram-cyan font-mono uppercase tracking-wider">
                        <Sparkles size={12} />
                        {signal.source} &bull; {formatDetectedDate(signal.date)}{" "}
                        <span className="text-gray-500 normal-case tracking-normal ml-1">
                          (Signal detected{" "}
                          {formatDetectedDate(signal.detectedAt)})
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-100 mb-2 group-hover:text-hologram-cyan transition-colors">
                        {signal.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {signal.summary}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {visibleCount < filteredSignals.length && (
                  <button
                    onClick={() =>
                      setVisibleCount((prev) => prev + SIGNALS_PER_PAGE)
                    }
                    className="w-full py-3 text-sm font-mono text-hologram-cyan border border-hologram-cyan/30 hover:bg-hologram-cyan/10 transition-all"
                  >
                    Show more ({filteredSignals.length - visibleCount}{" "}
                    remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Human Articles Column */}
        <div className="relative mt-12 md:mt-0" id="expert-insights">
          <div className="flex items-center gap-3 mb-8 border-b border-neon-gold/30 pb-4 justify-end md:justify-start">
            <User className="w-8 h-8 text-neon-gold" />
            <h2 className="text-3xl font-sans font-bold text-white">
              Expert <span className="text-neon-gold">Insights</span>
            </h2>
          </div>

          {isLoading ? (
            <InsightSkeleton />
          ) : (
            <div className="space-y-12">
              {insights.map((insight) => (
                <motion.article
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() =>
                    setDrawerContent({ type: "insight", data: insight })
                  }
                  className="bg-white/5 p-8 rounded-xl border border-white/5 hover:border-neon-gold/30 transition-all hover:bg-white/10 cursor-pointer group"
                >
                  <div className="flex items-center gap-2 mb-4 text-neon-gold font-sans italic">
                    By {insight.author} &bull; {insight.authorRole}
                  </div>
                  <h3 className="text-3xl font-sans font-bold text-white mb-4 leading-tight group-hover:text-neon-gold transition-colors">
                    {insight.title}
                  </h3>
                  <div className="prose prose-invert max-w-none text-gray-300 font-sans leading-relaxed">
                    <p>{insight.excerpt}</p>
                  </div>
                  <button className="mt-6 text-neon-gold hover:text-white font-bold uppercase text-xs tracking-widest flex items-center gap-2 border border-neon-gold/30 px-4 py-2 rounded-full hover:bg-neon-gold/20 transition-all">
                    Read More <Newspaper size={14} />
                  </button>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </div>

      <ContentDrawer content={drawerContent} onClose={closeDrawer} />
    </section>
  );
};

export default ContentStream;
