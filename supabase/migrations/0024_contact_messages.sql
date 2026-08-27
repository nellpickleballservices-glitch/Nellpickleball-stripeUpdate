-- Lead-capture table for the public "Contact Us" form.
-- Anyone can submit (anon insert); only the service role can read/update so
-- only the admin dashboard sees the messages.
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  question    text not null,
  status      text not null default 'new'
                check (status in ('new', 'read', 'replied', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contact_messages_status_idx
  on public.contact_messages (status);
create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Public can submit a new message. They cannot read, update, or delete.
create policy "contact_messages_insert_public"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- Service-role full access (admin dashboard uses supabaseAdmin).
create policy "contact_messages_service_role_all"
  on public.contact_messages for all
  to service_role
  using (true)
  with check (true);
