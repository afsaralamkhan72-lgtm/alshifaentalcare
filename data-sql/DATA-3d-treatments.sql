insert into public.treatment_catalog (name, department, category, applies_to, price, price_note)
select v.n, v.d, v.c, v.a, 0, null
from (values
  ('PFM Bridge', 'dental', 'Crown & Bridge', 'tooth'),
  ('E-max Bridge', 'dental', 'Crown & Bridge', 'tooth'),
  ('Zirconia Bridge', 'dental', 'Crown & Bridge', 'tooth'),
  ('Porcelain Bridge', 'dental', 'Crown & Bridge', 'tooth'),
  ('E-max Crown', 'dental', 'Crown & Bridge', 'tooth'),
  ('Veneer', 'dental', 'Crown & Bridge', 'tooth'),
  ('Flexible Denture', 'dental', 'Denture', 'tooth'),
  ('Cast Partial Denture', 'dental', 'Denture', 'tooth')
) as v(n, d, c, a)
where not exists (select 1 from public.treatment_catalog t where lower(btrim(t.name)) = lower(btrim(v.n)));
