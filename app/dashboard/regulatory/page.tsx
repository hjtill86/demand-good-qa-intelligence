import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDgqiPlan } from "../../../lib/dgqi-entitlements";
import { getRegulatoryWatchFeed } from "../../../lib/regulatory-feed";
import { RegulatoryRadar } from "./regulatory-radar";

export default async function RegulatoryRadarPage() {
  const user = await currentUser();
  if (getDgqiPlan(user) !== "most-good") {
    redirect("/checkout?plan=most-good");
  }

  const items = await getRegulatoryWatchFeed(48);

  return (
    <main className="report-page">
      <header className="report-header">
        <span className="eyebrow">MOST GOOD · LIVE RSS</span>
        <h1>Regulatory & quality intelligence radar</h1>
        <p>
          Live monitoring of federal, international, and state pharmaceutical and healthcare updates,
          pulled from official agency RSS feeds.
        </p>
      </header>
      {items.length === 0 ? (
        <p className="loader">Live agency feeds were unavailable when this page loaded. Try again shortly.</p>
      ) : (
        <RegulatoryRadar items={items} />
      )}
    </main>
  );
}
