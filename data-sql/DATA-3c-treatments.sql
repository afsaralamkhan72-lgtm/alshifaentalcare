insert into public.treatment_catalog (name, department, category, applies_to, price, price_note)
select v.n, v.d, v.c, v.a, v.p, v.x
from (values
  ('Emergency Visit', 'dental', 'Other', 'once', 500::numeric, 'Rs. 500-1,000'),
  ('Follow-up Visit', 'general', 'Other', 'once', 200::numeric, 'Rs. 200-300'),
  ('Homeopathic Medicine', 'homeopathic', 'Medicine', 'once', 100::numeric, 'Rs. 100-300')
) as v(n, d, c, a, p, x)
where not exists (select 1 from public.treatment_catalog t where lower(btrim(t.name)) = lower(btrim(v.n)));
