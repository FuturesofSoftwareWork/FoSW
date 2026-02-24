import { Search, X, ArrowUpAz, ArrowDownAz, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AISignalCategory } from "@/types/content";

interface SignalControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  sortField: "date" | "detectedAt";
  setSortField: (field: "date" | "detectedAt") => void;
  categories: AISignalCategory[];
  activeCategory: AISignalCategory | null;
  setActiveCategory: (category: AISignalCategory | null) => void;
  onVisibleCountReset: () => void;
}

const SignalControls = ({
  searchQuery,
  setSearchQuery,
  sortOrder,
  setSortOrder,
  sortField,
  setSortField,
  categories,
  activeCategory,
  setActiveCategory,
  onVisibleCountReset,
}: SignalControlsProps) => {
  return (
    <div className="relative mb-8 group">
      {/* Container with "elevated surface" look adapted for dark mode */}
      <div className="bg-white/5 border border-white/5 border-l-4 border-l-hologram-cyan p-4 flex flex-col gap-4 backdrop-blur-sm transition-all hover:bg-white/10">
        {/* Search Bar */}
        <div className="relative w-full">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-hologram-cyan/70 pointer-events-none transition-colors group-focus-within:text-hologram-cyan">
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Search from signals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/10 text-sm py-2.5 pl-10 pr-8 text-gray-200 placeholder:text-gray-500 placeholder:font-light focus:outline-none focus:border-hologram-cyan/50 focus:ring-1 focus:ring-hologram-cyan/20 transition-all font-mono"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-hologram-cyan/70 uppercase tracking-widest hidden sm:block">
              Sort by:
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setSortField("date")}
                className={`px-3 py-1.5 border rounded-none text-xs font-mono transition-all ${
                  sortField === "date"
                    ? "bg-hologram-cyan/20 text-hologram-cyan border-hologram-cyan"
                    : "bg-black/20 text-gray-400 border-white/10 hover:border-hologram-cyan/30 hover:text-gray-200"
                }`}
              >
                Date
              </button>
              <button
                onClick={() => setSortField("detectedAt")}
                className={`px-3 py-1.5 border rounded-none text-xs font-mono transition-all ${
                  sortField === "detectedAt"
                    ? "bg-hologram-cyan/20 text-hologram-cyan border-hologram-cyan"
                    : "bg-black/20 text-gray-400 border-white/10 hover:border-hologram-cyan/30 hover:text-gray-200"
                }`}
              >
                Scanning Date
              </button>
            </div>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/20 border border-white/10 hover:border-hologram-cyan/30 rounded-none text-xs font-mono text-gray-300 hover:text-hologram-cyan transition-all group/sort"
          >
            <Calendar size={12} className="opacity-70" />
            <span>
              {sortOrder === "desc" ? "Newest First" : "Oldest First"}
            </span>
            {sortOrder === "desc" ? (
              <ArrowDownAz size={14} className="text-hologram-cyan" />
            ) : (
              <ArrowUpAz size={14} className="text-hologram-cyan" />
            )}
          </button>
        </div>

        {/* Category Filter Pills */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            <button
              onClick={() => {
                setActiveCategory(null);
                onVisibleCountReset();
              }}
              className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-all ${
                activeCategory === null
                  ? "bg-hologram-cyan/20 text-hologram-cyan border-hologram-cyan"
                  : "bg-white/5 text-gray-400 border-white/10 hover:border-hologram-cyan/30"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  onVisibleCountReset();
                }}
                className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-all ${
                  activeCategory === cat
                    ? "bg-hologram-cyan/20 text-hologram-cyan border-hologram-cyan"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-hologram-cyan/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Decorative noise/texture overlay hint (simulated with standard CSS for now) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
    </div>
  );
};

export default SignalControls;
