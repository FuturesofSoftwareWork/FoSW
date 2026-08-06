import { useEffect, useMemo, useState, isValidElement } from "react";
import { ExternalLink, Calendar, Tag, BookOpen } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ExpertInsight } from "@/types/content";

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
              h2: ({ node, ...props }) => {
                const isFootnoteLabel =
                  props.id === "footnote-label" ||
                  props.className?.includes("sr-only");
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
              h3: ({ node, ...props }) => (
                <h4
                  className="font-sans text-xl font-bold text-white mt-8 mb-3"
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-5 space-y-3 mb-8" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-5 space-y-3 mb-8" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="pl-1 leading-[1.75]" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mb-8" {...props} />
              ),
              img: ({ node, src, alt, ...props }) => {
                const rawSrc = typeof src === "string" ? src : "";
                const resolved = /^https?:\/\//.test(rawSrc)
                  ? rawSrc
                  : `${import.meta.env.BASE_URL}content/expert-insights/${rawSrc.replace(/^\.?\//, "")}`;
                const caption = typeof alt === "string" ? alt.trim() : "";
                return (
                  <span className="block my-10">
                    <img
                      src={resolved}
                      alt={caption}
                      loading="lazy"
                      decoding="async"
                      className="block w-full rounded-lg border border-white/10"
                      {...props}
                    />
                    {caption && (
                      <span className="block mt-3 text-center text-sm font-sans text-gray-400 italic">
                        {caption}
                      </span>
                    )}
                  </span>
                );
              },
              strong: ({ node, ...props }) => (
                <strong
                  className="text-white font-bold bg-neon-gold/15 px-1 rounded-sm box-decoration-clone"
                  {...props}
                />
              ),
              sup: ({ node, children, ...props }) => {
                const arr = Array.isArray(children) ? children : [children];
                let id = "";
                for (const c of arr) {
                  const href = isValidElement<{ href?: string }>(c) ? c.props.href : undefined;
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
              a: ({ node, ...props }) => {
                const isFnRef =
                  (props as Record<string, unknown>)["data-footnote-ref"] !== undefined;
                const className: string | undefined = props.className;
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
              section: ({ node, ...props }) => {
                const isFootnotes =
                  (props as Record<string, unknown>)["data-footnotes"] !== undefined;
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
              blockquote: ({ node, ...props }) => (
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

export default InsightContent;
