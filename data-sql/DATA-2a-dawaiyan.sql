insert into public.medicines (category, name, generic_name, med_type, strength, dosage_form)
select 'dental', v.n, v.g, v.t, v.s, v.f
from (values
  ('Amoxicillin', 'Amoxicillin', 'Antibiotic', '250 mg', 'Capsule'),
  ('Amoxicillin', 'Amoxicillin', 'Antibiotic', '500 mg (Capsule)', 'Capsule'),
  ('Amoxicillin', 'Amoxicillin', 'Antibiotic', '500 mg (Tablet)', 'Tablet'),
  ('Amoxicillin', 'Amoxicillin', 'Antibiotic', '875 mg', 'Tablet'),
  ('Amoxicillin', 'Amoxicillin', 'Antibiotic', '125 mg/5 ml', 'Suspension'),
  ('Amoxicillin', 'Amoxicillin', 'Antibiotic', '250 mg/5 ml', 'Suspension'),
  ('Amoxicillin', 'Amoxicillin', 'Antibiotic', '400 mg/5 ml', 'Suspension'),
  ('Augmentin', 'Amoxicillin + Clavulanate', 'Antibiotic', '375 mg (250/125)', 'Tablet'),
  ('Augmentin', 'Amoxicillin + Clavulanate', 'Antibiotic', '625 mg (500/125)', 'Tablet'),
  ('Augmentin', 'Amoxicillin + Clavulanate', 'Antibiotic', '1 g (875/125)', 'Tablet'),
  ('Augmentin', 'Amoxicillin + Clavulanate', 'Antibiotic', '156.25 mg/5 ml', 'Suspension'),
  ('Augmentin', 'Amoxicillin + Clavulanate', 'Antibiotic', '228.5 mg/5 ml', 'Suspension'),
  ('Augmentin', 'Amoxicillin + Clavulanate', 'Antibiotic', '312.5 mg/5 ml', 'Suspension'),
  ('Augmentin', 'Amoxicillin + Clavulanate', 'Antibiotic', '457 mg/5 ml', 'Suspension'),
  ('Augmentin', 'Amoxicillin + Clavulanate', 'Antibiotic', 'ES 642.9 mg/5 ml', 'Suspension'),
  ('Ampiclox', 'Ampicillin + Cloxacillin', 'Antibiotic', '250 mg', 'Capsule'),
  ('Ampiclox', 'Ampicillin + Cloxacillin', 'Antibiotic', '500 mg', 'Capsule'),
  ('Ampiclox', 'Ampicillin + Cloxacillin', 'Antibiotic', '125 mg/5 ml', 'Suspension'),
  ('Ampiclox', 'Ampicillin + Cloxacillin', 'Antibiotic', '250 mg/5 ml', 'Suspension'),
  ('Flagyl', 'Metronidazole', 'Antibiotic', '200 mg', 'Tablet'),
  ('Flagyl', 'Metronidazole', 'Antibiotic', '400 mg', 'Tablet'),
  ('Flagyl', 'Metronidazole', 'Antibiotic', '200 mg/5 ml', 'Suspension'),
  ('Azithromycin', 'Azithromycin', 'Antibiotic', '250 mg', 'Tablet'),
  ('Azithromycin', 'Azithromycin', 'Antibiotic', '500 mg', 'Tablet'),
  ('Azithromycin', 'Azithromycin', 'Antibiotic', '100 mg/5 ml', 'Suspension'),
  ('Azithromycin', 'Azithromycin', 'Antibiotic', '200 mg/5 ml', 'Suspension'),
  ('Cefixime', 'Cefixime', 'Antibiotic', '200 mg', 'Capsule'),
  ('Cefixime', 'Cefixime', 'Antibiotic', '400 mg', 'Capsule'),
  ('Cefixime', 'Cefixime', 'Antibiotic', '100 mg/5 ml', 'Suspension'),
  ('Cefixime', 'Cefixime', 'Antibiotic', '200 mg/5 ml', 'Suspension'),
  ('Clindamycin', 'Clindamycin', 'Antibiotic', '150 mg', 'Capsule'),
  ('Clindamycin', 'Clindamycin', 'Antibiotic', '300 mg', 'Capsule'),
  ('Greymax', null, 'Antibiotic', null, null),
  ('Synflex', 'Naproxen Sodium', 'Painkiller', '275 mg', 'Tablet'),
  ('Synflex', 'Naproxen Sodium', 'Painkiller', '550 mg', 'Tablet'),
  ('Ansaid', 'Flurbiprofen', 'Painkiller', '100 mg', 'Tablet'),
  ('Panadol', 'Paracetamol', 'Painkiller', '500 mg', 'Tablet'),
  ('Panadol', 'Paracetamol', 'Painkiller', '650 mg', 'Tablet'),
  ('Panadol', 'Paracetamol', 'Painkiller', '120 mg/5 ml', 'Suspension'),
  ('Panadol', 'Paracetamol', 'Painkiller', '250 mg/5 ml', 'Suspension'),
  ('Panadol', 'Paracetamol', 'Painkiller', '100 mg/ml (Paediatric)', 'Drops'),
  ('Brufen', 'Ibuprofen', 'Painkiller', '200 mg', 'Tablet'),
  ('Brufen', 'Ibuprofen', 'Painkiller', '400 mg', 'Tablet'),
  ('Brufen', 'Ibuprofen', 'Painkiller', '600 mg', 'Tablet'),
  ('Brufen', 'Ibuprofen', 'Painkiller', '100 mg/5 ml', 'Suspension')
) as v(n, g, t, s, f)
where not exists (
  select 1 from public.medicines m
  where m.category = 'dental' and lower(btrim(m.name)) = lower(btrim(v.n))
    and lower(coalesce(m.strength, '')) = lower(coalesce(v.s, ''))
);
