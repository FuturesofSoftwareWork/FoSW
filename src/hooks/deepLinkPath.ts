import type { DrawerContent } from "@/types/content";

export type PathMatch = { type: "insight" | "signal"; id: string };

function normalizeBase(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

// Parse a pathname into an item reference, or null when it is not an item URL.
export function matchPath(pathname: string, baseUrl: string): PathMatch | null {
  const base = normalizeBase(baseUrl);
  let rest = pathname.startsWith(base)
    ? pathname.slice(base.length)
    : pathname.replace(/^\//, "");
  rest = rest.replace(/\/$/, "");
  if (!rest) return null;
  const parts = rest.split("/");
  if (parts.length !== 2) return null;
  const [kind, id] = parts;
  if (!id) return null;
  if (kind === "insights") return { type: "insight", id };
  if (kind === "signals") return { type: "signal", id };
  return null;
}

// Build the in-app path (including base, with trailing slash) for a drawer item.
export function itemPath(
  content: DrawerContent | null,
  baseUrl: string,
): string {
  const base = normalizeBase(baseUrl);
  if (!content) return base;
  const kind = content.type === "insight" ? "insights" : "signals";
  return `${base}${kind}/${content.data.id}/`;
}
