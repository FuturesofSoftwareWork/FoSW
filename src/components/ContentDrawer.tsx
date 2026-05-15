import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Sparkles,
  Calendar,
  Tag,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Clock,
  LayoutGrid,
  BookOpen,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AISignal, ExpertInsight, DrawerContent } from "@/types/content";

interface ContentDrawerProps {
  content: DrawerContent | null;
  onClose: () => void;
}

const ContentDrawer = ({ content, onClose }: ContentDrawerProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

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
            <div className="sticky top-0 z-10 flex justify-end p-4 bg-midnight/80 backdrop-blur-sm">
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
              {content.type === "signal" ? (
                <SignalContent data={content.data} />
              ) : (
                <InsightContent data={content.data} />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const SignalContent = ({ data }: { data: AISignal }) => {
  return (
    <>
      {/* Top metadata row: source + category + decision horizon */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-hologram-cyan font-mono uppercase tracking-wider">
          <Sparkles size={14} />
          {data.source}
        </div>
        {data.category && (
          <>
            {Array.isArray(data.category) ? (
              data.category.map((cat) => (
                <span
                  key={cat}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full border border-hologram-cyan/30 text-hologram-cyan bg-hologram-cyan/10"
                >
                  <LayoutGrid size={12} />
                  {cat}
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full border border-hologram-cyan/30 text-hologram-cyan bg-hologram-cyan/10">
                <LayoutGrid size={12} />
                {data.category}
              </span>
            )}
          </>
        )}
        {data.decisionHorizon && (
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full border border-electric-blue/30 text-electric-blue bg-electric-blue/10">
            <Clock size={12} />
            {data.decisionHorizon}
          </span>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Calendar size={14} className="text-hologram-cyan" />
        <span className="text-hologram-cyan font-mono">
          {new Date(data.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        <span className="text-gray-500 ml-1">
          (Signal scanned:{" "}
          {new Date(data.detectedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          )
        </span>
      </div>

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 leading-tight">
        {data.title}
      </h2>

      {/* Summary */}
      <div className="prose prose-invert max-w-none">
        <p className="text-gray-300 leading-relaxed">{data.summary}</p>
      </div>

      {/* Why It Matters */}
      {data.whyItMatters && data.whyItMatters.length > 0 && (
        <div className="mt-10">
          <h3 className="flex items-center gap-2 text-sm font-bold text-hologram-cyan uppercase tracking-widest mb-4">
            <Lightbulb size={16} />
            Why It Matters
          </h3>
          <ul className="space-y-3">
            {data.whyItMatters.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-gray-300 text-sm leading-relaxed"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-hologram-cyan shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      {data.recommendedActions && data.recommendedActions.length > 0 && (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4">
            <CheckCircle size={16} />
            Recommended Actions
          </h3>
          <ul className="space-y-3">
            {data.recommendedActions.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-gray-300 text-sm leading-relaxed"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks & Caveats */}
      {data.risksAndCaveats && data.risksAndCaveats.length > 0 && (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">
            <AlertTriangle size={16} />
            Risks & Caveats
          </h3>
          <ul className="space-y-3">
            {data.risksAndCaveats.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-gray-300 text-sm leading-relaxed"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2">
          <Tag size={14} className="text-hologram-cyan mt-1" />
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs font-mono rounded-full border border-hologram-cyan/30 text-hologram-cyan bg-hologram-cyan/5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Source link */}
      {data.sourceUrl && (
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 text-hologram-cyan hover:text-white border border-hologram-cyan/50 px-6 py-3 rounded-full hover:bg-hologram-cyan/20 transition-all text-sm font-bold uppercase tracking-widest"
        >
          View Source <ExternalLink size={14} />
        </a>
      )}
    </>
  );
};

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

const extractFootnotes = (markdown: string): Record<string, string> => {
  const map: Record<string, string> = {};
  const regex = /^\[\^([^\]]+)\]:[ \t]+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    map[match[1]] = match[2].trim();
  }
  return map;
};

const InsightContent = ({ data }: { data: ExpertInsight }) => {
  const [fetchedMarkdown, setFetchedMarkdown] = useState<string | null>(null);

  useEffect(() => {
    if (data.markdownFile) {
      const baseUrl = import.meta.env.BASE_URL;
      const path = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      fetch(`${path}content/expert-insights/${data.markdownFile}`)
        .then((res) => res.text())
        .then((text) => setFetchedMarkdown(text))
        .catch((err) => console.error("Failed to load markdown file:", err));
    } else {
      setFetchedMarkdown(null);
    }
  }, [data.markdownFile]);

  const formattedDate = new Date(data.date).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const markdownSource = fetchedMarkdown || data.markdownContent || "";
  const footnoteMap = useMemo(
    () => (markdownSource ? extractFootnotes(markdownSource) : {}),
    [markdownSource],
  );

  const readMinutes = useMemo(() => {
    let text = "";
    if (fetchedMarkdown) text = fetchedMarkdown;
    else if (data.markdownContent) text = data.markdownContent;
    else if (data.content)
      text = data.content
        .map((b) => {
          if (b.type === "list") return b.items.join(" ");
          if ("text" in b) return b.text;
          return "";
        })
        .join(" ");
    else if (data.paragraphs) text = data.paragraphs.join(" ");
    if (!text) return 0;
    return Math.max(1, Math.ceil(countWords(text) / 220));
  }, [fetchedMarkdown, data]);

  return (
    <div className="max-w-[68ch] mx-auto">
      {/* Author byline */}
      <div className="flex items-center gap-2 mb-4 text-neon-gold font-sans italic text-lg">
        By {data.author} &bull; {data.authorRole}
      </div>

      {/* Date + read time */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-8 text-gray-500 text-sm font-sans">
        <span className="flex items-center gap-2">
          <Calendar size={14} />
          {formattedDate}
        </span>
        {readMinutes > 0 && (
          <span className="flex items-center gap-2 text-neon-gold/80">
            <BookOpen size={14} />
            {readMinutes} min read
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className="font-serif text-3xl md:text-5xl font-black text-white mb-12 leading-[1.15] tracking-tight">
        {data.title}
      </h2>

      {/* Full article body */}
      <div className="prose prose-invert prose-lg max-w-none font-serif text-gray-200 leading-[1.75] selection:bg-neon-gold/30 selection:text-white [counter-reset:section] [&>p:first-of-type]:text-xl [&>p:first-of-type]:text-gray-100 [&>p:first-of-type]:leading-[1.6] [&>p:first-of-type]:mb-10">
        {markdownSource ? (
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ node, ...props }: any) => {
                const isFootnoteLabel =
                  (props as any).id === "footnote-label" ||
                  (props as any).className?.includes("sr-only");
                if (isFootnoteLabel) {
                  return (
                    <h2
                      {...props}
                      className="font-sans text-base font-bold text-white tracking-wide mt-0 mb-2"
                    />
                  );
                }
                return (
                  <h3
                    className="font-sans text-2xl font-bold text-white mt-12 mb-5 pb-2 border-b border-neon-gold/40 [counter-increment:section] before:[content:counter(section,upper-roman)] before:font-serif before:font-black before:text-neon-gold before:text-3xl before:mr-4 before:opacity-80 before:align-baseline"
                    {...props}
                  />
                );
              },
              h3: ({ node, ...props }: any) => (
                <h4
                  className="font-sans text-xl font-bold text-white mt-8 mb-3"
                  {...props}
                />
              ),
              ul: ({ node, ...props }: any) => (
                <ul className="list-disc pl-5 space-y-3 mb-8" {...props} />
              ),
              ol: ({ node, ...props }: any) => (
                <ol className="list-decimal pl-5 space-y-3 mb-8" {...props} />
              ),
              li: ({ node, ...props }: any) => (
                <li className="pl-1 leading-[1.75]" {...props} />
              ),
              p: ({ node, ...props }: any) => (
                <p className="mb-8" {...props} />
              ),
              strong: ({ node, ...props }: any) => (
                <strong
                  className="text-white font-bold bg-neon-gold/15 px-1 rounded-sm box-decoration-clone"
                  {...props}
                />
              ),
              sup: ({ node, children, ...props }: any) => {
                const arr = Array.isArray(children) ? children : [children];
                let id = "";
                for (const c of arr) {
                  const href = (c as any)?.props?.href as string | undefined;
                  if (href) {
                    const m = href.match(/fn-(.+)$/);
                    if (m) id = decodeURIComponent(m[1]);
                  }
                }
                const text = footnoteMap[id];
                return (
                  <sup
                    className="group relative inline-block align-super text-[0.7em]"
                    {...props}
                  >
                    {children}
                    {text && (
                      <span
                        role="tooltip"
                        className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[calc(100vw-2rem)] p-3 text-sm text-gray-200 bg-midnight border border-neon-gold/40 rounded shadow-xl z-30 font-sans normal-case tracking-normal leading-relaxed text-left"
                      >
                        {text}
                      </span>
                    )}
                  </sup>
                );
              },
              a: ({ node, ...props }: any) => {
                const isFnRef =
                  (props as any)["data-footnote-ref"] !== undefined;
                const className: string | undefined = (props as any).className;
                const isFnBackref = className?.includes(
                  "data-footnote-backref",
                );
                if (isFnRef) {
                  return (
                    <a
                      {...props}
                      className="text-neon-gold font-bold no-underline hover:text-white px-0.5"
                    />
                  );
                }
                if (isFnBackref) {
                  return (
                    <a
                      {...props}
                      className="text-neon-gold/60 no-underline ml-1 hover:text-neon-gold"
                    />
                  );
                }
                return (
                  <a
                    {...props}
                    className="text-hologram-cyan underline decoration-hologram-cyan/40 underline-offset-4 hover:decoration-hologram-cyan transition-colors"
                  />
                );
              },
              section: ({ node, ...props }: any) => {
                const isFootnotes =
                  (props as any)["data-footnotes"] !== undefined;
                if (isFootnotes) {
                  return (
                    <section
                      {...props}
                      className="not-prose mt-10 pt-4 border-t border-neon-gold/20 text-[12px] font-sans text-gray-400 leading-[1.4] [&_ol]:list-decimal [&_ol]:pl-3 [&_ol]:space-y-1 [&_ol]:m-0 [&_ol]:marker:text-gray-500 md:[&_ol]:columns-2 md:[&_ol]:gap-x-6 [&_li]:break-inside-avoid [&_li]:pl-0.5 [&_li]:leading-[1.4] [&_li_p]:m-0 [&_li_p]:inline [&_a.data-footnote-backref]:text-[11px]"
                    />
                  );
                }
                return <section {...props} />;
              },
              hr: () => (
                <div
                  className="flex justify-center my-14 text-neon-gold/60 select-none"
                  aria-hidden="true"
                >
                  <span className="text-2xl tracking-[1em]">···</span>
                </div>
              ),
              blockquote: ({ node, ...props }: any) => (
                <blockquote
                  className="border-l-4 border-neon-gold pl-6 my-10 text-xl text-gray-100 leading-relaxed bg-neon-gold/5 py-4 pr-4 not-italic"
                  {...props}
                />
              ),
            }}
          >
            {markdownSource}
          </Markdown>
        ) : data.content ? (
          data.content.map((block, index) => {
            switch (block.type) {
              case "heading2":
                return (
                  <h3
                    key={index}
                    className="font-sans text-2xl font-bold text-white mt-12 mb-5 pb-2 border-b border-neon-gold/40 [counter-increment:section] before:[content:counter(section,upper-roman)] before:font-serif before:font-black before:text-neon-gold before:text-3xl before:mr-4 before:opacity-80 before:align-baseline"
                  >
                    {block.text}
                  </h3>
                );
              case "heading3":
                return (
                  <h4
                    key={index}
                    className="font-sans text-xl font-bold text-white mt-8 mb-3"
                  >
                    {block.text}
                  </h4>
                );
              case "list":
                return (
                  <ul key={index} className="list-disc pl-5 space-y-3 mb-8">
                    {block.items.map((item, i) => (
                      <li key={i} className="leading-[1.75]">
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              case "paragraph":
                return (
                  <p
                    key={index}
                    className="mb-8 first-of-type:text-xl first-of-type:text-gray-100 first-of-type:leading-[1.6] first-of-type:mb-10"
                  >
                    {block.text}
                  </p>
                );
              default:
                return null;
            }
          })
        ) : (
          data.paragraphs?.map((paragraph, index) => (
            <p
              key={index}
              className="mb-8 first-of-type:text-xl first-of-type:text-gray-100 first-of-type:leading-[1.6] first-of-type:mb-10"
            >
              {paragraph}
            </p>
          ))
        )}
      </div>

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <div className="mt-12 flex flex-wrap gap-2 font-sans">
          <Tag size={14} className="text-neon-gold mt-1" />
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs font-mono rounded-full border border-neon-gold/30 text-neon-gold bg-neon-gold/5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* External Link */}
      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 text-neon-gold hover:text-white border border-neon-gold/50 px-6 py-3 rounded-full hover:bg-neon-gold/20 transition-all text-sm font-bold uppercase tracking-widest font-sans"
        >
          Link to Original Article <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
};

export default ContentDrawer;
