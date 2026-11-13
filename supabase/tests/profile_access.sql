-- Run only in BuyMe Test. Everything, including Auth fixtures, rolls back.
begin;
create temp table buyme_rls_actors (kind text primary key, id uuid not null) on commit drop;
insert into buyme_rls_actors values ('member', gen_random_uuid()), ('provider', gen_random_uuid());
insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
select id, kind || '-' || id::text || '@example.invalid', 'authenticated', 'authenticated', '{}'::jsonb, '{"role":"admin"}'::jsonb
from buyme_rls_actors;
grant select on buyme_rls_actors to authenticated;

select set_config('request.jwt.claims', jsonb_build_object('sub',(select id from buyme_rls_actors where kind='member'),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text, true);
set local role authenticated;
insert into public.buyme_test_profiles(id,display_name,terms_acknowledged)
select id,'RLS Member',true from buyme_rls_actors where kind='member';
do $$
declare n integer;
begin
  select count(*) into n from public.buyme_test_profiles;
  if n <> 1 then raise exception 'own profile read failed'; end if;
  update public.buyme_test_profiles set display_name='Updated Member' where id=(select id from buyme_rls_actors where kind='member');
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'own profile update failed'; end if;
  begin
    insert into public.buyme_test_profiles(id,display_name,terms_acknowledged)
    select id,'Foreign Owner',true from buyme_rls_actors where kind='provider';
    raise exception 'foreign insert unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.buyme_test_profiles set requested_role='provider';
    raise exception 'role update unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.buyme_test_profiles set created_at=now();
    raise exception 'timestamp update unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', jsonb_build_object('sub',(select id from buyme_rls_actors where kind='provider'),'role','authenticated','user_metadata',jsonb_build_object('role','admin'))::text, true);
set local role authenticated;
insert into public.buyme_test_profiles(id,display_name,requested_role,company_name,terms_acknowledged)
select id,'RLS Provider','provider','Test Company',true from buyme_rls_actors where kind='provider';
do $$
declare n integer;
begin
  select count(*) into n from public.buyme_test_profiles;
  if n <> 1 then raise exception 'foreign profile visible through metadata admin claim'; end if;
  update public.buyme_test_profiles set display_name='Attack' where id=(select id from buyme_rls_actors where kind='member');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'foreign update allowed'; end if;
  begin
    insert into public.buyme_test_profiles(id,display_name,requested_role,terms_acknowledged)
    values ((select id from buyme_rls_actors where kind='provider'),'Invalid Admin','admin',true);
    raise exception 'admin role accepted';
  exception when check_violation then null;
  end;
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    perform * from public.buyme_test_profiles;
    raise exception 'anonymous profile access allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'RLS ownership, foreign writes, metadata escalation, immutable fields and anonymous access passed' as result;
rollback;
