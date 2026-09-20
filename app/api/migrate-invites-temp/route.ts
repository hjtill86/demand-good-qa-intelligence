"use server"
import { NextResponse } from "next/server"
import { Client } from "pg"

const SQL = `
create table if not exists dgqi_organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by text not null,
  invited_by_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by text
);
create index if not exists dgqi_org_invites_org_idx on dgqi_organization_invites (organization_id, status);
create unique index if not exists dgqi_org_invites_unique_pending on dgqi_organization_invites (organization_id, lower(email)) where status = 'pending';
alter table dgqi_organization_invites enable row level security;
`

export async function GET() {
  const present = {
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_HOST: !!process.env.POSTGRES_HOST,
    POSTGRES_USER: !!process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: !!process.env.POSTGRES_PASSWORD,
    POSTGRES_DATABASE: !!process.env.POSTGRES_DATABASE,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
  }

  let connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
  if (
    !connectionString &&
    process.env.POSTGRES_HOST &&
    process.env.POSTGRES_USER &&
    process.env.POSTGRES_PASSWORD
  ) {
    const host = process.env.POSTGRES_HOST
    const user = process.env.POSTGRES_USER
    const password = encodeURIComponent(process.env.POSTGRES_PASSWORD)
    const database = process.env.POSTGRES_DATABASE || "postgres"
    connectionString = `postgres://${user}:${password}@${host}:5432/${database}?sslmode=require`
  }
  if (!connectionString) {
    return NextResponse.json({ ok: false, error: "no connection string", present }, { status: 500 })
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    await client.query(SQL)
    const { rows } = await client.query(
      "select count(*)::int as count from dgqi_organization_invites",
    )
    return NextResponse.json({ ok: true, count: rows[0].count })
  } finally {
    await client.end()
  }
}
