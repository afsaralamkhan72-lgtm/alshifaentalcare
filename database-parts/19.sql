SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: stock_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_counts (
    id bigint NOT NULL,
    count_batch text NOT NULL,
    counted_on date NOT NULL,
    inventory_id uuid NOT NULL,
    expected numeric(12,2) NOT NULL,
    actual numeric(12,2) NOT NULL,
    diff numeric(12,2) GENERATED ALWAYS AS ((actual - expected)) STORED,
    note text,
    counted_by uuid,
    counted_by_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_counts_actual_check CHECK ((actual >= (0)::numeric))
);


--
-- Name: stock_counts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.stock_counts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.stock_counts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_name text NOT NULL,
    review_text text NOT NULL,
    rating integer,
    is_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT testimonials_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: treating_doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treating_doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: treatment_balances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.treatment_balances WITH (security_invoker='true') AS
 SELECT t.id AS treatment_id,
    t.patient_id,
    (COALESCE(sum(i.total) FILTER (WHERE (i.status = 'active'::text)), (0)::numeric))::numeric(12,2) AS charged,
    (COALESCE(sum(i.paid_amount) FILTER (WHERE (i.status = 'active'::text)), (0)::numeric))::numeric(12,2) AS paid,
    (COALESCE(sum((i.total - i.paid_amount)) FILTER (WHERE (i.status = 'active'::text)), (0)::numeric))::numeric(12,2) AS balance
   FROM (public.patient_treatments t
     LEFT JOIN public.invoices i ON ((i.patient_treatment_id = t.id)))
  GROUP BY t.id, t.patient_id;


--
-- Name: treatment_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    department text,
    price numeric(12,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text,
    description text,
    applies_to text,
    price_note text,
    CONSTRAINT treatment_catalog_applies_to_check CHECK (((applies_to IS NULL) OR (applies_to = ANY (ARRAY['tooth'::text, 'mouth'::text, 'jaw'::text, 'once'::text])))),
    CONSTRAINT treatment_catalog_department_check CHECK ((department = ANY (ARRAY['dental'::text, 'homeopathic'::text, 'general'::text]))),
    CONSTRAINT treatment_catalog_name_check CHECK ((length(btrim(name)) > 0)),
    CONSTRAINT treatment_catalog_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: treatment_episodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_episodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    title text NOT NULL,
    tooth_numbers text[] DEFAULT '{}'::text[],
    doctor_name text,
    started_on date,
    completed_on date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date,
    visit_count integer DEFAULT 0,
    total_charged numeric(12,2) DEFAULT 0,
    total_paid numeric(12,2) DEFAULT 0,
    balance_left numeric(12,2) DEFAULT 0,
    summary text,
    photos_cleared_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: treatment_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_materials (
    treatment_id uuid NOT NULL,
    inventory_id uuid NOT NULL,
    default_qty numeric(10,2) DEFAULT 1 NOT NULL,
    CONSTRAINT treatment_materials_default_qty_check CHECK ((default_qty > (0)::numeric))
);


--
-- Name: visit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visit_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    plan_id uuid,
    visit_date date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date,
    procedure text,
    notes text,
    next_visit date,
    doctor_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    voided_at timestamp with time zone,
    voided_by uuid,
    void_reason text,
    treatment_id uuid,
    visit_no integer,
    idempotency_key text,
    clinical_visit_id uuid
);


--
-- Name: treatment_overview; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.treatment_overview WITH (security_invoker='true') AS
 SELECT t.id,
    t.patient_id,
    p.full_name,
    p.mr_number,
    p.phone,
    p.department,
    t.name,
    t.teeth,
    t.status,
    t.doctor,
    t.started_on,
    b.charged,
    b.paid,
    b.balance,
    lv.visit_no AS last_visit_no,
    lv.visit_date AS last_visit_date,
    na.preferred_date AS next_date,
    na.preferred_time AS next_time
   FROM ((((public.patient_treatments t
     JOIN public.patients p ON (((p.id = t.patient_id) AND (p.deleted_at IS NULL))))
     LEFT JOIN public.treatment_balances b ON ((b.treatment_id = t.id)))
     LEFT JOIN LATERAL ( SELECT v.visit_no,
            v.visit_date
           FROM public.visit_notes v
          WHERE ((v.treatment_id = t.id) AND (v.voided_at IS NULL))
          ORDER BY v.visit_no DESC
         LIMIT 1) lv ON (true))
     LEFT JOIN LATERAL ( SELECT a.preferred_date,
            a.preferred_time
           FROM public.appointments a
          WHERE ((a.treatment_id = t.id) AND (a.deleted_at IS NULL) AND (a.status = ANY (ARRAY['pending'::text, 'confirmed'::text])) AND (a.preferred_date >= public._karachi_today()))
          ORDER BY a.preferred_date
         LIMIT 1) na ON (true));


--
-- Name: treatment_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_price_history (
    id bigint NOT NULL,
    treatment_id uuid NOT NULL,
    old_price numeric(12,2),
    new_price numeric(12,2) NOT NULL,
    changed_by uuid,
    changed_by_name text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: treatment_price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.treatment_price_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.treatment_price_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: treatment_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatment_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    treatment_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    done_on date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT treatment_stages_label_check CHECK (((length(btrim(label)) >= 1) AND (length(btrim(label)) <= 80)))
);


--
-- Name: videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    youtube_url text NOT NULL,
    category text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: appointment_history appointment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: attendance_requests attendance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_requests
    ADD CONSTRAINT attendance_requests_pkey PRIMARY KEY (id);


--
-- Name: attendance_rules attendance_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_rules
    ADD CONSTRAINT attendance_rules_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: clinic_days clinic_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_days
    ADD CONSTRAINT clinic_days_pkey PRIMARY KEY (day);


--
-- Name: clinic_options clinic_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_options
    ADD CONSTRAINT clinic_options_pkey PRIMARY KEY (id);


--
-- Name: clinic_photos clinic_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinic_photos
    ADD CONSTRAINT clinic_photos_pkey PRIMARY KEY (id);


--
-- Name: clinical_visits clinical_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_visits
    ADD CONSTRAINT clinical_visits_pkey PRIMARY KEY (id);


--
-- Name: day_closings day_closings_close_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_closings
    ADD CONSTRAINT day_closings_close_date_key UNIQUE (close_date);


--
-- Name: day_closings day_closings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_closings
    ADD CONSTRAINT day_closings_pkey PRIMARY KEY (id);


--
-- Name: dental_chart dental_chart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_token_key UNIQUE (token);


