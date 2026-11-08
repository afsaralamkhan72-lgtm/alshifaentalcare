SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_name text NOT NULL,
    phone text NOT NULL,
    department text,
    treatment_name text,
    preferred_date date,
    preferred_time text,
    status text DEFAULT 'pending'::text,
    source text DEFAULT 'website'::text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    patient_id uuid,
    treatment_id uuid,
    notes text,
    visit_id uuid,
    doctor text,
    clinical_visit_id uuid,
    arrived_at timestamp with time zone,
    CONSTRAINT appointments_department_check CHECK ((department = ANY (ARRAY['dental'::text, 'homeopathic'::text]))),
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'arrived'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: attendance_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    att_date date NOT NULL,
    kind text NOT NULL,
    req_time time without time zone NOT NULL,
    reason text NOT NULL,
    lat numeric(9,6),
    lng numeric(9,6),
    status text DEFAULT 'pending'::text NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    decision_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_requests_kind_check CHECK ((kind = ANY (ARRAY['in'::text, 'out'::text]))),
    CONSTRAINT attendance_requests_reason_check CHECK ((length(btrim(reason)) >= 3)),
    CONSTRAINT attendance_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: attendance_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_rules (
    id integer DEFAULT 1 NOT NULL,
    work_start time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    grace_minutes integer DEFAULT 15 NOT NULL,
    late_cut numeric(10,2) DEFAULT 0 NOT NULL,
    absent_cut boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shift_end time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
    weekly_off integer[] DEFAULT '{0}'::integer[] NOT NULL,
    late_from text DEFAULT 'shift_start'::text NOT NULL,
    cut_late boolean DEFAULT true NOT NULL,
    early_cut boolean DEFAULT true NOT NULL,
    overtime_on boolean DEFAULT true NOT NULL,
    overtime_mult numeric(4,2) DEFAULT 1 NOT NULL,
    overtime_min integer DEFAULT 0 NOT NULL,
    pay_day integer,
    remind_days integer DEFAULT 2 NOT NULL,
    clinic_lat numeric(9,6),
    clinic_lng numeric(9,6),
    radius_m integer DEFAULT 150 NOT NULL,
    require_location boolean DEFAULT false NOT NULL,
    device_hash text,
    CONSTRAINT ar_late_from_chk CHECK ((late_from = ANY (ARRAY['shift_start'::text, 'after_grace'::text]))),
    CONSTRAINT ar_ot_chk CHECK ((((overtime_mult >= (0)::numeric) AND (overtime_mult <= (10)::numeric)) AND ((overtime_min >= 0) AND (overtime_min <= 240)))),
    CONSTRAINT ar_pay_day_chk CHECK (((pay_day IS NULL) OR ((pay_day >= 1) AND (pay_day <= 28)))),
    CONSTRAINT ar_radius_chk CHECK (((radius_m >= 20) AND (radius_m <= 5000))),
    CONSTRAINT attendance_rules_grace_minutes_check CHECK (((grace_minutes >= 0) AND (grace_minutes <= 240))),
    CONSTRAINT attendance_rules_id_check CHECK ((id = 1)),
    CONSTRAINT attendance_rules_late_cut_check CHECK ((late_cut >= (0)::numeric))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_id uuid,
    actor_name text,
    actor_role text,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id text,
    patient_id uuid,
    changed_fields text[],
    old_data jsonb,
    new_data jsonb,
    CONSTRAINT audit_log_action_check CHECK ((action ~ '^[A-Z][A-Z_]{2,39}$'::text))
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text NOT NULL,
    cover_image_url text,
    is_published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: clinic_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_days (
    day date NOT NULL,
    closed boolean NOT NULL,
    reason text,
    set_by uuid,
    set_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clinic_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clinic_options_kind_check CHECK ((kind = ANY (ARRAY['complaint'::text, 'homeo_complaint'::text, 'diagnosis'::text]))),
    CONSTRAINT clinic_options_label_check CHECK (((length(btrim(label)) >= 1) AND (length(btrim(label)) <= 80)))
);


--
-- Name: clinic_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinic_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_url text NOT NULL,
    caption text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: clinical_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinical_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    visit_date date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    complaint jsonb DEFAULT '{}'::jsonb NOT NULL,
    findings jsonb DEFAULT '{}'::jsonb NOT NULL,
    diagnoses jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    doctor text,
    next_date date,
    next_time text,
    next_treatment_id uuid,
    invoice_id uuid,
    appointment_id uuid,
    finish_key text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    finished_by uuid,
    draft_extra jsonb,
    CONSTRAINT clinical_visits_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'finished'::text])))
);


--
-- Name: day_closings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.day_closings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    close_date date NOT NULL,
    opening_cash numeric(12,2) DEFAULT 0 NOT NULL,
    cash_in numeric(12,2) DEFAULT 0 NOT NULL,
    cash_out numeric(12,2) DEFAULT 0 NOT NULL,
    expected_cash numeric(12,2) NOT NULL,
    counted_cash numeric(12,2) NOT NULL,
    difference numeric(12,2) GENERATED ALWAYS AS ((counted_cash - expected_cash)) STORED,
    other_in numeric(12,2) DEFAULT 0 NOT NULL,
    other_out numeric(12,2) DEFAULT 0 NOT NULL,
    note text,
    closed_by uuid,
    closed_by_name text,
    closed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT day_closings_counted_cash_check CHECK ((counted_cash >= (0)::numeric))
);


--
-- Name: dental_chart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dental_chart (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tooth_number text NOT NULL,
    condition text NOT NULL,
    notes text,
    treatment_date date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    treatment_id uuid,
    clinical_visit_id uuid,
    surfaces text[] DEFAULT '{}'::text[] NOT NULL,
    state text DEFAULT 'existing'::text NOT NULL,
    CONSTRAINT dental_chart_condition_check CHECK ((condition = ANY ('{healthy,missing,caries,filling,rct,crown,bridge,implant,scaling,extraction,fracture,mobility,pocket,bleeding,sinus,periapical,denture,implant_planning,recession,furcation,plaque,calculus,other,pulpotomy,pulpectomy,ssc,space_maintainer,exfoliation}'::text[]))),
    CONSTRAINT dental_chart_state_check CHECK ((state = ANY (ARRAY['existing'::text, 'planned'::text, 'completed'::text]))),
    CONSTRAINT dental_chart_surfaces_check CHECK ((surfaces <@ ARRAY['M'::text, 'O'::text, 'D'::text, 'B'::text, 'L'::text, 'I'::text]))
);


--
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    kind text NOT NULL,
    patient_id uuid,
    staff_id uuid,
    platform text DEFAULT 'android'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT device_tokens_check CHECK ((((kind = 'patient'::text) AND (patient_id IS NOT NULL)) OR ((kind = 'staff'::text) AND (staff_id IS NOT NULL)))),
    CONSTRAINT device_tokens_kind_check CHECK ((kind = ANY (ARRAY['patient'::text, 'staff'::text]))),
    CONSTRAINT device_tokens_token_check CHECK (((length(token) >= 50) AND (length(token) <= 4096)))
);


--
-- Name: discount_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_limits (
    role text NOT NULL,
    max_percent numeric(5,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discount_limits_max_percent_check CHECK (((max_percent >= (0)::numeric) AND (max_percent <= (100)::numeric))),
    CONSTRAINT discount_limits_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'doctor'::text, 'receptionist'::text])))
);


--
-- Name: discount_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text NOT NULL,
    patient_id uuid,
    patient_treatment_id uuid,
    invoice_id uuid,
    base_amount numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) NOT NULL,
    percent numeric(6,2) NOT NULL,
    given_by uuid,
    given_by_name text,
    given_by_role text,
    note text,
    CONSTRAINT discount_log_kind_check CHECK ((kind = ANY (ARRAY['treatment'::text, 'bill'::text])))
);


--
-- Name: doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    qualification text,
    bio text,
    image_url text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    show_on_home boolean DEFAULT true
);


--
-- Name: expense_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    monthly_amount numeric(12,2) NOT NULL,
    note text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expense_budgets_category_check CHECK ((length(btrim(category)) > 0)),
    CONSTRAINT expense_budgets_monthly_amount_check CHECK ((monthly_amount > (0)::numeric))
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expense_categories_name_check CHECK ((length(btrim(name)) > 0))
);


--
-- Name: expense_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_receipts (
    tx_id uuid NOT NULL,
    path text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gallery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gallery (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    category text,
    before_image_url text,
    after_image_url text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gallery_category_check CHECK ((category = ANY (ARRAY['dental'::text, 'homeopathic'::text])))
);


