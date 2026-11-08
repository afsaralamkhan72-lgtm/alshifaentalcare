-- Al Shifa: backup (JSON) ko KHAALI TEST/STAGING database mein wapas load karna.
-- KABHI asli (live) database par na chalayein. Ye sirf restore ka tareeqa jaanchne ke liye hai.
-- Istemal:  psql <staging-connection> -v ON_ERROR_STOP=1 -f restore-from-backup.sql
--           (pehle neeche wali \set line mein backup file ka path likhein)
\set content `cat /path/to/al-shifa-backup.json`
select set_config('app.backup_json', :'content', false);
begin;
set local session_replication_role = replica;
do $$
declare t text; rows jsonb; cols text; n int; j jsonb := current_setting('app.backup_json')::jsonb;
begin
  for t in select k from jsonb_object_keys(j -> 'data') k loop
    rows := j -> 'data' -> t;
    continue when jsonb_array_length(rows) = 0;
    select string_agg(quote_ident(column_name), ',' order by ordinal_position) into cols
      from information_schema.columns where table_schema = 'public' and table_name = t and is_generated = 'NEVER';
    execute format('insert into public.%I (%s) overriding system value select %s from jsonb_populate_recordset(null::public.%I, $1) on conflict do nothing', t, cols, cols, t) using rows;
    get diagnostics n = row_count;
    raise notice 'restored % : % of % rows', t, n, jsonb_array_length(rows);
  end loop;
end $$;
commit;
