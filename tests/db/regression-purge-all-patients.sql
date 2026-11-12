begin;
do $$
declare v_admin text; r record; ok int:=0; bad int:=0;
begin
  select id::text into v_admin from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1;
  perform set_config('request.jwt.claim.sub', v_admin, true);
  for r in select id from public.patients where deleted_at is null order by created_at loop
    begin
      update public.patients set deleted_at = now() where id = r.id;
      perform set_config('role','authenticated',true);
      perform public.purge_patient(r.id,'DELETE');
      perform set_config('role','postgres',true);
      ok := ok+1;
      raise exception 'rollback-one';
    exception when others then
      perform set_config('role','postgres',true);
      if sqlerrm <> 'rollback-one' then bad := bad+1; raise notice 'FAIL % : %', r.id, sqlerrm; end if;
    end;
  end loop;
  raise notice 'checked ok-or-rolled=% bad=%', ok, bad;
end $$;
rollback;
