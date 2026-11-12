begin;
do $$
declare v_admin text; v_id uuid;
begin
  select id::text into v_admin from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1;
  select cv.patient_id into v_id from public.clinical_visits cv join public.appointments a on a.id=cv.appointment_id limit 1;
  if v_id is null then raise exception 'no linked patient'; end if;
  perform set_config('request.jwt.claim.sub', v_admin, true);
  update public.patients set deleted_at = now() where id = v_id;
  perform set_config('role','authenticated',true);
  perform public.purge_patient(v_id,'DELETE');
  raise notice 'PURGE OK';
end $$;
rollback;
