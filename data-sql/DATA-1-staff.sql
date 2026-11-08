insert into public.staff_members (full_name, title, monthly_salary, notes)
select v.n, v.t, v.s, v.d
from (values
  ('Dr. Sachin', 'Dental Doctor', 40000, 'Dental Care'),
  ('Dr. Shamshad Bibi', 'Homeopathic Doctor', 40000, 'Homeopathic Department'),
  ('Muhammad Shahid Mahmood', 'Clinic Staff', 20000, null),
  ('Muhammad Zahid Mahmood', 'Clinic Staff', 20000, null)
) as v(n, t, s, d)
where not exists (select 1 from public.staff_members m where lower(btrim(m.full_name)) = lower(btrim(v.n)));

update public.attendance_rules set pay_day = 5 where id = 1 and pay_day is null;
