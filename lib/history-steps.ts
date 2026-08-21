export type FieldType = 'radio' | 'checkboxes' | 'text' | 'textarea' | 'number' | 'date' | 'scale'

export interface Field {
  key: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
  /** Only show this field when another field has one of these values */
  showIf?: { key: string; equals: string[] }
  full?: boolean
}

export interface Step {
  /** Matches the JSONB column name in patient_history */
  column: string
  title: string
  fields: Field[]
}

/**
 * The 9-step clinical intake. Doctor mostly clicks options and moves on.
 * Everything is optional — a half-filled history is still saved.
 */
export const HISTORY_STEPS: Step[] = [
  {
    column: 'demographics',
    title: 'Demographics',
    fields: [
      { key: 'occupation', label: 'Occupation', type: 'text' },
      { key: 'marital_status', label: 'Marital Status', type: 'radio', options: ['Single', 'Married'] },
      { key: 'emergency_contact_name', label: 'Emergency Contact Name', type: 'text' },
      { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', type: 'text' },
      { key: 'referred_by', label: 'Referred By', type: 'text', placeholder: 'Walk-in / Doctor / Patient name' },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },
  {
    column: 'medical_history',
    title: 'Medical History',
    fields: [
      {
        key: 'conditions',
        label: 'Medical Conditions',
        type: 'checkboxes',
        full: true,
        options: [
          'Diabetes',
          'Hypertension',
          'Cardiac Disease',
          'Asthma',
          'Bleeding Disorder',
          'Epilepsy',
          'Thyroid Disorder',
          'Hepatitis B/C',
          'Tuberculosis',
          'Kidney Disease',
          'None',
        ],
      },
      { key: 'allergies', label: 'Allergies', type: 'text', full: true, placeholder: 'Penicillin, Latex, etc.' },
      { key: 'current_medications', label: 'Current Medications', type: 'textarea', full: true },
      { key: 'blood_thinners', label: 'On Blood Thinners?', type: 'radio', options: ['Yes', 'No'] },
      { key: 'pregnant', label: 'Pregnant / Breastfeeding', type: 'radio', options: ['Yes', 'No', 'N/A'] },
      { key: 'hospitalization', label: 'Past Hospitalization / Surgery', type: 'textarea', full: true },
      {
        key: 'habits',
        label: 'Habits',
        type: 'checkboxes',
        full: true,
        options: ['Smoking', 'Naswar', 'Paan', 'Gutka', 'Chaalia', 'Betel Nut', 'None'],
      },
    ],
  },
  {
    column: 'dental_history',
    title: 'Dental History',
    fields: [
      { key: 'last_dental_visit', label: 'Last Dental Visit', type: 'text', placeholder: '6 months ago / Never' },
      {
        key: 'previous_treatments',
        label: 'Previous Treatments',
        type: 'checkboxes',
        full: true,
        options: ['Scaling', 'Filling', 'Extraction', 'Root Canal', 'Crown/Bridge', 'Denture', 'Braces', 'Implant', 'None'],
      },
      {
        key: 'anesthesia_reaction',
        label: 'Reaction to Local Anesthesia',
        type: 'radio',
        options: ['No', 'Yes'],
      },
      { key: 'anesthesia_details', label: 'Reaction Details', type: 'text', full: true, showIf: { key: 'anesthesia_reaction', equals: ['Yes'] } },
      { key: 'brushing', label: 'Brushing Frequency', type: 'radio', options: ['Once daily', 'Twice daily', 'Irregular'] },
      { key: 'floss', label: 'Uses Floss / Miswak', type: 'radio', options: ['Yes', 'No'] },
    ],
  },
  {
    column: 'chief_complaint',
    title: 'Chief Complaint',
    fields: [
      { key: 'complaint', label: 'Chief Complaint', type: 'textarea', full: true, placeholder: 'Patient ke apne alfaaz mein' },
      { key: 'duration', label: 'Duration', type: 'text', placeholder: '3 din / 2 hafte' },
      { key: 'pain_type', label: 'Pain Type', type: 'radio', options: ['None', 'Sharp', 'Dull', 'Throbbing', 'Sensitivity'] },
      { key: 'pain_scale', label: 'Pain Severity (0–10)', type: 'scale' },
      {
        key: 'aggravating',
        label: 'Aggravated By',
        type: 'checkboxes',
        full: true,
        options: ['Hot', 'Cold', 'Sweet', 'Chewing', 'Night', 'Nothing'],
      },
      { key: 'swelling', label: 'Swelling Present', type: 'radio', options: ['Yes', 'No'] },
    ],
  },
  {
    column: 'clinical_exam',
    title: 'Clinical Exam',
    fields: [
      { key: 'face_symmetry', label: 'Face Symmetry', type: 'radio', options: ['Normal', 'Abnormal'] },
      { key: 'face_details', label: 'If abnormal, details', type: 'text', full: true, showIf: { key: 'face_symmetry', equals: ['Abnormal'] } },
      {
        key: 'tmj',
        label: 'Temporomandibular Joint (TMJ)',
        type: 'checkboxes',
        full: true,
        options: ['Normal', 'Clicking', 'Pain', 'Limited Opening'],
      },
      { key: 'soft_tissues', label: 'Soft Tissues', type: 'radio', options: ['Normal', 'Abnormalities'] },
      { key: 'soft_tissue_details', label: 'Ulcers / lesions details', type: 'text', full: true, showIf: { key: 'soft_tissues', equals: ['Abnormalities'] } },
      { key: 'gingival', label: 'Gingival / Periodontal Health', type: 'radio', options: ['Healthy', 'Gingivitis', 'Periodontitis'] },
      { key: 'pocket_depth', label: 'Pocket Depth (mm)', type: 'text', placeholder: '3 mm' },
      { key: 'bleeding_probing', label: 'Bleeding on Probing', type: 'radio', options: ['Yes', 'No'] },
      { key: 'mobility', label: 'Tooth Mobility', type: 'radio', options: ['Present', 'Absent'] },
      { key: 'wear', label: 'Tooth Wear', type: 'radio', options: ['None', 'Mild', 'Moderate', 'Severe'] },
      { key: 'occlusion', label: 'Occlusion (Bite)', type: 'radio', options: ['Normal', 'Class I', 'Class II', 'Class III'] },
      { key: 'bruxism', label: 'Signs of Bruxism / Clenching', type: 'radio', options: ['Yes', 'No'] },
      { key: 'missing_teeth', label: 'Missing / Restored Teeth', type: 'textarea', full: true },
    ],
  },
  {
    column: 'radiographs',
    title: 'Radiographs',
    fields: [
      {
        key: 'types',
        label: 'Radiographs Taken',
        type: 'checkboxes',
        full: true,
        options: ['None', 'Periapical (IOPA)', 'Bitewing', 'OPG / Panoramic', 'Lateral Ceph', 'CBCT'],
      },
      { key: 'date_taken', label: 'Date Taken', type: 'date' },
      { key: 'findings', label: 'Radiographic Findings', type: 'textarea', full: true, placeholder: 'Caries, bone loss, periapical radiolucency...' },
    ],
  },
  {
    column: 'diagnosis_plan',
    title: 'Diagnosis & Plan',
    fields: [
      { key: 'diagnosis', label: 'Diagnosis', type: 'textarea', full: true },
      { key: 'treatment_plan', label: 'Treatment Plan', type: 'textarea', full: true },
      { key: 'phases', label: 'Number of Visits Expected', type: 'text' },
      { key: 'prognosis', label: 'Prognosis', type: 'radio', options: ['Good', 'Fair', 'Poor', 'Guarded'] },
      { key: 'referral', label: 'Referral Needed', type: 'text', full: true, placeholder: 'Oral surgeon / Orthodontist / None' },
    ],
  },
  {
    column: 'consent',
    title: 'Informed Consent',
    fields: [
      { key: 'explained', label: 'Treatment, risks aur alternatives samjha diye gaye', type: 'radio', options: ['Yes', 'No'] },
      { key: 'cost_explained', label: 'Cost aur payment plan bata diya gaya', type: 'radio', options: ['Yes', 'No'] },
      { key: 'consent_given', label: 'Patient ne consent diya', type: 'radio', options: ['Yes', 'No'] },
      { key: 'consent_by', label: 'Consent Given By', type: 'radio', options: ['Patient', 'Guardian'] },
      { key: 'guardian_name', label: 'Guardian Name', type: 'text', showIf: { key: 'consent_by', equals: ['Guardian'] } },
      { key: 'consent_date', label: 'Date', type: 'date' },
      { key: 'consent_notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },
]
