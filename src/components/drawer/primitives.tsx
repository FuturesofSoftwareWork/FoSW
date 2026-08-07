import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

/**
 * The shared vocabulary of the drawer. All three bodies consume these so the
 * signal, insight and phenomenon views cannot drift into three different
 * heading scales again — which is exactly what had happened: the phenomenon
 * body had invented `font-serif text-xl` section headings that appear nowhere
 * else on the site, while the signal body used the mono/uppercase/icon pattern.
 * The mono pattern won; it is the one already established in the section
 * headers elsewhere on the page.
 *
 * Full static Tailwind class strings throughout — never interpolate (CLAUDE.md).
 */

export type DrawerTone = "cyan" | "gold" | "emerald" | "amber" | "neutral";

const HEADING_TONE: Record<DrawerTone, string> = {
  cyan: "text-hologram-cyan",
  gold: "text-neon-gold",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  neutral: "text-gray-300",
};

const PANEL_TONE: Record<DrawerTone, string> = {
  cyan: "border-hologram-cyan/25 bg-hologram-cyan/5",
  gold: "border-neon-gold/25 bg-neon-gold/5",
  emerald: "border-emerald-400/25 bg-emerald-400/5",
  amber: "border-amber-400/30 bg-amber-400/5",
  neutral: "border-white/10 bg-white/5",
};

const CHIP_TONE: Record<DrawerTone, string> = {
  cyan: "border-hologram-cyan/30 bg-hologram-cyan/5",
  gold: "border-neon-gold/30 bg-neon-gold/5",
  emerald: "border-emerald-400/30 bg-emerald-400/5",
  amber: "border-amber-400/40 bg-amber-400/10",
  neutral: "border-white/10 bg-white/5",
};

/** The eyebrow above the title: what kind of thing this is, and its one
 *  primary classification. Never more than that — everything else that used to
 *  live up here is now a chip or a disclosure section. */
export const DrawerKicker = ({ children }: { children: ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-widest text-gray-500">
    {children}
  </div>
);

/** The drawer's one section heading. */
export const SectionHeading = ({
  icon: Icon,
  tone = "cyan",
  children,
}: {
  icon?: LucideIcon;
  tone?: DrawerTone;
  children: ReactNode;
}) => (
  <h3
    className={`mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest ${HEADING_TONE[tone]}`}
  >
    {Icon && <Icon size={14} className="shrink-0" />}
    {children}
  </h3>
);

/** Wrapper for the Tier-1 status strip. */
export const StatStrip = ({ children }: { children: ReactNode }) => (
  <div className="mb-6 flex flex-wrap gap-2">{children}</div>
);

/**
 * One scannable fact. When `onClick` is given the chip becomes a button into
 * the section that justifies it, so the fact you can read in a second is also
 * the door to the detail behind it.
 */
export const StatChip = ({
  label,
  tone = "neutral",
  onClick,
  controls,
  children,
}: {
  label: string;
  tone?: DrawerTone;
  onClick?: () => void;
  /** id of the `<details>` this chip opens, for `aria-controls`. */
  controls?: string;
  children: ReactNode;
}) => {
  const base = `flex min-w-[8.5rem] flex-1 flex-col gap-1 rounded-lg border px-3 py-2 text-left ${CHIP_TONE[tone]}`;
  const body = (
    <>
      <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
        {label}
      </span>
      {children}
    </>
  );

  if (!onClick) return <div className={base}>{body}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-controls={controls}
      className={`${base} cursor-pointer transition-colors duration-200 hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 motion-reduce:transition-none`}
    >
      {body}
    </button>
  );
};

/** A bordered panel — used to give each Tier-2 block a distinguishable shape,
 *  so sections are told apart by silhouette rather than by dot colour alone. */
export const Panel = ({
  tone = "neutral",
  children,
}: {
  tone?: DrawerTone;
  children: ReactNode;
}) => (
  <div className={`rounded-lg border p-4 ${PANEL_TONE[tone]}`}>{children}</div>
);

/**
 * A collapsed detail section.
 *
 * Native `<details>` rather than a `useState` toggle on purpose: find-in-page
 * auto-expands it, the content stays in the DOM for the prerendered shell, and
 * the keyboard and screen-reader behaviour comes for free.
 */
export const DisclosureSection = ({
  id,
  title,
  count,
  hint,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  /** One-line preview shown while collapsed, so you know what is inside. */
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) => (
  <details
    id={id}
    open={defaultOpen}
    className="group border-t border-white/10 py-4 [&_summary::-webkit-details-marker]:hidden"
  >
    <summary className="flex cursor-pointer list-none items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue/50">
      <ChevronRight
        size={14}
        aria-hidden="true"
        className="shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
      />
      <span className="font-mono text-xs font-bold uppercase tracking-widest text-gray-300">
        {title}
        {count !== undefined && (
          <span className="ml-1.5 font-normal text-gray-500">({count})</span>
        )}
      </span>
      {hint && (
        <span className="ml-auto hidden truncate text-xs text-gray-500 sm:block sm:group-open:hidden">
          {hint}
        </span>
      )}
    </summary>
    <div className="mt-4 sm:pl-[26px]">{children}</div>
  </details>
);

/**
 * Label/value rows for provenance. Replaces the `.join(" · ")` run-on that
 * flattened eleven heterogeneous fields into one unlabelled string — these are
 * the fields that establish credibility, so they get read as data.
 */
export const MetaList = ({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) => (
  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
    {items.map((item) => (
      <div key={item.label} className="contents">
        <dt className="font-mono text-xs uppercase tracking-wider text-gray-500">
          {item.label}
        </dt>
        <dd className="mb-2 text-sm text-gray-300 sm:mb-0">{item.value}</dd>
      </div>
    ))}
  </dl>
);
