import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Check } from "lucide-react";
import type { DrawerContent } from "@/types/content";
import SignalContent from "@/components/drawer/SignalContent";
import InsightContent from "@/components/drawer/InsightContent";

interface ContentDrawerProps {
  content: DrawerContent | null;
  onClose: () => void;
}

const ContentDrawer = ({ content, onClose }: ContentDrawerProps) => {
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

  const isSignal = content?.type === "signal";
  const isInsight = content?.type === "insight";

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
            aria-label={
              isSignal ? "AI Signal details" : "Expert Insight article"
            }
            className={`relative w-full ${
              isSignal ? "max-w-2xl" : "max-w-4xl"
            } bg-midnight/95 backdrop-blur-md border-l-4 overflow-y-auto ${
              isSignal ? "border-l-hologram-cyan" : "border-l-neon-gold"
            }`}
          >
            {/* Close button */}
            <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-midnight/80 backdrop-blur-sm">
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider px-3 py-2 rounded-full transition-all focus:outline-none focus:ring-2 ${
                  isSignal
                    ? "text-hologram-cyan hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50"
                    : "text-neon-gold hover:bg-neon-gold/20 focus:ring-neon-gold/50"
                }`}
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
                className={`p-2 rounded-full text-gray-400 hover:text-white transition-all focus:outline-none focus:ring-2 ${
                  isSignal
                    ? "hover:bg-hologram-cyan/20 focus:ring-hologram-cyan/50"
                    : "hover:bg-neon-gold/20 focus:ring-neon-gold/50"
                }`}
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
              {content.type === "signal" && <SignalContent data={content.data} />}
              {content.type === "insight" && <InsightContent data={content.data} />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ContentDrawer;
