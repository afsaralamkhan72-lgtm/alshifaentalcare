-- Phase 2 wapas lene ke liye (sirf agar zaroorat ho). Data ko haath nahi lagata,
-- audit_log table ko bhi nahi chhedta (record mehfooz rehta hai).
do $$
declare t text;
begin
  foreach t in array array['patients','transactions','installments','treatment_plans','treatment_episodes','inventory','lab_cases','labs','prescriptions','staff_profiles','treating_doctors']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_audit_%1$s on public.%1$s', t);
    end if;
  end loop;
end $$;

drop trigger if exists trg_guard_patient_soft_delete on public.patients;

-- Purani (sab staff ko poora access) policies wapas
drop policy if exists owner_select_transactions on public.transactions;
drop policy if exists owner_insert_transactions on public.transactions;
drop policy if exists owner_update_transactions on public.transactions;
drop policy if exists "staff_full_access_transactions" on public.transactions;
create policy "staff_full_access_transactions" on public.transactions for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists owner_select_treatment_plans on public.treatment_plans;
drop policy if exists owner_insert_treatment_plans on public.treatment_plans;
drop policy if exists owner_update_treatment_plans on public.treatment_plans;
drop policy if exists "staff_all_plans" on public.treatment_plans;
create policy "staff_all_plans" on public.treatment_plans for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists owner_select_installments on public.installments;
drop policy if exists owner_insert_installments on public.installments;
drop policy if exists owner_update_installments on public.installments;
drop policy if exists "staff_all_installments" on public.installments;
create policy "staff_all_installments" on public.installments for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists owner_select_treatment_episodes on public.treatment_episodes;
drop policy if exists owner_insert_treatment_episodes on public.treatment_episodes;
drop policy if exists owner_update_treatment_episodes on public.treatment_episodes;
drop policy if exists "staff_all_episodes" on public.treatment_episodes;
create policy "staff_all_episodes" on public.treatment_episodes for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff_select_patients" on public.patients;
drop policy if exists "staff_insert_patients" on public.patients;
drop policy if exists "staff_update_patients" on public.patients;
drop policy if exists "admin_delete_patients" on public.patients;
drop policy if exists "staff_full_access_patients" on public.patients;
create policy "staff_full_access_patients" on public.patients for all using (public.is_staff()) with check (public.is_staff());
