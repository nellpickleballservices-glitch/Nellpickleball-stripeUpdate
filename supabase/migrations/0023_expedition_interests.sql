-- Lead-capture table for the public "I'm interested" form on expedition pages.
-- Anyone can submit (anon insert); only the service role can read/update so
-- only the admin dashboard sees the leads.
create table if not exists public.expedition_interests (
  id            uuid primary key default gen_random_uuid(),
  expedition_id uuid not null references public.expeditions(id) on delete cascade,
  name          text not null,
  email         text not null,
  phone         text,
  party_size    integer,
  message       text,
  status        text not null default 'new'
                  check (status in ('new', 'contacted', 'booked', 'declined')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists expedition_interests_expedition_id_idx
  on public.expedition_interests (expedition_id);
create index if not exists expedition_interests_status_idx
  on public.expedition_interests (status);
create index if not exists expedition_interests_created_at_idx
  on public.expedition_interests (created_at desc);

alter table public.expedition_interests enable row level security;

-- Public can submit a new interest. They cannot read, update, or delete.
create policy "expedition_interests_insert_public"
  on public.expedition_interests for insert
  to anon, authenticated
  with check (true);

-- Service-role full access (admin dashboard uses supabaseAdmin).
create policy "expedition_interests_service_role_all"
  on public.expedition_interests for all
  to service_role
  using (true)
  with check (true);
