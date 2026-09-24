"use client";

import { useMemo, useState } from "react";
import type { LiveRegulatoryItem } from "../../../lib/regulatory-feed";
import type { RegulatoryLane } from "../../../lib/regulatory-sources";

const filters: { id: "all" | RegulatoryLane; label: string }[] = [
  { id: "all", label: "All updates" },
  { id: "federal", label: "Federal alerts (FDA/CDC/WHO)" },
  { id: "state", label: "State portals & boards" },
];

export function RegulatoryRadar({
  items,
  extraSources,
}: {
  items: LiveRegulatoryItem[];
  extraSources: { label: string; agency: string }[];
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.lane === filter);
  }, [filter, items]);

  return (
    <div>
      <div className="filter-container">
        {filters.map((option) => (
          <button
            key={option.id}
            type="button"
            className={filter === option.id ? "filter-btn active" : "filter-btn"}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {extraSources.length > 0 ? (
        <p className="fine-print" style={{ margin: "0 0 16px" }}>
          Runtime merge: {extraSources.length} extra portal
          {extraSources.length === 1 ? "" : "s"} from <code>REGULATORY_EXTRA_FEEDS</code>
          {" — "}
          {extraSources.map((source) => source.label).join(", ")}.
        </p>
      ) : null}

      {filter === "state" ? (
        <p className="fine-print" style={{ margin: "0 0 16px" }}>
          Most state boards of pharmacy do not publish a standalone RSS feed. Built-in state
          coverage uses{" "}
          <a href="https://nabp.pharmacy/newsroom/newsletters/" target="_blank" rel="noreferrer">
            NABP State Newsletters
          </a>{" "}
          and selected state government portals. Extra state-portal feeds are concatenated with
          the baseline registry when <code>REGULATORY_EXTRA_FEEDS</code> is set.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="loader">
          {filter === "state"
            ? "No tracking indicators available for this filter. Add a state government RSS URL to REGULATORY_EXTRA_FEEDS, or use the NABP newsletter directory."
            : "No tracking indicators available for this filter."}
        </p>
      ) : (
        <div className="feed-container">
          {visible.map((item) => {
            const published = new Date(item.publishedAt);
            return (
              <article className="news-card" key={`${item.agency}-${item.link}-${item.title}`}>
                <span className={`badge ${item.lane === "state" ? "badge-state" : "badge-federal"}`}>
                  {item.agency} · {item.sourceLabel}
                  {item.injected ? " · extra" : ""}
                </span>
                <h3 className="news-title">
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h3>
                <div className="news-meta">
                  {item.jurisdiction} · Logged {published.toLocaleDateString()}{" "}
                  {published.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Impact{" "}
                  {item.impact}
                </div>
                <p className="news-snippet">{item.summary}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
