import { useEffect } from "react";
import type { DrawerContent } from "@/types/content";
import { SITE_URL, SITE_DEFAULTS, absoluteUrl } from "@/config";

const ARTICLE_JSONLD_ID = "article-jsonld";

function setAttr(selector: string, attr: "content" | "href", value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

function removeArticleJsonLd() {
  document.getElementById(ARTICLE_JSONLD_ID)?.remove();
}

function setArticleJsonLd(data: Record<string, unknown>) {
  removeArticleJsonLd();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = ARTICLE_JSONLD_ID;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function applyDefaults() {
  document.title = SITE_DEFAULTS.title;
  setAttr('meta[name="description"]', "content", SITE_DEFAULTS.description);
  setAttr('link[rel="canonical"]', "href", `${SITE_URL}/`);
  setAttr('meta[property="og:title"]', "content", SITE_DEFAULTS.title);
  setAttr('meta[property="og:description"]', "content", SITE_DEFAULTS.description);
  setAttr('meta[property="og:type"]', "content", "website");
  setAttr('meta[property="og:url"]', "content", `${SITE_URL}/`);
  setAttr('meta[property="og:image"]', "content", `${SITE_URL}/hero-bg.png`);
  setAttr('meta[name="twitter:title"]', "content", SITE_DEFAULTS.title);
  setAttr('meta[name="twitter:description"]', "content", SITE_DEFAULTS.description);
  setAttr('meta[name="twitter:image"]', "content", `${SITE_URL}/hero-bg.png`);
  removeArticleJsonLd();
}

export function useArticleMeta(content: DrawerContent | null): void {
  useEffect(() => {
    if (!content) {
      applyDefaults();
      return;
    }

    const { data } = content;
    const kind =
      content.type === "insight"
        ? "insights"
        : content.type === "phenomenon"
          ? "phenomena"
          : "signals";

    const title = data.title;
    const description =
      content.type === "insight"
        ? content.data.excerpt
        : content.type === "phenomenon"
          ? content.data.thesis
          : content.data.summary;
    const datePublished =
      content.type === "phenomenon"
        ? (content.data.latestEvidenceDate ?? content.data.reachReviewedAt)
        : content.data.date;
    const author = content.type === "insight" ? content.data.author : "VTT";
    const image =
      content.type !== "phenomenon" && content.data.image
        ? absoluteUrl(content.data.image)
        : `${SITE_URL}/hero-bg.png`;

    const url = `${SITE_URL}/${kind}/${data.id}/`;

    document.title = `${title} — ${SITE_DEFAULTS.title}`;
    setAttr('meta[name="description"]', "content", description);
    setAttr('link[rel="canonical"]', "href", url);
    setAttr('meta[property="og:title"]', "content", title);
    setAttr('meta[property="og:description"]', "content", description);
    setAttr('meta[property="og:type"]', "content", "article");
    setAttr('meta[property="og:url"]', "content", url);
    setAttr('meta[property="og:image"]', "content", image);
    setAttr('meta[name="twitter:title"]', "content", title);
    setAttr('meta[name="twitter:description"]', "content", description);
    setAttr('meta[name="twitter:image"]', "content", image);

    setArticleJsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      author: {
        "@type": "Person",
        name: author,
      },
      datePublished,
      image,
      url,
      inLanguage: "en",
    });

    return () => {
      applyDefaults();
    };
  }, [content]);
}
