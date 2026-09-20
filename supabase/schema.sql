create table if not exists dgqi_records (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  record_type text not null check (record_type in ('metric', 'action', 'supplier', 'regulatory', 'license', 'digest')),
  payload jsonb not null default '{}'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dgqi_records_org_type_idx
  on dgqi_records (organization_id, record_type);

alter table dgqi_records enable row level security;

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

create index if not exists dgqi_org_invites_org_idx
  on dgqi_organization_invites (organization_id, status);

create unique index if not exists dgqi_org_invites_unique_pending
  on dgqi_organization_invites (organization_id, lower(email))
  where status = 'pending';

alter table dgqi_organization_invites enable row level security;
