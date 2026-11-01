-- =====================================================================
-- 99: BAAD MEIN JAANCH (SQL 01..08 ke baad chalayein). Ye sirf parhta hai, kuch badalta nahi.
-- Har purane table ko 00-BEFORE-snapshot se milata hai: ginti aur har purane column ki poori value.
-- Naye columns ko nazar-andaz karta hai (wo purana data nahi hain).
--   SAME     = purana data bilkul wahi hai
--   CHANGED  = kuch badla. Staging par aisa NAHI hona chahiye. Asli par agar beech mein clinic chalti rahi ho
--              to naye kaam ki wajah se ho sakta hai: tab rows_after >= rows_before dekhein, ginti kam nahi honi chahiye.
--   MISSING  = table gayab (sakht masla, foran rukein)
-- Sab se oopar wali qatar ka natija "ALL_OK" aaye to sab theek hai.
-- =====================================================================
with r as (
  select s.table_name, s.row_count as rows_before, s.checksum,
         (xpath('/row/c/text()', query_to_xml(
            format('select count(*) c from public.%I', s.table_name), false, true, '')))[1]::text::bigint as rows_after,
         (xpath('/row/m/text()', query_to_xml(
            format($q$select coalesce(md5(string_agg(x, '|' order by x)), 'empty') m from (
                       select (select jsonb_object_agg(k, v) from jsonb_each(to_jsonb(r)) e(k, v)
                                where k = any(%L::text[]))::text as x from public.%I r) q$q$,
                   s.columns::text, s.table_name), false, true, '')))[1]::text as now_sum
    from public._migration_snapshot s
   where to_regclass('public.' || quote_ident(s.table_name)) is not null
), rows_all as (
  select table_name, rows_before, rows_after,
         case when rows_after = rows_before and now_sum = checksum then 'SAME' else 'CHANGED' end as status
    from r
  union all
  select s.table_name, s.row_count, null, 'MISSING'
    from public._migration_snapshot s
   where to_regclass('public.' || quote_ident(s.table_name)) is null
)
select '== NATIJA ==' as table_name, null::bigint as rows_before, null::bigint as rows_after,
       case when bool_and(status = 'SAME') then 'ALL_OK' else 'CHECK_BELOW' end as status
  from rows_all
union all
(select * from rows_all order by (status = 'SAME'), table_name);
