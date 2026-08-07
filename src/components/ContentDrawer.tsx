import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, X, Link2, Check } from "lucide-react";
import type { AISignal, DrawerContent } from "@/types/content";
import type { Phenomenon } from "@/types/phenomenon";
import SignalContent from "@/components/drawer/SignalContent";
import InsightContent from "@/components/drawer/InsightContent";
import PhenomenonContent from "@/components/drawer/PhenomenonContent";

// Full static Tailwind class strings — never interpolate (see CLAUDE.md).
// Each drawer content type gets its own treatment rather than being folded
// into either of the other two: a phenomenon is neither a signal nor an
// insight, and had drifted into "insight" styling by default before this.
const DRAWER_TYPE_META: Record<
  DrawerContent["type"],
  {
    ariaLabel: string;
    maxWidthClassName: string;
    borderClassName: string;
    copyButtonClassName: string;
    closeButtonClassName: string;
    /** Reading-progress bar. Previously drawn for insights only, though the
     *  phenomenon body is the longest of the three. */
    progressClassName: string;
  }
> = {
  signal: {
    ariaLabel: "AI Signal details",
    maxWidthClassName: "max-w-2xl",
    borderClassName: "border-l-hologram-cyan",
    copyButtonClassName:
      "text-hologram-cyan hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50",
    closeButtonClassName: "hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50",
    progressClassName: "bg-hologram-cyan",
  },
  insight: {
    ariaLabel: "Expert Insight article",
    maxWidthClassName: "max-w-4xl",
    borderClassName: "border-l-neon-gold",
    copyButtonClassName:
      "text-neon-gold hover:bg-neon-gold/20 focus:ring-neon-gold/50",
    closeButtonClassName: "hover:bg-neon-gold/20 focus:ring-neon-gold/50",
    progressClassName: "bg-neon-gold",
  },
  phenomenon: {
    ariaLabel: "Phenomenon details",
    maxWidthClassName: "max-w-3xl",
    borderClassName: "border-l-hologram-cyan",
    copyButtonClassName:
      "text-hologram-cyan hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50",
    closeButtonClassName: "hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50",
    progressClassName: "bg-hologram-cyan",
  },
};

interface ContentDrawerProps {
  content: DrawerContent | null;
  onClose: () => void;
  signals: AISignal[];
  phenomena: Phenomenon[];
  onOpenSignal: (signal: AISignal) => void;
  onOpenPhenomenon: (p: Phenomenon) => void;
  onBack?: () => void;
}

const ContentDrawer = ({
  content,
  onClose,
  signals,
  phenomena,
  onOpenSignal,
  onOpenPhenomenon,
  onBack,
}: ContentDrawerProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (content) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [content, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (content) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [content]);

  // Auto-focus close button
  useEffect(() => {
    if (content) {
      closeButtonRef.current?.focus();
    }
  }, [content]);

  // Reset + track scroll progress for the reading progress bar
  useEffect(() => {
    if (!content) return;
    setScrollProgress(0);
    const node = scrollRef.current;
    if (!node) return;
    const handleScroll = () => {
      const max = node.scrollHeight - node.clientHeight;
      setScrollProgress(max > 0 ? (node.scrollTop / max) * 100 : 0);
    };
    node.addEventListener("scroll", handleScroll, { passive: true });
    return () => node.removeEventListener("scroll", handleScroll);
  }, [content]);

  // Scroll back to the top whenever the item itself changes — pushing,
  // popping or replacing all land the reader on a different document, and
  // staying mid-scroll from the previous item defeats the point of Back.
  // Keyed on type + id (not the content object) so it fires only on a
  // genuine item change, not on every re-render.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setScrollProgress(0);
  }, [content?.type, content?.data.id]);

  const meta = content ? DRAWER_TYPE_META[content.type] : DRAWER_TYPE_META.signal;
  const reduceMotion = useReducedMotion();

  // A radar blip carries a 2-4 word label and nothing else — and labels can be
  // switched off entirely — so a phenomenon drawer is a cold open. Keeping the
  // label pinned is what carries the click's context through a long scroll.
  const stickyLabel =
    content?.type === "phenomenon" ? content.data.label : null;

  return (
    <AnimatePresence>
      {content && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            ref={scrollRef}
            initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={
              reduceMotion
                ? { duration: 0.15 }
                : { type: "spring", damping: 25, stiffness: 200 }
            }
            role="dialog"
            aria-modal="true"
            aria-label={meta.ariaLabel}
            className={`relative w-full ${meta.maxWidthClassName} bg-midnight/95 backdrop-blur-md border-l-4 overflow-y-auto ${meta.borderClassName}`}
          >
            {/* Close button */}
            <div className="sticky top-0 z-10 flex items-center gap-2 p-4 bg-midnight/80 backdrop-blur-sm">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
                  aria-label="Back to the previous item"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              {stickyLabel && (
                <span className="min-w-0 truncate font-mono text-xs uppercase tracking-widest text-gray-400">
                  {stickyLabel}
                </span>
              )}
              <button
                onClick={handleCopyLink}
                className={`ml-auto flex items-center gap-2 text-xs font-mono uppercase tracking-wider px-3 py-2 rounded-full transition-all focus:outline-none focus:ring-2 ${meta.copyButtonClassName}`}
                aria-label="Copy link to this article"
              >
                {/* Text drops below `sm` so the label cannot wrap to two lines
                    in the sticky bar; the button keeps its aria-label. */}
                {copied ? (
                  <>
                    <Check size={14} />
                    <span className="hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <Link2 size={14} />
                    <span className="hidden sm:inline">Copy link</span>
                  </>
                )}
              </button>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className={`p-2 rounded-full text-gray-400 hover:text-white transition-all focus:outline-none focus:ring-2 ${meta.closeButtonClassName}`}
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
              <div
                className={`absolute bottom-0 left-0 h-0.5 transition-[width] duration-75 ${meta.progressClassName}`}
                style={{ width: `${scrollProgress}%` }}
                aria-hidden="true"
              />
            </div>

            {/* Content */}
            <div className="px-6 pb-12 md:px-10">
              {content.type === "signal" && (
                <SignalContent
                  data={content.data}
                  phenomena={phenomena}
                  onOpenPhenomenon={onOpenPhenomenon}
                />
              )}
              {content.type === "insight" && <InsightContent data={content.data} />}
              {content.type === "phenomenon" && (
                <PhenomenonContent
                  data={content.data}
                  signals={signals}
                  onOpenSignal={onOpenSignal}
                  related={(content.data.related ?? [])
                    .map((r) => phenomena.find((p) => p.id === r.id))
                    .filter((p): p is Phenomenon => p !== undefined)}
                  onOpenPhenomenon={onOpenPhenomenon}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ContentDrawer;
