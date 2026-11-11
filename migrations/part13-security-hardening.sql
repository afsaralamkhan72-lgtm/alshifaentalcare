do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('_loyalty_award','_loyalty_has_visit','_pay_treatment_core','_treatment_appointment','_begin_treatment','_inv_has_history',
                         'loyalty_device_lookup','loyalty_device_save','loyalty_find_patients','loyalty_rate_ok','loyalty_signup',
                         'staff_acknowledge','staff_portal_fail','staff_portal_ok','scratch_play','_reverse_payment_core')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.f);
    execute format('grant execute on function %s to service_role', r.f);
  end loop;
  for r in
    select p.oid::regprocedure as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('_loyalty_card','rotate_weak_portal_codes')
  loop
    execute format('revoke execute on function %s from public, anon', r.f);
    execute format('grant execute on function %s to authenticated, service_role', r.f);
  end loop;
end $$;
do $$
begin
  if to_regprocedure('public.is_staff()') is not null then
    alter function public.is_staff() set search_path = public;
  end if;
  if to_regprocedure('public.has_role(text)') is not null then
    alter function public.has_role(text) set search_path = public;
  end if;
end $$;
notify pgrst, 'reload schema';
