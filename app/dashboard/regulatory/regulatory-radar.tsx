"use client";

import { useMemo, useState } from "react";
import type { LiveRegulatoryItem } from "../../../lib/regulatory-feed";
import type { RegulatoryCategory } from "../../../lib/regulatory-sources";

const filters: { id: "all" | RegulatoryCategory; label: string }[] = [
  { id: "all", label: "All updates" },
  { id: "fda", label: "FDA recalls & rules" },
  { id: "cdc", label: "CDC & NIH alerts" },
  { id: "who", label: "WHO bulletins" },
  { id: "state", label: "State boards & DoH" },
];

function badgeClass(category: RegulatoryCategory) {
  if (category === "fda") return "badge-fda";
  if (category === "cdc") return "badge-cdc";
  if (category === "who") return "badge-who";
  if (category === "state") return "badge-state";
  return "badge-other";
}

export function RegulatoryRadar({ items }: { items: LiveRegulatoryItem[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.category === filter)),
    [filter, items]
  );

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

      {visible.length === 0 ? (
        <p className="loader">No current updates match the selected filters.</p>
      ) : (
        <div className="feed-container">
          {visible.map((item) => {
            const published = new Date(item.publishedAt);
            return (
              <article className="news-card" key={`${item.agency}-${item.link}-${item.title}`}>
                <span className={`badge ${badgeClass(item.category)}`}>
                  {item.agency} · {item.sourceLabel}
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
                  {item.jurisdiction} · Published {published.toLocaleDateString()}{" "}
                  {published.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Impact {item.impact}
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
