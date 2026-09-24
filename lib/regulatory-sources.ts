export type RegulatoryCategory = "fda" | "cdc" | "who" | "state" | "other";

export type RegulatorySource = {
  agency: string;
  jurisdiction: string;
  label: string;
  feedUrl: string;
  category: RegulatoryCategory;
};

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
 * Optional additional feeds via REGULATORY_EXTRA_FEEDS (JSON array). Use this
 * for a specific state health-department or professional-regulation portal
 * that does syndicate RSS. Most state boards of pharmacy do not publish a
 * dedicated pharmacy-only XML feed.
 *
 *   REGULATORY_EXTRA_FEEDS=[{"agency":"State portal","jurisdiction":"US · XX","label":"State health RSS","feedUrl":"https://example.gov/rss.xml","category":"state"}]
 */
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
    return parsed.filter((item): item is RegulatorySource => {
      if (!item || typeof item !== "object") return false;
      const source = item as RegulatorySource;
      return (
        typeof source.agency === "string" &&
        typeof source.jurisdiction === "string" &&
        typeof source.label === "string" &&
        typeof source.feedUrl === "string"
      );
    }).map((source) => ({
      ...source,
      category: source.category ?? "state",
    }));
  } catch (error) {
    console.error("Failed to parse REGULATORY_EXTRA_FEEDS", error);
    return [];
  }
}

export function getAllRegulatorySources(): RegulatorySource[] {
  return [...builtInRegulatorySources, ...getExtraRegulatorySources()];
}
