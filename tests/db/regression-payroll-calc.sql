-- Al Shifa: salary / hazri ka hisab (late, jaldi jana, ghair-hazri, aadhi chhutti, overtime). SIRF TEST project. Aakhir mein ROLLBACK.
-- Purana mahina (2026-09) istemal hota hai: 30 din, 4 Itwar band => 26 khule din x 480 min = 12480 min.
begin;
do $$
declare sid uuid;
begin
  update public.attendance_rules set work_start = '09:00', shift_end = '17:00', grace_minutes = 15, late_from = 'shift_start', cut_late = true, early_cut = true,
    absent_cut = true, overtime_on = true, overtime_mult = 1, overtime_min = 0, weekly_off = '{0}' where id = 1;
  insert into public.staff_members (full_name, monthly_salary, joined_on, is_active, attendance_on, shift_start, shift_end, weekly_off)
    values ('PAY Test', 30000, '2025-01-01', true, true, null, null, null) returning id into sid;
  insert into public.staff_attendance (staff_id, att_date, status, check_in, check_out) values
    (sid, '2026-09-01', 'present', '09:00', '17:00'),   -- theek waqt
    (sid, '2026-09-02', 'present', '09:30', '17:00'),   -- 30 min late (grace 15 se zyada, shift_start se ginti)
    (sid, '2026-09-03', 'present', '09:10', '17:00'),   -- grace ke andar: late nahi
    (sid, '2026-09-04', 'present', '09:00', '16:30'),   -- 30 min jaldi gaya
    (sid, '2026-09-05', 'absent', null, null),          -- 480 min
    (sid, '2026-09-07', 'half', null, null),            -- 240 min
    (sid, '2026-09-08', 'present', '09:00', '18:00'),   -- 60 min overtime (khula din)
    (sid, '2026-09-06', 'present', '10:00', '12:00');   -- Itwar band din: 120 min overtime
  perform set_config('app.pay_sid', sid::text, true);
end $$;
select set_config('request.jwt.claim.sub', (select id::text from public.staff_profiles where role in ('admin','doctor') and is_active order by created_at limit 1), true);
select set_config('role', 'authenticated', true);
do $$
declare sid uuid := current_setting('app.pay_sid')::uuid; e record; n int;
begin
  select * into e from public.payroll_calc('2026-09', sid);
  if e.month_min = 12480 then raise notice 'PASS month minutes = 26 khule din x 480 = 12480'; else raise exception 'FAIL month_min %', e.month_min; end if;
  if e.late_min = 30 and e.late_days = 1 then raise notice 'PASS late: 30 min, grace ke andar wala late nahi'; else raise exception 'FAIL late % %', e.late_min, e.late_days; end if;
  if e.early_min = 30 then raise notice 'PASS jaldi jana: 30 min'; else raise exception 'FAIL early %', e.early_min; end if;
  if e.absent_min = 720 and e.absent = 1 and e.half = 1 then raise notice 'PASS ghair-hazri 480 + aadhi 240 = 720 min'; else raise exception 'FAIL absent % % %', e.absent_min, e.absent, e.half; end if;
  if e.ot_min = 180 then raise notice 'PASS overtime: khula din 60 + band din 120 = 180 min'; else raise exception 'FAIL ot %', e.ot_min; end if;
  if e.entitled = 30000 and e.cut_late = 72 and e.cut_early = 72 and e.cut_absent = 1731 and e.ot_amount = 433 then raise notice 'PASS rupay: entitled 30000, katoti 72/72/1731, overtime 433'; else raise exception 'FAIL money % % % % %', e.entitled, e.cut_late, e.cut_early, e.cut_absent, e.ot_amount; end if;
  if e.net = 28558 then raise notice 'PASS net = 30000 - 72 - 72 - 1731 + 433 = 28558'; else raise exception 'FAIL net %', e.net; end if;
  -- naya shamil hone wala (mahine ke darmiyan join): sirf baqi din ki salary
  update public.staff_members set joined_on = '2026-09-16' where id = sid;
  select * into e from public.payroll_calc('2026-09', sid);
  select count(*) into n from generate_series('2026-09-16'::date, '2026-09-30'::date, interval '1 day') g where extract(dow from g) <> 0;
  if e.eff_min = n * 480 and e.entitled = round(30000.0 * e.eff_min / 12480) then raise notice 'PASS mid-month joiner: salary sirf % khule dinon ki (%)', n, e.entitled; else raise exception 'FAIL joiner % %', e.eff_min, e.entitled; end if;
end $$;
reset role;
insert into public.clinic_days (day, closed, reason) values ('2026-09-10', true, 'test band') on conflict (day) do update set closed = true;
select set_config('role', 'authenticated', true);
do $$
declare sid uuid := current_setting('app.pay_sid')::uuid; e record;
begin
  -- band (clinic closed) din ki katoti nahi
  update public.staff_members set joined_on = '2025-01-01' where id = sid;
  select * into e from public.payroll_calc('2026-09', sid);
  if e.month_min = 25 * 480 then raise notice 'PASS clinic band din mahine ke minute se nikal gaya (25 din)'; else raise exception 'FAIL closed day %', e.month_min; end if;
end $$;
rollback;
