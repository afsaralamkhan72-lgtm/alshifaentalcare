export const COMPLAINTS = ['Toothache', 'Sensitivity', 'Swelling', 'Bleeding gums', 'Missing tooth', 'Broken tooth', 'Difficulty chewing', 'Cosmetic concern', 'Calculus / Tartar', 'Plaque', 'Bad breath', 'Mobility (daant hilna)', 'Cavity', 'Scaling', 'Braces', 'Abscess', 'Follow-up', 'Other']
export const HOMEO_COMPLAINTS = ['Bukhar', 'Sar dard', 'Khansi / zukam', 'Pait ki takleef', 'Jild (skin)', 'Allergy', 'Jor ka dard', 'Neend', 'Follow-up', 'Other']
export const DIAG_SUGGEST = [
  'Dental caries', 'Reversible pulpitis', 'Irreversible pulpitis', 'Pulp necrosis', 'Periapical abscess', 'Periapical periodontitis',
  'Gingivitis', 'Chronic periodontitis', 'Fractured tooth', 'Impacted tooth', 'Missing tooth', 'Dentine hypersensitivity',
  'Retained root', 'Malocclusion', 'Pericoronitis', 'Attrition / abrasion', 'Calculus / Tartar', 'Plaque', 'Halitosis', 'Tooth mobility',
]
export const OPTION_KINDS = [
  { kind: 'complaint', label: 'Dental takleef (chips)', defaults: COMPLAINTS },
  { kind: 'homeo_complaint', label: 'Homeopathic takleef (chips)', defaults: HOMEO_COMPLAINTS },
  { kind: 'diagnosis', label: 'Diagnosis (suggestions)', defaults: DIAG_SUGGEST },
] as const
