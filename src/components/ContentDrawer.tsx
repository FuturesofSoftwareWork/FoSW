import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  }
> = {
  signal: {
    ariaLabel: "AI Signal details",
    maxWidthClassName: "max-w-2xl",
    borderClassName: "border-l-hologram-cyan",
    copyButtonClassName:
      "text-hologram-cyan hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50",
    closeButtonClassName: "hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50",
  },
  insight: {
    ariaLabel: "Expert Insight article",
    maxWidthClassName: "max-w-4xl",
    borderClassName: "border-l-neon-gold",
    copyButtonClassName:
      "text-neon-gold hover:bg-neon-gold/20 focus:ring-neon-gold/50",
    closeButtonClassName: "hover:bg-neon-gold/20 focus:ring-neon-gold/50",
  },
  phenomenon: {
    ariaLabel: "Phenomenon details",
    maxWidthClassName: "max-w-3xl",
    borderClassName: "border-l-hologram-cyan",
    copyButtonClassName:
      "text-hologram-cyan hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50",
    closeButtonClassName: "hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50",
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

  const isInsight = content?.type === "insight";
  const meta = content ? DRAWER_TYPE_META[content.type] : DRAWER_TYPE_META.signal;

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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            aria-label={meta.ariaLabel}
            className={`relative w-full ${meta.maxWidthClassName} bg-midnight/95 backdrop-blur-md border-l-4 overflow-y-auto ${meta.borderClassName}`}
          >
            {/* Close button */}
            <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-midnight/80 backdrop-blur-sm">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
                  aria-label="Back to the previous item"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider px-3 py-2 rounded-full transition-all focus:outline-none focus:ring-2 ${meta.copyButtonClassName}`}
                aria-label="Copy link to this article"
              >
                {copied ? (
                  <>
                    <Check size={14} /> Copied
                  </>
                ) : (
                  <>
                    <Link2 size={14} /> Copy link
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
              {isInsight && (
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-neon-gold transition-[width] duration-75"
                  style={{ width: `${scrollProgress}%` }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Content */}
            <div className="px-8 pb-12">
              {content.type === "signal" &&
                (() => {
                  const partOf = phenomena.filter((p) =>
                    p.evidence.some((e) => e.signalId === content.data.id),
                  );
                  if (partOf.length === 0) return null;
                  return (
                    <p className="mb-6 text-sm text-gray-400">
                      Evidence for{" "}
                      {partOf.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ", "}
                          <button
                            onClick={() => onOpenPhenomenon(p)}
                            className="text-hologram-cyan underline decoration-dotted underline-offset-2 hover:text-white focus:outline-none focus:ring-2 focus:ring-hologram-cyan/50"
                          >
                            {p.label}
                          </button>
                        </span>
                      ))}
                    </p>
                  );
                })()}
              {content.type === "signal" && <SignalContent data={content.data} />}
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
