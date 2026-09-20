import pkg from "@next/env";
import { Client } from "pg";

pkg.loadEnvConfig(process.cwd());

const sql = `
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
`;

const client = new Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING });
await client.connect();
await client.query(sql);
const { rows } = await client.query(
  "select count(*)::int as count from dgqi_organization_invites",
);
console.log("[v0] dgqi_organization_invites ready. Row count:", rows[0].count);
await client.end();
