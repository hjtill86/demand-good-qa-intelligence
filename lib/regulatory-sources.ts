export type RegulatorySource = {
  agency: string;
  jurisdiction: string;
  label: string;
  feedUrl: string;
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
    feedUrl: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml",
  },
  {
    agency: "FDA",
    jurisdiction: "US · FDA",
    label: "FDA Food Safety Alerts",
    feedUrl: "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food/rss.xml",
  },
  {
    agency: "CDC",
    jurisdiction: "US · CDC",
    label: "CDC Newsroom",
    feedUrl: "https://tools.cdc.gov/api/v2/resources/media/404952.rss",
  },
  {
    agency: "CMS",
    jurisdiction: "US · CMS",
    label: "CMS Newsroom",
    feedUrl: "https://www.cms.gov/newsroom/rss.xml",
  },
  {
    agency: "DHS",
    jurisdiction: "US · DHS",
    label: "Department of Homeland Security Press Releases",
    feedUrl: "https://www.dhs.gov/rss.xml",
  },
  {
    agency: "TJC",
    jurisdiction: "US · The Joint Commission",
    label: "The Joint Commission News",
    feedUrl: "https://www.jointcommission.org/-/media/tjc/newsletters/rss/tjc-news.xml",
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
    return parsed.filter(
      (item): item is RegulatorySource =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as RegulatorySource).agency === "string" &&
        typeof (item as RegulatorySource).jurisdiction === "string" &&
        typeof (item as RegulatorySource).label === "string" &&
        typeof (item as RegulatorySource).feedUrl === "string"
    );
  } catch (error) {
    console.error("Failed to parse REGULATORY_EXTRA_FEEDS", error);
    return [];
  }
}

export function getAllRegulatorySources(): RegulatorySource[] {
  return [...builtInRegulatorySources, ...getExtraRegulatorySources()];
}
