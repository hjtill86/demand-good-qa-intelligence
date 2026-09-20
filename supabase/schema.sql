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
