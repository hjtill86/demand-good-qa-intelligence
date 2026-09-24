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
 * Coverage note: FDA, CDC, CMS, DHS, and The Joint Commission (TJC) all
 * publish a stable public RSS/Atom feed and are wired up below. ISO does not
 * publish a general-purpose public RSS feed of standard updates, and state
 * Departments of Health / Boards of Pharmacy are run independently per state
 * with no single federal feed — add specific state feed URLs to
 * `getExtraRegulatorySources()` (via the REGULATORY_EXTRA_FEEDS env var) once
 * you know which states you operate in.
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
 * Optional additional feeds supplied via env, one JSON array per
 * REGULATORY_EXTRA_FEEDS, e.g. to add a specific State Department of Health
 * or State Board of Pharmacy RSS feed once you know your operating states:
 *
 *   REGULATORY_EXTRA_FEEDS=[{"agency":"State DOH","jurisdiction":"US · CA DOH","label":"California DOH Alerts","feedUrl":"https://www.cdph.ca.gov/.../rss.xml"}]
 *
 * ISO does not publish a general public RSS feed; if you have access to an
 * ISO standards-update notification (e.g. via a paid monitoring service),
 * add it the same way.
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
