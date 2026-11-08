SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: payment_plan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_plan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    no integer NOT NULL,
    due_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    CONSTRAINT payment_plan_items_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: payment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    patient_treatment_id uuid NOT NULL,
    planned_amount numeric(12,2) NOT NULL,
    base_paid numeric(12,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    CONSTRAINT payment_plans_planned_amount_check CHECK ((planned_amount > (0)::numeric)),
    CONSTRAINT payment_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text])))
);


--
-- Name: payroll_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_periods (
    staff_id uuid NOT NULL,
    period text NOT NULL,
    finalized_at timestamp with time zone DEFAULT now() NOT NULL,
    finalized_by uuid,
    snapshot jsonb NOT NULL,
    CONSTRAINT payroll_periods_period_check CHECK ((period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text))
);


--
-- Name: permission_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_catalog (
    code text NOT NULL,
    label text NOT NULL,
    grp text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    department text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes_en text,
    notes_ur text,
    prescribed_by uuid,
    prescribed_date date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date,
    created_at timestamp with time zone DEFAULT now(),
    visit_id uuid,
    treatment_id uuid,
    clinical_visit_id uuid,
    invoice_id uuid,
    verify_code text DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text),
    CONSTRAINT prescriptions_department_check CHECK ((department = ANY (ARRAY['dental'::text, 'homeopathic'::text])))
);


--
-- Name: push_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_keys (
    id integer DEFAULT 1 NOT NULL,
    secret text DEFAULT replace(((gen_random_uuid())::text || (gen_random_uuid())::text), '-'::text, ''::text) NOT NULL,
    site_url text DEFAULT 'https://alshifahomeoanddentalcare.com'::text NOT NULL,
    vapid_public text,
    vapid_private text,
    CONSTRAINT push_keys_id_check CHECK ((id = 1))
);


--
-- Name: push_subs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subs (
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    staff_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recalls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recalls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    recall_type text NOT NULL,
    interval_months integer DEFAULT 6 NOT NULL,
    last_done date,
    next_due date NOT NULL,
    status text DEFAULT 'active'::text,
    notes text,
    reminders_sent integer DEFAULT 0,
    last_reminded date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recalls_interval_months_check CHECK ((interval_months > 0)),
    CONSTRAINT recalls_status_check CHECK ((status = ANY (ARRAY['active'::text, 'stopped'::text])))
);


--
-- Name: scratch_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scratch_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    card_date date NOT NULL,
    prize_id uuid,
    title text NOT NULL,
    kind text NOT NULL,
    value numeric(12,2),
    treatment_names text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    redeemed_at timestamp with time zone,
    redeemed_by uuid,
    redeem_note text
);


--
-- Name: scratch_prizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scratch_prizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    kind text NOT NULL,
    value numeric(12,2),
    treatment_names text[] DEFAULT '{}'::text[] NOT NULL,
    weight integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scratch_prizes_kind_check CHECK ((kind = ANY (ARRAY['percent'::text, 'amount'::text, 'free'::text, 'none'::text]))),
    CONSTRAINT scratch_prizes_title_check CHECK (((length(btrim(title)) >= 2) AND (length(btrim(title)) <= 80))),
    CONSTRAINT scratch_prizes_value_check CHECK (((value IS NULL) OR (value >= (0)::numeric))),
    CONSTRAINT scratch_prizes_weight_check CHECK (((weight >= 1) AND (weight <= 10000)))
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department text NOT NULL,
    title text NOT NULL,
    short_description text,
    image_url text,
    whatsapp_message_template text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT services_department_check CHECK ((department = ANY (ARRAY['dental'::text, 'homeopathic'::text])))
);


--
-- Name: share_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.share_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    patient_id uuid NOT NULL,
    prescription_id uuid,
    expires_at timestamp with time zone NOT NULL,
    fail_count integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    revoked_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    att_date date NOT NULL,
    status text NOT NULL,
    check_in time without time zone,
    check_out time without time zone,
    note text,
    marked_by uuid,
    marked_at timestamp with time zone DEFAULT now() NOT NULL,
    source text,
    in_lat numeric(9,6),
    in_lng numeric(9,6),
    in_dist integer,
    late_reason text,
    leave_type_id uuid,
    CONSTRAINT staff_attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'leave'::text, 'half'::text])))
);


--
-- Name: staff_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    entry_date date NOT NULL,
    kind text NOT NULL,
    amount numeric(12,2) NOT NULL,
    period text,
    method text,
    note text,
    expense_tx_id uuid,
    acknowledged_at timestamp with time zone,
    created_by uuid,
    created_by_name text,
    idempotency_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT staff_ledger_check CHECK ((((kind = ANY (ARRAY['salary_due'::text, 'bonus'::text])) AND (amount > (0)::numeric)) OR ((kind = ANY (ARRAY['deduction'::text, 'advance'::text, 'payout'::text])) AND (amount < (0)::numeric)))),
    CONSTRAINT staff_ledger_kind_check CHECK ((kind = ANY (ARRAY['salary_due'::text, 'bonus'::text, 'deduction'::text, 'advance'::text, 'payout'::text]))),
    CONSTRAINT staff_ledger_method_check CHECK ((method = ANY (ARRAY['cash'::text, 'bank'::text, 'easypaisa'::text, 'jazzcash'::text]))),
    CONSTRAINT staff_ledger_period_check CHECK ((period ~ '^[0-9]{4}-[0-9]{2}$'::text))
);


--
-- Name: staff_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    title text,
    phone text,
    profile_id uuid,
    monthly_salary numeric(12,2) DEFAULT 0 NOT NULL,
    joined_on date,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    shift_start time without time zone,
    shift_end time without time zone,
    weekly_off integer[],
    attendance_on boolean DEFAULT true NOT NULL,
    CONSTRAINT staff_members_full_name_check CHECK ((length(btrim(full_name)) > 0)),
    CONSTRAINT staff_members_monthly_salary_check CHECK ((monthly_salary >= (0)::numeric))
);


--
-- Name: staff_balances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.staff_balances WITH (security_invoker='true') AS
 SELECT s.id AS staff_id,
    COALESCE(sum(l.amount), (0)::numeric) AS balance,
    COALESCE(sum(l.amount) FILTER (WHERE (l.kind = 'salary_due'::text)), (0)::numeric) AS total_salary_due,
    COALESCE(sum(l.amount) FILTER (WHERE (l.kind = 'bonus'::text)), (0)::numeric) AS total_bonus,
    COALESCE((- sum(l.amount) FILTER (WHERE (l.kind = 'advance'::text))), (0)::numeric) AS total_advance,
    COALESCE((- sum(l.amount) FILTER (WHERE (l.kind = 'deduction'::text))), (0)::numeric) AS total_deduction,
    COALESCE((- sum(l.amount) FILTER (WHERE (l.kind = 'payout'::text))), (0)::numeric) AS total_payout,
    count(*) FILTER (WHERE ((l.kind = ANY (ARRAY['advance'::text, 'payout'::text])) AND (l.acknowledged_at IS NULL))) AS unconfirmed
   FROM (public.staff_members s
     LEFT JOIN public.staff_ledger l ON ((l.staff_id = s.id)))
  GROUP BY s.id;


--
-- Name: staff_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_permissions (
    user_id uuid NOT NULL,
    perm_code text NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_portal_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_portal_access (
    staff_id uuid NOT NULL,
    token_hash text NOT NULL,
    pin_hash text NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    issued_by uuid
);


--
-- Name: staff_portal_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_portal_log (
    id bigint NOT NULL,
    staff_id uuid,
    event text NOT NULL,
    ip text,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_portal_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.staff_portal_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.staff_portal_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: staff_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT staff_profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'doctor'::text, 'receptionist'::text])))
);


