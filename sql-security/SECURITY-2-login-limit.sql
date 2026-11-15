create table if not exists public.login_guard (
  k text primary key,
  fails integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.login_guard enable row level security;

create or replace function public.login_guard_check(p_keys text[])
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.login_guard where k = any(p_keys) and locked_until is not null and locked_until > now());
$$;

create or replace function public.login_guard_fail(p_k text, p_max integer, p_minutes integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.login_guard (k, fails, updated_at) values (p_k, 1, now())
  on conflict (k) do update set
    fails = case when public.login_guard.updated_at < now() - interval '30 minutes' and (public.login_guard.locked_until is null or public.login_guard.locked_until < now()) then 1 else public.login_guard.fails + 1 end,
    updated_at = now();
  update public.login_guard
     set locked_until = now() + make_interval(mins => p_minutes), fails = 0
   where k = p_k and fails >= p_max;
end $$;

create or replace function public.login_guard_ok(p_k text)
returns void
language sql
security definer
set search_path to 'public'
as $$
  delete from public.login_guard where k = p_k;
$$;

revoke all on function public.login_guard_check(text[]) from public, anon, authenticated;
revoke all on function public.login_guard_fail(text, integer, integer) from public, anon, authenticated;
revoke all on function public.login_guard_ok(text) from public, anon, authenticated;
grant execute on function public.login_guard_check(text[]) to service_role;
grant execute on function public.login_guard_fail(text, integer, integer) to service_role;
grant execute on function public.login_guard_ok(text) to service_role;
notify pgrst, 'reload schema';
