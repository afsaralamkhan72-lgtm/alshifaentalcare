-- =====================================================================
-- 00: PEHLE KI TASVEER (SQL 01 se PEHLE chalayein, sirf ek dafa)
-- Ye kuch badalta/mitata nahi. Ye har purane table ki ginti aur ek "fingerprint" yaad rakhta hai,
-- taake migration ke BAAD 99-AFTER-verify.sql se saabit ho sake ke purana data bilkul wahi hai.
-- Sirf ek chhota naya table banata hai: _migration_snapshot (bahar se kisi ko nazar nahi aata).
-- =====================================================================
create table if not exists public._migration_snapshot (
  table_name text primary key,
  row_count  bigint not null,
  columns    text[] not null,
  checksum   text not null,
  taken_at   timestamptz not null default now()
);
alter table public._migration_snapshot enable row level security;      -- koi policy nahi = app se band
revoke all on public._migration_snapshot from anon, authenticated;

do $$
declare t record; cols text[]; cnt bigint; cs text;
begin
  if exists (select 1 from public._migration_snapshot) then
    raise exception 'Tasveer pehle se bani hui hai. Purani tasveer hi rehne dein (dobara nahi banti).';
  end if;
  for t in
    select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> '_migration_snapshot'
  loop
    select array_agg(column_name::text order by ordinal_position) into cols
      from information_schema.columns where table_schema = 'public' and table_name = t.table_name;
    execute format(
      'select count(*), coalesce(md5(string_agg(x, ''|'' order by x)), ''empty'') from (
         select (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(r)) e(k, v) where k = any($1))::text as x
           from public.%I r) s', t.table_name)
      into cnt, cs using cols;
    insert into public._migration_snapshot (table_name, row_count, columns, checksum) values (t.table_name, cnt, cols, cs);
  end loop;
end $$;

select table_name, row_count from public._migration_snapshot order by table_name;
