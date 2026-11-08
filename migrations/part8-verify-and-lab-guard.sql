alter table public.invoices add column if not exists verify_code text default replace((gen_random_uuid())::text, '-'::text, ''::text);
alter table public.prescriptions add column if not exists verify_code text default replace((gen_random_uuid())::text, '-'::text, ''::text);
create unique index if not exists uq_invoices_verify on public.invoices using btree (verify_code);
create unique index if not exists uq_prescriptions_verify on public.prescriptions using btree (verify_code);
CREATE OR REPLACE FUNCTION public.verify_document(p_code text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ declare v_ok boolean := false; v_info jsonb; begin if p_code is null or length(p_code) < 20 or length(p_code) > 64 then return jsonb_build_object('ok', false); end if; select true into v_ok where exists (select 1 from public.invoices where verify_code = p_code and status <> 'void') or exists (select 1 from public.prescriptions where verify_code = p_code); if not coalesce(v_ok, false) then return jsonb_build_object('ok', false); end if; select value into v_info from public.site_settings where key = 'clinic_info'; return jsonb_build_object('ok', true, 'name', v_info->>'name', 'logo', v_info->>'logo_url'); end; $$;

CREATE OR REPLACE FUNCTION public.guard_lab_delete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ begin if TG_OP = 'DELETE' then if not public.is_owner() then raise exception 'Sirf doctor/admin ye kar sakta hai'; end if; return old; end if; if new.deleted_at is distinct from old.deleted_at and not public.is_owner() then raise exception 'Sirf doctor/admin ye kar sakta hai'; end if; return new; end; $$;
drop trigger if exists trg_guard_lab_delete on public.lab_cases;
create trigger trg_guard_lab_delete before delete or update on public.lab_cases for each row execute function public.guard_lab_delete();

grant execute on function public.verify_document(text) to anon, authenticated;
