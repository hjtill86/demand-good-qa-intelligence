import { XMLParser } from "fast-xml-parser";
import { getAllRegulatorySources, type RegulatoryCategory, type RegulatorySource } from "./regulatory-sources";
import type { RiskLevel } from "./dashboard-data";

export type LiveRegulatoryItem = {
  agency: string;
  jurisdiction: string;
  title: string;
  link: string;
  publishedAt: string;
  impact: RiskLevel;
  summary: string;
  category: RegulatoryCategory;
  sourceLabel: string;
};

const HIGH_IMPACT_KEYWORDS = ["recall", "warning letter", "safety alert", "outbreak", "emergency", "advisory"];
const MEDIUM_IMPACT_KEYWORDS = ["guidance", "update", "rule", "requirement", "enforcement", "standard"];

function classifyImpact(text: string): RiskLevel {
  const lower = text.toLowerCase();
  if (HIGH_IMPACT_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return "High";
  }
  if (MEDIUM_IMPACT_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return "Medium";
  }
  return "Low";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function normalizeEntries(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [raw as Record<string, unknown>];
}

function parseFeed(xml: string, source: RegulatorySource): LiveRegulatoryItem[] {
  const doc = parser.parse(xml);
  // RSS 2.0: rss.channel.item ; Atom: feed.entry
  const rssItems = normalizeEntries(doc?.rss?.channel?.item);
  const atomItems = normalizeEntries(doc?.feed?.entry);
  const items = rssItems.length > 0 ? rssItems : atomItems;

  return items.slice(0, 15).map((item) => {
    const title = stripHtml(String(item.title ?? "Untitled update"));
    const linkField = item.link;
    const link =
      typeof linkField === "string"
        ? linkField
        : typeof linkField === "object" && linkField !== null
          ? String((linkField as Record<string, unknown>)["@_href"] ?? "")
          : "";
    const description = stripHtml(String(item.description ?? item.summary ?? ""));
    const publishedRaw = String(item.pubDate ?? item.updated ?? item.published ?? "");
    const publishedAt = publishedRaw && !Number.isNaN(Date.parse(publishedRaw))
      ? new Date(publishedRaw).toISOString()
      : new Date().toISOString();

    return {
      agency: source.agency,
      jurisdiction: source.jurisdiction,
      title,
      link,
      publishedAt,
      impact: classifyImpact(`${title} ${description}`),
      summary: description.slice(0, 180) || `${source.label} update.`,
      category: source.category,
      sourceLabel: source.label,
    };
  });
}

async function fetchSource(source: RegulatorySource): Promise<LiveRegulatoryItem[]> {
  try {
    const response = await fetch(source.feedUrl, {
      // Cache each agency feed for an hour so the dashboard stays automatic
      // without re-polling every request.
      next: { revalidate: 3600 },
      headers: { "User-Agent": "DemandGoodQA-RegulatoryWatch/1.0" },
    });

    if (!response.ok) {
      console.error(`Regulatory feed request failed: ${source.label} (${response.status})`);
      return [];
    }

    const xml = await response.text();
    return parseFeed(xml, source);
  } catch (error) {
    console.error(`Regulatory feed fetch failed: ${source.label}`, error);
    return [];
  }
}

/**
 * Automatically aggregates the live Regulatory Watch feed from every
 * configured agency source (FDA including MedWatch, CDC, NIH, WHO, CMS, DHS,
 * TJC, NABP, and selected state government portals, plus any extra feeds via
 * REGULATORY_EXTRA_FEEDS). Failures in one
 * source do not block the others; if every source fails, returns an empty
 * array so the caller can fall back to mock data.
 */
export async function getRegulatoryWatchFeed(limit = 40): Promise<LiveRegulatoryItem[]> {
  const sources = getAllRegulatorySources();
  const results = await Promise.all(sources.map(fetchSource));
  return results
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}
