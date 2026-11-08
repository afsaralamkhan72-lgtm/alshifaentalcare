SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    key text NOT NULL,
    label text NOT NULL,
    body text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notify_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notify_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    kind text NOT NULL,
    ref text NOT NULL,
    ok boolean DEFAULT true NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mr_number text,
    full_name text NOT NULL,
    phone text NOT NULL,
    department text NOT NULL,
    age integer,
    gender text,
    address text,
    notes text,
    registered_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    assigned_doctor uuid,
    date_of_birth date,
    deleted_at timestamp with time zone,
    portal_code text,
    primary_doctor text,
    profile_photo_path text,
    phone2 text,
    guardian_name text,
    guardian_relation text,
    emergency_name text,
    emergency_phone text,
    referral_source text,
    consent_at timestamp with time zone,
    consent_by uuid,
    cnic text,
    family_of uuid,
    CONSTRAINT patients_department_check CHECK ((department = ANY (ARRAY['dental'::text, 'homeopathic'::text]))),
    CONSTRAINT patients_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])))
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    type text NOT NULL,
    category text,
    amount numeric(12,2) NOT NULL,
    payment_method text,
    description text,
    transaction_date date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    doctor_id uuid,
    treating_doctor text,
    treatment_name text,
    rate numeric(12,2),
    discount_amount numeric(12,2) DEFAULT 0,
    discount_pct numeric(5,2) DEFAULT 0,
    balance_due numeric(12,2) DEFAULT 0,
    due_date date,
    settled_at timestamp with time zone,
    invoice_id uuid,
    source text,
    idempotency_key text,
    CONSTRAINT transactions_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT transactions_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank'::text, 'easypaisa'::text, 'jazzcash'::text]))),
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- Name: treatment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    title text NOT NULL,
    total_cost numeric(12,2) NOT NULL,
    advance_paid numeric(12,2) DEFAULT 0,
    duration_months integer DEFAULT 24 NOT NULL,
    monthly_amount numeric(12,2) NOT NULL,
    start_date date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date,
    status text DEFAULT 'active'::text,
    notes text,
    doctor_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    treating_doctor text,
    CONSTRAINT treatment_plans_advance_paid_check CHECK ((advance_paid >= (0)::numeric)),
    CONSTRAINT treatment_plans_duration_months_check CHECK ((duration_months > 0)),
    CONSTRAINT treatment_plans_monthly_amount_check CHECK ((monthly_amount >= (0)::numeric)),
    CONSTRAINT treatment_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT treatment_plans_total_cost_check CHECK ((total_cost >= (0)::numeric))
);


--
-- Name: patient_balances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.patient_balances WITH (security_invoker='true') AS
 WITH plan AS (
         SELECT treatment_plans.patient_id,
            COALESCE(sum(
                CASE
                    WHEN (treatment_plans.status <> 'cancelled'::text) THEN treatment_plans.total_cost
                    ELSE (0)::numeric
                END), (0)::numeric) AS charges,
            COALESCE(sum(COALESCE(treatment_plans.advance_paid, (0)::numeric)), (0)::numeric) AS advance,
            COALESCE(sum(treatment_plans.total_cost), (0)::numeric) AS all_charges
           FROM public.treatment_plans
          GROUP BY treatment_plans.patient_id
        ), inst AS (
         SELECT p.patient_id,
            COALESCE(sum(i.paid_amount), (0)::numeric) AS paid
           FROM (public.installments i
             JOIN public.treatment_plans p ON ((p.id = i.plan_id)))
          GROUP BY p.patient_id
        ), tx AS (
         SELECT transactions.patient_id,
            COALESCE(sum(
                CASE
                    WHEN (transactions.rate IS NOT NULL) THEN (transactions.rate - COALESCE(transactions.discount_amount, (0)::numeric))
                    ELSE (0)::numeric
                END), (0)::numeric) AS charges,
            COALESCE(sum(
                CASE
                    WHEN ((transactions.treatment_name ~* '\((month|advance) ?[0-9]*\)\s*$'::text) OR (transactions.category = 'treatment-installment'::text)) THEN (0)::numeric
                    ELSE transactions.amount
                END), (0)::numeric) AS paid
           FROM public.transactions
          WHERE ((transactions.type = 'income'::text) AND (transactions.patient_id IS NOT NULL) AND (transactions.invoice_id IS NULL))
          GROUP BY transactions.patient_id
        ), legacy AS (
         SELECT transactions.patient_id,
            COALESCE(sum(
                CASE
                    WHEN (transactions.rate IS NOT NULL) THEN (transactions.rate - COALESCE(transactions.discount_amount, (0)::numeric))
                    ELSE (0)::numeric
                END), (0)::numeric) AS charges,
            COALESCE(sum(transactions.amount), (0)::numeric) AS paid
           FROM public.transactions
          WHERE ((transactions.type = 'income'::text) AND (transactions.patient_id IS NOT NULL))
          GROUP BY transactions.patient_id
        ), inv AS (
         SELECT invoices.patient_id,
            COALESCE(sum(
                CASE
                    WHEN (invoices.status = 'active'::text) THEN invoices.total
                    ELSE (0)::numeric
                END), (0)::numeric) AS total,
            COALESCE(sum(
                CASE
                    WHEN (invoices.status = 'active'::text) THEN invoices.paid_amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS paid,
            COALESCE(sum(invoices.balance), (0)::numeric) AS balance
           FROM public.invoices
          GROUP BY invoices.patient_id
        )
 SELECT pt.id AS patient_id,
    (COALESCE(plan.charges, (0)::numeric) + COALESCE(tx.charges, (0)::numeric)) AS old_charges,
    ((COALESCE(plan.advance, (0)::numeric) + COALESCE(inst.paid, (0)::numeric)) + COALESCE(tx.paid, (0)::numeric)) AS old_paid,
    GREATEST((0)::numeric, ((((COALESCE(plan.charges, (0)::numeric) + COALESCE(tx.charges, (0)::numeric)) - COALESCE(plan.advance, (0)::numeric)) - COALESCE(inst.paid, (0)::numeric)) - COALESCE(tx.paid, (0)::numeric))) AS old_balance,
    COALESCE(inv.total, (0)::numeric) AS new_total,
    COALESCE(inv.paid, (0)::numeric) AS new_paid,
    COALESCE(inv.balance, (0)::numeric) AS new_balance,
    ((COALESCE(plan.charges, (0)::numeric) + COALESCE(tx.charges, (0)::numeric)) + COALESCE(inv.total, (0)::numeric)) AS total_charges,
    (((COALESCE(plan.advance, (0)::numeric) + COALESCE(inst.paid, (0)::numeric)) + COALESCE(tx.paid, (0)::numeric)) + COALESCE(inv.paid, (0)::numeric)) AS total_paid,
    (GREATEST((0)::numeric, ((((COALESCE(plan.charges, (0)::numeric) + COALESCE(tx.charges, (0)::numeric)) - COALESCE(plan.advance, (0)::numeric)) - COALESCE(inst.paid, (0)::numeric)) - COALESCE(tx.paid, (0)::numeric))) + COALESCE(inv.balance, (0)::numeric)) AS balance,
    GREATEST((0)::numeric, ((COALESCE(plan.all_charges, (0)::numeric) + COALESCE(legacy.charges, (0)::numeric)) - COALESCE(legacy.paid, (0)::numeric))) AS legacy_balance
   FROM (((((public.patients pt
     LEFT JOIN plan ON ((plan.patient_id = pt.id)))
     LEFT JOIN inst ON ((inst.patient_id = pt.id)))
     LEFT JOIN tx ON ((tx.patient_id = pt.id)))
     LEFT JOIN legacy ON ((legacy.patient_id = pt.id)))
     LEFT JOIN inv ON ((inv.patient_id = pt.id)))
  WHERE (pt.deleted_at IS NULL);


--
-- Name: patient_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    demographics jsonb DEFAULT '{}'::jsonb,
    medical_history jsonb DEFAULT '{}'::jsonb,
    dental_history jsonb DEFAULT '{}'::jsonb,
    chief_complaint jsonb DEFAULT '{}'::jsonb,
    clinical_exam jsonb DEFAULT '{}'::jsonb,
    radiographs jsonb DEFAULT '{}'::jsonb,
    diagnosis_plan jsonb DEFAULT '{}'::jsonb,
    consent jsonb DEFAULT '{}'::jsonb,
    completed_step integer DEFAULT 0,
    is_finalized boolean DEFAULT false,
    finalized_at timestamp with time zone,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: patient_ledger; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.patient_ledger WITH (security_invoker='true') AS
 SELECT p.patient_id,
    p.start_date AS entry_date,
    p.created_at AS sort_at,
    'old'::text AS source,
    'plan'::text AS kind,
    p.title AS label,
        CASE
            WHEN (p.status <> 'cancelled'::text) THEN p.total_cost
            ELSE (0)::numeric
        END AS charge,
    (0)::numeric AS payment,
    p.id AS ref_id
   FROM public.treatment_plans p
UNION ALL
 SELECT p.patient_id,
    p.start_date AS entry_date,
    p.created_at AS sort_at,
    'old'::text AS source,
    'plan_advance'::text AS kind,
    ('Advance: '::text || p.title) AS label,
    0 AS charge,
    p.advance_paid AS payment,
    p.id AS ref_id
   FROM public.treatment_plans p
  WHERE (COALESCE(p.advance_paid, (0)::numeric) > (0)::numeric)
UNION ALL
 SELECT p.patient_id,
    COALESCE(i.paid_date, p.start_date) AS entry_date,
    COALESCE(i.created_at, p.created_at) AS sort_at,
    'old'::text AS source,
    'installment'::text AS kind,
    ((p.title || ' - installment #'::text) || i.installment_no) AS label,
    0 AS charge,
    i.paid_amount AS payment,
    i.id AS ref_id
   FROM (public.installments i
     JOIN public.treatment_plans p ON ((p.id = i.plan_id)))
  WHERE (i.paid_amount > (0)::numeric)
UNION ALL
 SELECT t.patient_id,
    t.transaction_date AS entry_date,
    t.created_at AS sort_at,
    'old'::text AS source,
        CASE
            WHEN (t.rate IS NOT NULL) THEN 'bill'::text
            ELSE 'payment'::text
        END AS kind,
    COALESCE(t.treatment_name, t.description, t.category, 'Entry'::text) AS label,
        CASE
            WHEN (t.rate IS NOT NULL) THEN (t.rate - COALESCE(t.discount_amount, (0)::numeric))
            ELSE (0)::numeric
        END AS charge,
    t.amount AS payment,
    t.id AS ref_id
   FROM public.transactions t
  WHERE ((t.type = 'income'::text) AND (t.patient_id IS NOT NULL) AND (t.invoice_id IS NULL) AND (NOT ((t.treatment_name ~* '\((month|advance) ?[0-9]*\)\s*$'::text) OR (t.category = 'treatment-installment'::text))))
UNION ALL
 SELECT i.patient_id,
    i.invoice_date AS entry_date,
    i.created_at AS sort_at,
    'new'::text AS source,
        CASE
            WHEN (i.status = 'void'::text) THEN 'invoice_void'::text
            ELSE 'invoice'::text
        END AS kind,
    (i.invoice_number ||
        CASE
            WHEN (i.status = 'void'::text) THEN ' (cancel)'::text
            ELSE ''::text
        END) AS label,
        CASE
            WHEN (i.status = 'void'::text) THEN (0)::numeric
            ELSE i.total
        END AS charge,
    0 AS payment,
    i.id AS ref_id
   FROM public.invoices i
UNION ALL
 SELECT pay.patient_id,
    pay.paid_on AS entry_date,
    pay.created_at AS sort_at,
    'new'::text AS source,
        CASE
            WHEN (pay.kind = 'payment'::text) THEN 'invoice_payment'::text
            ELSE 'refund'::text
        END AS kind,
    (
        CASE
            WHEN (pay.kind = 'payment'::text) THEN 'Payment '::text
            ELSE 'Refund '::text
        END || i.invoice_number) AS label,
    0 AS charge,
        CASE
            WHEN (pay.kind = 'payment'::text) THEN pay.amount
            ELSE (- pay.amount)
        END AS payment,
    pay.id AS ref_id
   FROM (public.payments pay
     JOIN public.invoices i ON ((i.id = pay.invoice_id)))
  WHERE (i.status = 'active'::text);


--
-- Name: patient_mr_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patient_mr_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patient_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    storage_path text NOT NULL,
    caption text,
    taken_on date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    category text DEFAULT 'photo'::text NOT NULL,
    treatment_id uuid,
    lab_case_id uuid,
    visit_id uuid,
    clinical_visit_id uuid,
    CONSTRAINT patient_photos_category_check CHECK ((category = ANY (ARRAY['photo'::text, 'xray'::text, 'document'::text, 'lab'::text, 'consent'::text, 'report'::text, 'before'::text, 'after'::text, 'progress'::text])))
);


--
-- Name: patient_treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    catalog_id uuid,
    name text NOT NULL,
    teeth text[] DEFAULT '{}'::text[] NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    list_price numeric(12,2) DEFAULT 0 NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    doctor text,
    started_on date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date NOT NULL,
    completed_on date,
    notes text,
    cancelled_at timestamp with time zone,
    cancel_reason text,
    idempotency_key text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_treatments_name_check CHECK ((length(btrim(name)) > 0)),
    CONSTRAINT patient_treatments_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT patient_treatments_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'active'::text, 'completed'::text, 'cancelled'::text])))
);


