-- BuyMe Test only: xxbqrrkkndpjsupvhdmc. No changes to the Shopboostr project.
create table public.buyme_test_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  company_name text not null default '' check (char_length(company_name) <= 160),
  requested_role text not null default 'member' check (requested_role in ('member', 'provider')),
  terms_acknowledged boolean not null check (terms_acknowledged = true),
  terms_version text not null default '2026-11-12.test-accounts-v1',
  privacy_version text not null default '2026-11-12.test-accounts-v1',
  created_at timestamptz not null default now()
);

comment on column public.buyme_test_profiles.requested_role is
  'User request only. Never use this editable registration input to grant provider or admin privileges.';
comment on column public.buyme_test_profiles.created_at is
  'Server time of profile creation after email confirmation; not a client-reported consent timestamp.';

alter table public.buyme_test_profiles enable row level security;
revoke all on public.buyme_test_profiles from public, anon, authenticated;
grant select on public.buyme_test_profiles to authenticated;
grant insert (id, display_name, company_name, requested_role, terms_acknowledged)
  on public.buyme_test_profiles to authenticated;
grant update (display_name, company_name) on public.buyme_test_profiles to authenticated;

create policy buyme_profiles_read_own on public.buyme_test_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy buyme_profiles_insert_own on public.buyme_test_profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy buyme_profiles_update_own on public.buyme_test_profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- No anonymous read, no client-side deletion, no client-side admin role or timestamps.
-- Operator access uses the authenticated Supabase dashboard, never a browser service key.
