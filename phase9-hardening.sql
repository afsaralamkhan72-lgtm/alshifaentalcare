-- =====================================================================
-- PHASE 9: Hifazat (portal code, booking spam)
-- Pehle test/staging par chalayein. Dobara chalane se koi nuqsan nahi.
-- Purane patient links/codes jaise the waise kaam karte rahenge (kuch toota nahi).
-- =====================================================================

-- 1. Mazboot portal code: naye mareezon ke liye lamba random code (andaza lagana namumkin)
--    Purana code 24 lafzon ke 3 combo + 2 number tha (sirf ~1.3 million), naya ~10^15 se zyada.
create extension if not exists pgcrypto;

create or replace function public.generate_portal_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';  -- o/0, i/l/1 jaise confusing nahi
  bytes bytea;
  code text;
  i int;
begin
  loop
    bytes := gen_random_bytes(12);
    code := '';
    for i in 0..11 loop
      code := code || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
      if i in (3, 7) then code := code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.patients where portal_code = code);
  end loop;
  return code;
end;
$$;

-- Purane (kamzor) codes ko badalne ka OPTION (sirf doctor/admin, SQL editor se chalayein jab chahein).
-- NOTE: ye chalane se jo links mareezon ko pehle bheje ja chuke wo band ho jayenge, is liye khud nahi chalta.
create or replace function public.rotate_weak_portal_codes()
returns int
language plpgsql security definer
set search_path = public
as $$
declare n int;
begin
  if auth.uid() is not null and not public.has_role('admin') then
    raise exception 'Sirf admin';
  end if;
  update public.patients set portal_code = public.generate_portal_code()
   where portal_code ~ '^[a-z]+-[a-z]+-[a-z]+-[0-9]{2}$';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.rotate_weak_portal_codes() from public, anon;
grant execute on function public.rotate_weak_portal_codes() to authenticated;

-- 2. Website booking ko spam se bachana (sirf bina login wale par lagta hai; staff par nahi)
create or replace function public.guard_public_booking()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare v_digits text;
begin
  if auth.uid() is not null then return new; end if;   -- staff ki entry par koi rok nahi

  new.patient_name := btrim(coalesce(new.patient_name, ''));
  new.phone := btrim(coalesce(new.phone, ''));
  v_digits := regexp_replace(new.phone, '[^0-9]', '', 'g');

  if length(new.patient_name) < 2 or length(new.patient_name) > 100 then
    raise exception 'Naam theek nahi';
  end if;
  if length(v_digits) < 10 or length(v_digits) > 15 then
    raise exception 'Phone number theek nahi';
  end if;
  if new.treatment_name is not null and length(new.treatment_name) > 150 then
    raise exception 'Treatment ka naam bohat lamba hai';
  end if;
  if new.preferred_date is not null
     and (new.preferred_date < current_date - 1 or new.preferred_date > current_date + 365) then
    raise exception 'Tareekh theek nahi';
  end if;

  -- aik phone se 24 ghante mein 3 se zyada nahi
  if (select count(*) from public.appointments
       where regexp_replace(phone, '[^0-9]', '', 'g') = v_digits
         and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Is number se pehle hi bohat requests aa chuki hain. Baraye meherbani WhatsApp par raabta karein';
  end if;

  -- poori website se 1 ghante mein 60 se zyada nahi (spam bhar-maar se bachao)
  if (select count(*) from public.appointments
       where source = 'website' and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Abhi bohat requests aa rahi hain. Baraye meherbani WhatsApp par raabta karein';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_public_booking on public.appointments;
create trigger trg_guard_public_booking
  before insert on public.appointments
  for each row execute function public.guard_public_booking();
