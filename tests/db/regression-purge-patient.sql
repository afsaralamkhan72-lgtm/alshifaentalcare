-- Purge patient: guards + totals. Har check fail par exception. Aakhir mein rollback (kuch nahi badalta).
begin;
do $$
declare v_id uuid; v_admin text; v_rec text; v_inv numeric; v_inc numeric; v_stock numeric; r jsonb; ok boolean;
begin
  select id::text into v_admin from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1;
  select id::text into v_rec from public.staff_profiles where role='receptionist' limit 1;
  perform set_config('request.jwt.claim.sub', v_admin, true);
  insert into public.patients (full_name, phone, department) values ('PURGE TEST', '0300'||floor(random()*9000000+1000000)::int, 'dental') returning id into v_id;
  select coalesce(sum(total),0) into v_inv from public.invoices where status<>'void';
  select coalesce(sum(amount),0) into v_inc from public.transactions where type='income';
  select coalesce(sum(quantity),0) into v_stock from public.inventory;
  perform set_config('role','authenticated',true);
  -- 1 pehle soft delete zaroori
  begin perform public.purge_patient(v_id,'DELETE'); raise exception 'FAIL: bina soft delete purge ho gaya'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  update public.patients set deleted_at=now() where id=v_id;
  -- 2 DELETE likhna zaroori
  begin perform public.purge_patient(v_id,'nahi'); raise exception 'FAIL: bina DELETE purge ho gaya'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- 3 receptionist nahi kar sakta
  perform set_config('request.jwt.claim.sub', v_rec, true);
  begin perform public.purge_patient(v_id,'DELETE'); raise exception 'FAIL: receptionist ne purge kar diya'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  -- 4 owner kar sakta hai
  perform set_config('request.jwt.claim.sub', v_admin, true);
  r := public.purge_patient(v_id,'DELETE');
  if exists (select 1 from public.patients where id=v_id) then raise exception 'FAIL: patient reh gaya'; end if;
  -- 5 baqi totals nahi badle
  if v_inv <> (select coalesce(sum(total),0) from public.invoices where status<>'void') then raise exception 'FAIL: invoice total badla'; end if;
  if v_inc <> (select coalesce(sum(amount),0) from public.transactions where type='income') then raise exception 'FAIL: income badli'; end if;
  if v_stock <> (select coalesce(sum(quantity),0) from public.inventory) then raise exception 'FAIL: stock badla'; end if;
  -- 6 seedha hard delete ab bhi band
  begin perform set_config('role','postgres',true); delete from public.patients where id=(select id from public.patients limit 1); raise exception 'FAIL: seedha delete chal gaya'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  raise notice 'purge-patient: 6/6 PASS';
end $$;
rollback;
