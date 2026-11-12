create table if not exists public.treatment_steps (
  id uuid primary key default gen_random_uuid(),
  treatment_id uuid not null references public.patient_treatments(id) on delete cascade,
  step_no int not null,
  title text not null,
  done_on date,
  created_at timestamptz not null default now(),
  constraint treatment_steps_title_check check (length(btrim(title)) > 0),
  constraint treatment_steps_uq unique (treatment_id, step_no)
);
create index if not exists treatment_steps_tr_idx on public.treatment_steps(treatment_id);
alter table public.treatment_steps enable row level security;
drop policy if exists ts_select on public.treatment_steps;
create policy ts_select on public.treatment_steps for select to authenticated using ((select public.has_perm('clinical.view')));
drop policy if exists ts_insert on public.treatment_steps;
create policy ts_insert on public.treatment_steps for insert to authenticated with check ((select public.has_perm('clinical.edit')));
drop policy if exists ts_update on public.treatment_steps;
create policy ts_update on public.treatment_steps for update to authenticated using ((select public.has_perm('clinical.edit'))) with check ((select public.has_perm('clinical.edit')));
drop policy if exists ts_delete on public.treatment_steps;
create policy ts_delete on public.treatment_steps for delete to authenticated using ((select public.has_perm('clinical.edit')));
grant select, insert, update, delete on table public.treatment_steps to authenticated;
notify pgrst, 'reload schema';
