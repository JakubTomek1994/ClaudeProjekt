-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Projects table
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Map nodes
create table map_nodes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  description text,
  phase text not null check (phase in ('idea', 'research', 'design', 'prototype', 'testing', 'production', 'done')),
  position_x float not null default 0,
  position_y float not null default 0,
  parent_node_id uuid references map_nodes(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Node edges (connections between nodes)
create table node_edges (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  source_node_id uuid not null references map_nodes(id) on delete cascade,
  target_node_id uuid not null references map_nodes(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Diary entries
create table diary_entries (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  node_id uuid references map_nodes(id) on delete set null,
  entry_type text not null default 'note' check (entry_type in ('note', 'phase_change', 'node_created', 'node_updated', 'milestone')),
  content text not null,
  next_step text,
  created_at timestamptz not null default now()
);

-- Attachments
create table attachments (
  id uuid primary key default uuid_generate_v4(),
  diary_entry_id uuid not null references diary_entries(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_map_nodes_project on map_nodes(project_id);
create index idx_node_edges_project on node_edges(project_id);
create index idx_diary_entries_project on diary_entries(project_id);
create index idx_diary_entries_node on diary_entries(node_id);
create index idx_attachments_entry on attachments(diary_entry_id);
create index idx_projects_user on projects(user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- Row Level Security
alter table projects enable row level security;
alter table map_nodes enable row level security;
alter table node_edges enable row level security;
alter table diary_entries enable row level security;
alter table attachments enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users can manage own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own map nodes"
  on map_nodes for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can manage own node edges"
  on node_edges for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can manage own diary entries"
  on diary_entries for all
  using (project_id in (select id from projects where user_id = auth.uid()))
  with check (project_id in (select id from projects where user_id = auth.uid()));

create policy "Users can manage own attachments"
  on attachments for all
  using (diary_entry_id in (
    select de.id from diary_entries de
    join projects p on de.project_id = p.id
    where p.user_id = auth.uid()
  ))
  with check (diary_entry_id in (
    select de.id from diary_entries de
    join projects p on de.project_id = p.id
    where p.user_id = auth.uid()
  ));

-- Storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict do nothing;

-- Storage policy: authenticated users can manage their files
create policy "Users can upload attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.role() = 'authenticated'
  );

create policy "Users can view own attachments"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and auth.role() = 'authenticated'
  );

create policy "Users can delete own attachments"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and auth.role() = 'authenticated'
  );
