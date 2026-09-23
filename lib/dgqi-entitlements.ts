import type { User } from "@clerk/nextjs/server";
import type { StripePlanKey } from "./integration-config";

export function getDgqiPlan(user: User | null | undefined): StripePlanKey {
  return user?.publicMetadata?.dgqiPlan === "most-good" ? "most-good" : "foundation";
}
