export type RegulatoryCategory = "fda" | "cdc" | "who" | "state" | "other";
export type RegulatoryLane = "federal" | "state";

export type RegulatorySource = {
  agency: string;
  jurisdiction: string;
  label: string;
  feedUrl: string;
  category: RegulatoryCategory;
  injected?: boolean;
};

const CATEGORIES = new Set<RegulatoryCategory>(["fda", "cdc", "who", "state", "other"]);

export function laneForCategory(category: RegulatoryCategory): RegulatoryLane {
  return category === "state" ? "state" : "federal";
}

/**
 * Public RSS/Atom feeds that are automatically polled to build the live
 * Regulatory Watch feed. These agencies publish machine-readable feeds, so
 * no manual entry is required to keep them current.
 *
 * Most state boards of pharmacy do not publish a standalone public RSS feed.
 * State coverage therefore uses centralized alternatives:
 * NABP news (WordPress RSS), selected state government / health department
 * portals (for example Indiana), and FDA MedWatch for drug-safety alerts
 * that affect state practice. Additional state-portal feeds can still be
 * added via REGULATORY_EXTRA_FEEDS.
 */
export const builtInRegulatorySources: RegulatorySource[] = [
  {
    agency: "FDA",
    jurisdiction: "US · FDA",
    label: "FDA Recalls, Market Withdrawals & Safety Alerts",
    feedUrl: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml",
    category: "fda",
  },
  {
    agency: "FDA",
    jurisdiction: "US · FDA",
    label: "FDA Press Releases",
    feedUrl: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml",
    category: "fda",
  },
  {
    agency: "FDA",
    jurisdiction: "US · FDA",
    label: "FDA Food Safety Alerts",
    feedUrl: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food/rss.xml",
    category: "fda",
  },
  {
    agency: "FDA",
    jurisdiction: "US · FDA MedWatch",
    label: "FDA MedWatch Safety Alerts",
    feedUrl: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml",
    category: "fda",
  },
  {
    agency: "NABP",
    jurisdiction: "US · State boards",
    label: "NABP News & State Board Updates",
    feedUrl: "https://nabp.pharmacy/feed/",
    category: "state",
  },
  {
    agency: "IN DOH",
    jurisdiction: "US · Indiana",
    label: "Indiana State Government Health News",
    feedUrl: "https://www.in.gov/health/rss.xml",
    category: "state",
  },
  {
    agency: "CDC",
    jurisdiction: "US · CDC",
    label: "CDC Newsroom",
    feedUrl: "https://tools.cdc.gov/api/v2/resources/media/404952.rss",
    category: "cdc",
  },
  {
    agency: "NIH",
    jurisdiction: "US · NIH",
    label: "NIH News Releases",
    feedUrl: "https://www.nih.gov/news-events/news-releases/rss.xml",
    category: "cdc",
  },
  {
    agency: "WHO",
    jurisdiction: "Global · WHO",
    label: "WHO Disease Outbreak News",
    feedUrl: "https://www.who.int/feeds/entity/csr/don/en/rss.xml",
    category: "who",
  },
  {
    agency: "WHO",
    jurisdiction: "Global · WHO",
    label: "WHO News",
    feedUrl: "https://www.who.int/rss-feeds/news-english.xml",
    category: "who",
  },
  {
    agency: "CMS",
    jurisdiction: "US · CMS",
    label: "CMS Newsroom",
    feedUrl: "https://www.cms.gov/newsroom/rss.xml",
    category: "other",
  },
  {
    agency: "DHS",
    jurisdiction: "US · DHS",
    label: "Department of Homeland Security Press Releases",
    feedUrl: "https://www.dhs.gov/rss.xml",
    category: "other",
  },
  {
    agency: "TJC",
    jurisdiction: "US · The Joint Commission",
    label: "The Joint Commission News",
    feedUrl: "https://www.jointcommission.org/-/media/tjc/newsletters/rss/tjc-news.xml",
    category: "other",
  },
];

/**
 * Optional additional feeds via REGULATORY_EXTRA_FEEDS (JSON array), merged
 * with built-in sources at request time. Accepts either the app schema
 * (agency, label, feedUrl, category) or the compact injection schema
 * (name, url, cat). Extra entries default to the state lane.
 *
 *   REGULATORY_EXTRA_FEEDS=[{"agency":"State portal","jurisdiction":"US · XX","label":"State health RSS","feedUrl":"https://example.gov/rss.xml","category":"state"}]
 *   REGULATORY_EXTRA_FEEDS=[{"name":"CA Dept of Health","cat":"state","url":"https://www.cdph.ca.gov/rss.xml"}]
 */
function normalizeCategory(value: unknown): RegulatoryCategory {
  const raw = String(value ?? "state").toLowerCase();
  if (raw === "federal") return "other";
  if (CATEGORIES.has(raw as RegulatoryCategory)) return raw as RegulatoryCategory;
  return "state";
}

function normalizeExtraSource(item: unknown): RegulatorySource | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const feedUrl = String(raw.feedUrl ?? raw.url ?? "").trim();
  const label = String(raw.label ?? raw.name ?? "").trim();
  const agency = String(raw.agency ?? raw.name ?? label).trim();
  if (!feedUrl || !agency) return null;

  return {
    agency,
    jurisdiction: String(raw.jurisdiction ?? "US · State portal").trim() || "US · State portal",
    label: label || agency,
    feedUrl,
    category: normalizeCategory(raw.category ?? raw.cat),
    injected: true,
  };
}

export function getExtraRegulatorySources(): RegulatorySource[] {
  const raw = process.env.REGULATORY_EXTRA_FEEDS;
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeExtraSource).filter((source): source is RegulatorySource => Boolean(source));
  } catch (error) {
    console.error("Failed to parse REGULATORY_EXTRA_FEEDS", error);
    return [];
  }
}

export function getAllRegulatorySources(): RegulatorySource[] {
  const extra = getExtraRegulatorySources();
  const seen = new Set(builtInRegulatorySources.map((source) => source.feedUrl));
  const uniqueExtra = extra.filter((source) => {
    if (seen.has(source.feedUrl)) return false;
    seen.add(source.feedUrl);
    return true;
  });
  return builtInRegulatorySources.concat(uniqueExtra);
}
