import { clerkClient, type User } from "@clerk/nextjs/server";
import { isClerkConfigured } from "./clerk-config";

export const MOST_GOOD_LOGIN_LIMIT = 5;

export type TeamSeat = {
  email: string;
  userId?: string;
  invitationId?: string;
};

type Failure = { ok: false; error: string; status: number };
type Clerk = Awaited<ReturnType<typeof clerkClient>>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function emailOf(user: User) {
  return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
}

function validEmail(email: string) {
  return email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function readSeats(value: unknown): TeamSeat[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const seat = item as Partial<TeamSeat>;
    const email = text(seat.email).toLowerCase();
    if (!validEmail(email)) return [];
    return [{
      email,
      userId: text(seat.userId) || undefined,
      invitationId: text(seat.invitationId) || undefined,
    }];
  });
}

function clerkMessage(error: unknown) {
  if (error && typeof error === "object" && "errors" in error && Array.isArray(error.errors)) {
    const first = error.errors[0];
    if (first && typeof first === "object") {
      if ("longMessage" in first && typeof first.longMessage === "string") return first.longMessage;
      if ("message" in first && typeof first.message === "string") return first.message;
    }
  }
  return "Could not update logins.";
}

async function saveSeats(client: Clerk, owner: User, seats: TeamSeat[]) {
  await client.users.replaceUserMetadata(owner.id, {
    privateMetadata: { ...owner.privateMetadata, dgqiSeats: seats },
  });
}

async function detachSeat(client: Clerk, seat: TeamSeat) {
  if (seat.userId) {
    await client.users.updateUserMetadata(seat.userId, {
      publicMetadata: { dgqiPlan: "foundation", dgqiSeatOwnerId: null },
    }).catch((error) => console.error("Could not remove a shared login.", error));
  }
  if (seat.invitationId) {
    await client.invitations.revokeInvitation(seat.invitationId).catch(() => undefined);
  }
}

export async function capMostGoodOrganizations(userId: string) {
  if (!isClerkConfigured()) return;
  try {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId, limit: 20 });
    await Promise.all(memberships.data.map(async (membership) => {
      if (!String(membership.role).includes("admin")) return;
      if (membership.organization.maxAllowedMemberships === MOST_GOOD_LOGIN_LIMIT) return;
      await client.organizations.updateOrganization(membership.organization.id, {
        maxAllowedMemberships: MOST_GOOD_LOGIN_LIMIT,
      });
    }));
  } catch (error) {
    console.error("Could not cap Most Good organization logins.", error);
  }
}

export async function leaveSharedSeat(userId: string) {
  if (!isClerkConfigured()) return;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const ownerId = text(user.publicMetadata?.dgqiSeatOwnerId);
  if (!ownerId || ownerId === userId) return;
  const owner = await client.users.getUser(ownerId).catch(() => null);
  if (owner) {
    const email = emailOf(user);
    const seats = readSeats(owner.privateMetadata?.dgqiSeats).filter((seat) => seat.userId !== userId && seat.email !== email);
    await saveSeats(client, owner, seats);
  }
  await client.users.updateUserMetadata(userId, { publicMetadata: { dgqiSeatOwnerId: null } });
}

export async function releaseMostGoodSeats(ownerId: string) {
  if (!isClerkConfigured()) return;
  const client = await clerkClient();
  const owner = await client.users.getUser(ownerId);
  const seats = readSeats(owner.privateMetadata?.dgqiSeats);
  await Promise.all(seats.map((seat) => detachSeat(client, seat)));
  if (seats.length) await saveSeats(client, owner, []);
}

async function claimPendingSeat(client: Clerk, user: User) {
  if (text(user.publicMetadata?.dgqiSeatOwnerId) || user.publicMetadata?.dgqiPlan === "most-good") return user;
  const email = emailOf(user);
  if (!email) return user;
  const invitations = await client.invitations.getInvitationList({ query: email, status: "pending", limit: 10 });
  const match = invitations.data.find((invitation) => {
    return invitation.emailAddress.toLowerCase() === email && text(invitation.publicMetadata?.dgqiSeatOwnerId);
  });
  const ownerId = text(match?.publicMetadata?.dgqiSeatOwnerId);
  if (!match || !ownerId) return user;
  const owner = await client.users.getUser(ownerId).catch(() => null);
  if (!owner || owner.publicMetadata?.dgqiPlan !== "most-good") return user;
  const seats = readSeats(owner.privateMetadata?.dgqiSeats);
  if (!seats.some((seat) => seat.email === email)) return user;
  const updated = await client.users.updateUserMetadata(user.id, {
    publicMetadata: { dgqiPlan: "most-good", dgqiSeatOwnerId: ownerId },
  });
  await saveSeats(client, owner, seats.map((seat) => seat.email === email ? { ...seat, userId: user.id, invitationId: match.id } : seat));
  await client.invitations.revokeInvitation(match.id).catch(() => undefined);
  return updated;
}

export async function workspaceOrganizationId(userId: string, orgId?: string | null) {
  const client = await clerkClient();
  const user = await claimPendingSeat(client, await client.users.getUser(userId));
  const ownerId = text(user.publicMetadata?.dgqiSeatOwnerId);
  if (!ownerId || ownerId === userId) return orgId ?? `user:${userId}`;
  const owner = await client.users.getUser(ownerId).catch(() => null);
  const email = emailOf(user);
  const seats = owner ? readSeats(owner.privateMetadata?.dgqiSeats) : [];
  const listed = seats.some((seat) => seat.userId === userId || seat.email === email);
  if (!owner || owner.publicMetadata?.dgqiPlan !== "most-good" || !listed) {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { dgqiPlan: "foundation", dgqiSeatOwnerId: null },
    }).catch(() => undefined);
    return orgId ?? `user:${userId}`;
  }
  const memberships = await client.users.getOrganizationMembershipList({ userId: ownerId, limit: 10 });
  return memberships.data[0]?.organization.id ?? `user:${ownerId}`;
}

async function managedAccount(userId: string): Promise<{ client: Clerk; actor: User; owner: User; canManage: boolean } | Failure> {
  if (!isClerkConfigured()) return { ok: false, error: "Authentication required.", status: 401 };
  const client = await clerkClient();
  const actor = await claimPendingSeat(client, await client.users.getUser(userId));
  if (actor.publicMetadata?.dgqiPlan !== "most-good") {
    return { ok: false, error: "Logins can be added on Most Good.", status: 403 };
  }
  const ownerId = text(actor.publicMetadata?.dgqiSeatOwnerId);
  if (!ownerId || ownerId === actor.id) return { client, actor, owner: actor, canManage: true };
  const owner = await client.users.getUser(ownerId).catch(() => null);
  if (!owner || owner.publicMetadata?.dgqiPlan !== "most-good") {
    return { ok: false, error: "This shared login is no longer active.", status: 403 };
  }
  return { client, actor, owner, canManage: false };
}

export async function getTeamLogins(userId: string) {
  const account = await managedAccount(userId);
  if ("ok" in account) return account;
  if (account.canManage) await capMostGoodOrganizations(account.owner.id);
  const owner = account.canManage ? await account.client.users.getUser(account.owner.id) : account.owner;
  const seats = readSeats(owner.privateMetadata?.dgqiSeats);
  return {
    ok: true as const,
    canManage: account.canManage,
    ownerEmail: emailOf(owner),
    seats,
    limit: MOST_GOOD_LOGIN_LIMIT,
    used: 1 + seats.length,
  };
}

export async function addTeamLogin(userId: string, rawEmail: string) {
  const account = await managedAccount(userId);
  if ("ok" in account) return account;
  if (!account.canManage) return { ok: false as const, error: "Only the subscription holder can add a login.", status: 403 as const };
  const email = rawEmail.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false as const, error: "Enter a valid email address.", status: 400 as const };
  const owner = await account.client.users.getUser(account.owner.id);
  const ownerEmail = emailOf(owner);
  if (email === ownerEmail) return { ok: false as const, error: "That email is already the subscription login.", status: 409 as const };
  const seats = readSeats(owner.privateMetadata?.dgqiSeats);
  if (seats.some((seat) => seat.email === email)) return { ok: false as const, error: "That login is already on this account.", status: 409 as const };
  if (1 + seats.length >= MOST_GOOD_LOGIN_LIMIT) {
    return { ok: false as const, error: "Most Good includes 5 logins.", status: 409 as const };
  }

  const existing = await account.client.users.getUserList({ emailAddress: [email], limit: 5 });
  const member = existing.data.find((user) => emailOf(user) === email);
  let seat: TeamSeat = { email };
  if (member) {
    const memberOwner = text(member.publicMetadata?.dgqiSeatOwnerId);
    if (member.publicMetadata?.dgqiPlan === "most-good" && !memberOwner) {
      return { ok: false as const, error: "That email already has its own Most Good login.", status: 409 as const };
    }
    if (memberOwner && memberOwner !== owner.id) {
      return { ok: false as const, error: "That email is already using another subscription.", status: 409 as const };
    }
    await account.client.users.updateUserMetadata(member.id, {
      publicMetadata: { dgqiPlan: "most-good", dgqiSeatOwnerId: owner.id },
    });
    seat = { email, userId: member.id };
  } else {
    try {
      const invitation = await account.client.invitations.createInvitation({
        emailAddress: email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://demandgoodqa.com"}/sign-up`,
        publicMetadata: { dgqiPlan: "most-good", dgqiSeatOwnerId: owner.id },
        notify: true,
      });
      seat = { email, invitationId: invitation.id };
    } catch (error) {
      return { ok: false as const, error: clerkMessage(error), status: 400 as const };
    }
  }

  try {
    await saveSeats(account.client, owner, [...seats, seat]);
  } catch (error) {
    await detachSeat(account.client, seat);
    return { ok: false as const, error: clerkMessage(error), status: 500 as const };
  }
  await capMostGoodOrganizations(owner.id);
  return { ok: true as const, seats: [...seats, seat], used: 2 + seats.length, limit: MOST_GOOD_LOGIN_LIMIT };
}

export async function removeTeamLogin(userId: string, rawEmail: string) {
  const account = await managedAccount(userId);
  if ("ok" in account) return account;
  if (!account.canManage) return { ok: false as const, error: "Only the subscription holder can remove a login.", status: 403 as const };
  const email = rawEmail.trim().toLowerCase();
  const owner = await account.client.users.getUser(account.owner.id);
  if (email === emailOf(owner)) return { ok: false as const, error: "The subscription login stays on the account.", status: 400 as const };
  const seats = readSeats(owner.privateMetadata?.dgqiSeats);
  const seat = seats.find((item) => item.email === email);
  if (!seat) return { ok: false as const, error: "That login is not on this account.", status: 404 as const };
  await detachSeat(account.client, seat);
  const remaining = seats.filter((item) => item.email !== email);
  await saveSeats(account.client, owner, remaining);
  return { ok: true as const, seats: remaining, used: 1 + remaining.length, limit: MOST_GOOD_LOGIN_LIMIT };
}
