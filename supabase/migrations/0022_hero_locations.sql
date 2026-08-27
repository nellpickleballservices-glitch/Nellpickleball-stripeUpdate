-- Hero locations: marketing-only list of cities where the club has
-- available locations. Rendered as a list on the homepage hero.
-- Intentionally separate from the operational `locations` table
-- (which is bound to courts/reservations).
create table if not exists public.hero_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.hero_locations enable row level security;

-- Public read so the homepage can fetch without auth
create policy "hero_locations_select_public"
  on public.hero_locations for select
  to anon, authenticated
  using (true);

-- Service-role full access (admin actions use supabaseAdmin)
create policy "hero_locations_service_role_all"
  on public.hero_locations for all
  to service_role
  using (true)
  with check (true);
