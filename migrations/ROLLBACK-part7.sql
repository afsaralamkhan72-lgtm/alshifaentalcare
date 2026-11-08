drop function if exists public.purge_patient(uuid, text);
create or replace function public.block_patient_hard_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'Patient ko hamesha ke liye delete nahi kiya ja sakta. Recycle bin wala (soft) delete istemal karein.';
end $$;
create or replace function public.inventory_movements_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Stock movement mein tabdeeli ya delete allowed nahi hai';
end $$;
