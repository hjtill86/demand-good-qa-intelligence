import { cache } from "react";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

export type AuditActor = {
  userId: string;
  printedName: string;
  email: string;
  actorName: string;
  actorEmail: string;
};

function printedName(user: { firstName: string | null; lastName: string | null; id: string }, email: string) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || email || user.id;
}

export const currentAuditActor = cache(async (): Promise<AuditActor | null> => {
  const user = await currentUser();
  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const actor: AuditActor = {
    userId: user.id,
    printedName: printedName(user, email),
    email,
    actorName: "",
    actorEmail: "",
  };
  try {
    const session = await auth();
    const claims = session.sessionClaims as { act?: { sub?: string } } | null;
    const actorId = claims?.act?.sub;
    if (!actorId || actorId === user.id) return actor;
    const admin = await (await clerkClient()).users.getUser(actorId);
    const adminEmail = admin.primaryEmailAddress?.emailAddress ?? "";
    actor.actorName = printedName(admin, adminEmail);
    actor.actorEmail = adminEmail;
  } catch (error) {
    console.error("Could not name the administrator session on the audit entry.", error);
  }
  return actor;
});
