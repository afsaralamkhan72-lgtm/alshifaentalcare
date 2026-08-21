-- =====================================================================
-- PHASE 7 — Patient Portal Access Codes
-- Run AFTER the main SETUP-ALL.sql
-- =====================================================================

-- Each patient gets a short, random, word-based code. The code IS the
-- key to their record, so it is generated randomly (not from the phone
-- number) and can be regenerated if it ever leaks.
alter table public.patients
  add column if not exists portal_code text unique;

create index if not exists idx_patients_portal_code
  on public.patients (portal_code) where portal_code is not null;

-- Simple, easy-to-read word list (no confusing look-alike words)
create or replace function public.generate_portal_code()
returns text as $$
declare
  words text[] := array[
    'chand','sitara','roshan','sabza','darya','pahar','baadal','shabnam',
    'gulab','chameli','motia','yasmin','kiran','saagar','noor','sahar',
    'aftab','mahtab','sadaf','moti','heera','sona','chandi','anmol'
  ];
  code text;
begin
  loop
    code := words[1 + floor(random() * array_length(words, 1))::int] || '-' ||
            words[1 + floor(random() * array_length(words, 1))::int] || '-' ||
            words[1 + floor(random() * array_length(words, 1))::int] || '-' ||
            lpad(floor(random() * 100)::text, 2, '0');

    -- Vanishingly unlikely, but make sure it is unique
    exit when not exists (select 1 from public.patients where portal_code = code);
  end loop;

  return code;
end;
$$ language plpgsql;

-- New patients get a code automatically
create or replace function public.set_portal_code()
returns trigger as $$
begin
  if new.portal_code is null then
    new.portal_code := public.generate_portal_code();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_portal_code on public.patients;
create trigger trg_set_portal_code
  before insert on public.patients
  for each row execute function public.set_portal_code();

-- Give existing patients a code too
update public.patients
   set portal_code = public.generate_portal_code()
 where portal_code is null;
