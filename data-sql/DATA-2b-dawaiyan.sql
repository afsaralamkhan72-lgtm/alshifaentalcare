insert into public.medicines (category, name, generic_name, med_type, strength, dosage_form)
select 'dental', v.n, v.g, v.t, v.s, v.f
from (values
  ('Brufen', 'Ibuprofen', 'Painkiller', '200 mg/5 ml', 'Suspension'),
  ('Ponstan', 'Mefenamic Acid', 'Painkiller', '250 mg', 'Tablet'),
  ('Ponstan', 'Mefenamic Acid', 'Painkiller', '500 mg', 'Tablet'),
  ('Ponstan', 'Mefenamic Acid', 'Painkiller', '50 mg/5 ml', 'Suspension'),
  ('Dicloran', 'Diclofenac', 'Painkiller', '25 mg', 'Tablet'),
  ('Dicloran', 'Diclofenac', 'Painkiller', '50 mg', 'Tablet'),
  ('Dicloran', 'Diclofenac', 'Painkiller', '100 mg SR', 'Tablet'),
  ('Arinac', null, 'Painkiller', 'Adult (pack se likhein)', 'Tablet'),
  ('Arinac', null, 'Painkiller', 'Paediatric (pack se likhein)', 'Suspension'),
  ('Chlorhexidine Mouthwash', 'Chlorhexidine', 'Mouthwash', '0.12%', 'Mouthwash'),
  ('Chlorhexidine Mouthwash', 'Chlorhexidine', 'Mouthwash', '0.2%', 'Mouthwash'),
  ('Pyodine Mouthwash', 'Povidone Iodine', 'Mouthwash', '0.1% (60 ml)', 'Mouthwash'),
  ('Pyodine Oral Gargle', 'Povidone Iodine', 'Mouthwash', '1%', 'Mouthwash'),
  ('Enziclor Gel', null, 'Oral Gel', null, 'Gel'),
  ('Chlorhexidine Gel', 'Chlorhexidine', 'Oral Gel', '1%', 'Gel'),
  ('Dologel', null, 'Oral Gel', null, 'Gel'),
  ('Bonjela', null, 'Oral Gel', null, 'Gel'),
  ('Orasore Gel', null, 'Oral Gel', null, 'Gel'),
  ('Oral Anaesthetic Gel', null, 'Oral Gel', null, 'Gel'),
  ('Cetirizine', 'Cetirizine', 'Allergy', '5 mg', null),
  ('Cetirizine', 'Cetirizine', 'Allergy', '10 mg', null),
  ('Cetirizine', 'Cetirizine', 'Allergy', '5 mg/5 ml', 'Syrup'),
  ('Loratadine', 'Loratadine', 'Allergy', '10 mg', null),
  ('Loratadine', 'Loratadine', 'Allergy', '5 mg/5 ml', 'Syrup'),
  ('Fexofenadine', 'Fexofenadine', 'Allergy', '120 mg', null),
  ('Fexofenadine', 'Fexofenadine', 'Allergy', '180 mg', null),
  ('Omeprazole', 'Omeprazole', 'Stomach', '20 mg', null),
  ('Omeprazole', 'Omeprazole', 'Stomach', '40 mg', null),
  ('Esomeprazole', 'Esomeprazole', 'Stomach', '20 mg', null),
  ('Esomeprazole', 'Esomeprazole', 'Stomach', '40 mg', null),
  ('Pantoprazole', 'Pantoprazole', 'Stomach', '20 mg', null),
  ('Pantoprazole', 'Pantoprazole', 'Stomach', '40 mg', null),
  ('Sensodyne', null, 'Toothpaste', null, 'Toothpaste'),
  ('Colgate Total', null, 'Toothpaste', null, 'Toothpaste'),
  ('Parodontax', null, 'Toothpaste', null, 'Toothpaste'),
  ('Dental Fluoride Gel', 'Fluoride', 'Dental Product', null, 'Gel'),
  ('Dental Desensitizing Agent', null, 'Dental Product', null, null),
  ('Saline Mouth Rinse', 'Sodium Chloride', 'Mouthwash', null, 'Mouthwash')
) as v(n, g, t, s, f)
where not exists (
  select 1 from public.medicines m
  where m.category = 'dental' and lower(btrim(m.name)) = lower(btrim(v.n))
    and lower(coalesce(m.strength, '')) = lower(coalesce(v.s, ''))
);
