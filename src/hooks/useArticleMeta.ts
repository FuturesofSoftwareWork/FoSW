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

    const isInsight = content.type === "insight";
    const kind = isInsight ? "insights" : "signals";
    const { data } = content;
    const title = data.title;
    const description = isInsight
      ? (data as { excerpt: string }).excerpt
      : (data as { summary: string }).summary;
    const url = `${SITE_URL}/${kind}/${data.id}/`;
    const image = data.image
      ? absoluteUrl(data.image)
      : `${SITE_URL}/hero-bg.png`;

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
        name: isInsight ? (data as { author: string }).author : "VTT",
      },
      datePublished: data.date,
      image,
      url,
      inLanguage: "en",
    });

    return () => {
      applyDefaults();
    };
  }, [content]);
}
