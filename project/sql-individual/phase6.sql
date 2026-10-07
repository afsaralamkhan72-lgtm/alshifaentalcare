-- =====================================================================
-- PHASE 6 — Recall System
-- Run AFTER phase5.sql
-- =====================================================================

-- A recall is a standing reminder: "scaling every 6 months".
-- One patient can have several (scaling, check-up, denture review).
create table if not exists public.recalls (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid not null references public.patients(id) on delete cascade,

  recall_type      text not null,              -- Scaling / Check-up / Denture Review...
  interval_months  int not null default 6 check (interval_months > 0),

  last_done        date,
  next_due         date not null,

  status           text default 'active' check (status in ('active','stopped')),
  notes            text,

  -- How many times we've messaged since it came due (stops nagging forever)
  reminders_sent   int default 0,
  last_reminded    date,

  created_by       uuid references public.staff_profiles(id),
  created_at       timestamptz default now()
);

create index if not exists idx_recalls_due on public.recalls (next_due) where status = 'active';
create index if not exists idx_recalls_patient on public.recalls (patient_id);

-- A patient shouldn't have the same recall type twice
create unique index if not exists idx_recalls_unique
  on public.recalls (patient_id, recall_type) where status = 'active';

alter table public.recalls enable row level security;

drop policy if exists "staff_all_recalls" on public.recalls;
create policy "staff_all_recalls" on public.recalls
  for all using (public.is_staff()) with check (public.is_staff());

-- Common recall types, editable later from CMS if needed
insert into public.site_settings (key, value) values
('recall_types', '[
  {"type": "Scaling & Polishing", "months": 6},
  {"type": "Routine Check-up", "months": 6},
  {"type": "Orthodontic Review", "months": 1},
  {"type": "Denture Review", "months": 12},
  {"type": "Post-RCT Review", "months": 6},
  {"type": "Implant Review", "months": 12}
]')
on conflict (key) do nothing;
