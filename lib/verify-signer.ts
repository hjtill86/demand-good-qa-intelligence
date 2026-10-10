import { clerkClient } from "@clerk/nextjs/server";
import { currentAuditActor } from "./audit-actor";
import type { RecordSignature, SignatureMeaning } from "./part11-records";

export async function requireSignature(password: unknown, meaning: SignatureMeaning) {
  const value = typeof password === "string" ? password : "";
  if (!value) return { ok: false as const, error: "Enter your password to sign.", status: 400 as const };
  const actor = await currentAuditActor();
  if (!actor) return { ok: false as const, error: "Authentication required.", status: 401 as const };
  try {
    await (await clerkClient()).users.verifyPassword({ userId: actor.userId, password: value });
  } catch (error) {
    console.error("Signature password was not accepted.", error);
    return { ok: false as const, error: "The password does not match this account.", status: 401 as const };
  }
  const signature: RecordSignature = {
    userId: actor.userId,
    printedName: actor.printedName,
    email: actor.email,
    meaning,
    signedAt: new Date().toISOString(),
  };
  return { ok: true as const, signature };
}
