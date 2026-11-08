alter table public.inventory add column if not exists description text;
alter table public.inventory add column if not exists deleted_at timestamptz;
alter table public.inventory add column if not exists merged_into uuid references public.inventory(id);
alter table public.inventory_movements drop constraint if exists inventory_movements_kind_check;
alter table public.inventory_movements add constraint inventory_movements_kind_check check (kind in ('opening','purchase','usage','count_correction','merge_in','merge_out'));
alter table public.audit_log drop constraint if exists audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check check (action in ('INSERT','UPDATE','DELETE','ARCHIVE','RESTORE_ACTIVE','MERGE','DELETE_TO_BIN','RESTORE_FROM_BIN','PURGE'));
