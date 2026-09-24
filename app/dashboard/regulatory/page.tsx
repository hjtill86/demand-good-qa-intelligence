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
          Live monitoring of federal, international, and selected state healthcare updates from
          official RSS feeds. Most state boards of pharmacy do not publish a dedicated public RSS
          feed; this radar uses NABP news, state government / health-department portals, and FDA
          MedWatch instead.
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
