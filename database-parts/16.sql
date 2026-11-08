SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: installments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    installment_no integer NOT NULL,
    due_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    paid_amount numeric(12,2) DEFAULT 0,
    paid_date date,
    payment_method text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT installments_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT installments_paid_amount_check CHECK ((paid_amount >= (0)::numeric)),
    CONSTRAINT installments_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'bank'::text, 'easypaisa'::text, 'jazzcash'::text])))
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_name text NOT NULL,
    category text NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    unit text DEFAULT 'pcs'::text,
    reorder_level numeric(10,2) DEFAULT 5,
    expiry_date date,
    supplier text,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    item_group text,
    description text,
    deleted_at timestamp with time zone,
    merged_into uuid,
    CONSTRAINT inventory_category_check CHECK ((category = ANY (ARRAY['dental'::text, 'homeopathic'::text, 'general'::text])))
);


--
-- Name: inventory_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_meta (
    inventory_id uuid NOT NULL,
    company text,
    pack_name text,
    units_per_pack numeric(10,2),
    is_qualitative boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_meta_units_per_pack_check CHECK (((units_per_pack IS NULL) OR (units_per_pack > (0)::numeric)))
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    inventory_id uuid NOT NULL,
    kind text NOT NULL,
    qty_change numeric(12,2) NOT NULL,
    qty_after numeric(12,2) NOT NULL,
    total_cost numeric(12,2),
    patient_id uuid,
    invoice_id uuid,
    treatment_id uuid,
    expense_tx_id uuid,
    batch_key text,
    note text,
    created_by uuid,
    created_by_name text,
    CONSTRAINT inventory_movements_kind_check CHECK ((kind = ANY (ARRAY['opening'::text, 'purchase'::text, 'usage'::text, 'count_correction'::text, 'merge_in'::text, 'merge_out'::text, 'return_supplier'::text, 'damaged'::text])))
);


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inventory_movements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inventory_purchase_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_purchase_meta (
    movement_id bigint NOT NULL,
    supplier text,
    company text,
    bill_no text,
    bill_path text,
    packs numeric(12,2),
    units_per_pack numeric(10,2),
    expiry_date date,
    unit_cost numeric(14,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoice_counter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_counter (
    id integer NOT NULL,
    prefix text DEFAULT 'AS-INV-'::text NOT NULL,
    next_no integer DEFAULT 1001 NOT NULL,
    CONSTRAINT invoice_counter_id_check CHECK ((id = 1)),
    CONSTRAINT invoice_counter_next_no_check CHECK ((next_no > 0))
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    treatment_id uuid,
    name text NOT NULL,
    tooth text,
    qty integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    CONSTRAINT invoice_items_line_total_check CHECK ((line_total >= (0)::numeric)),
    CONSTRAINT invoice_items_qty_check CHECK ((qty > 0)),
    CONSTRAINT invoice_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: lab_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_number text,
    patient_id uuid,
    lab_id uuid,
    lab_name text NOT NULL,
    lab_whatsapp text,
    work_type text,
    tooth_numbers text[] DEFAULT '{}'::text[],
    shade text,
    material text,
    pontic_design text,
    instructions text,
    impression_date date DEFAULT ((now() AT TIME ZONE 'Asia/Karachi'::text))::date,
    due_date date,
    delivered_date date,
    status text DEFAULT 'pending'::text,
    cost numeric(12,2) DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    lab_paid numeric(12,2) DEFAULT 0 NOT NULL,
    received_at timestamp with time zone,
    treatment_id uuid,
    visit_id uuid,
    clinical_visit_id uuid,
    patient_notified_at timestamp with time zone,
    CONSTRAINT lab_cases_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'in_progress'::text, 'received'::text, 'fitted'::text, 'remake'::text])))
);


--
-- Name: labs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    whatsapp text,
    phone text,
    address text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    paid boolean DEFAULT true NOT NULL,
    yearly_quota integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leave_types_name_check CHECK ((length(btrim(name)) > 0)),
    CONSTRAINT leave_types_yearly_quota_check CHECK (((yearly_quota IS NULL) OR (yearly_quota >= 0)))
);


--
-- Name: loyalty_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_devices (
    token_hash text NOT NULL,
    patient_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_program; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_program (
    id integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    reset_after integer,
    allow_manual boolean DEFAULT true NOT NULL,
    google_review_url text,
    facebook_url text,
    instagram_url text,
    tiktok_url text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT loyalty_program_id_check CHECK ((id = 1)),
    CONSTRAINT loyalty_program_reset_after_check CHECK (((reset_after IS NULL) OR ((reset_after >= 2) AND (reset_after <= 50))))
);


--
-- Name: loyalty_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stamps_required integer NOT NULL,
    title text NOT NULL,
    kind text NOT NULL,
    value numeric(12,2),
    treatment_names text[] DEFAULT '{}'::text[] NOT NULL,
    valid_days integer,
    max_per_patient integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loyalty_rewards_check CHECK (((kind <> 'percent'::text) OR ((value IS NOT NULL) AND (value > (0)::numeric) AND (value <= (100)::numeric)))),
    CONSTRAINT loyalty_rewards_check1 CHECK (((kind <> 'amount'::text) OR ((value IS NOT NULL) AND (value > (0)::numeric)))),
    CONSTRAINT loyalty_rewards_kind_check CHECK ((kind = ANY (ARRAY['percent'::text, 'amount'::text, 'free'::text]))),
    CONSTRAINT loyalty_rewards_max_per_patient_check CHECK (((max_per_patient IS NULL) OR (max_per_patient > 0))),
    CONSTRAINT loyalty_rewards_stamps_required_check CHECK (((stamps_required >= 1) AND (stamps_required <= 50))),
    CONSTRAINT loyalty_rewards_title_check CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 120))),
    CONSTRAINT loyalty_rewards_valid_days_check CHECK (((valid_days IS NULL) OR (valid_days > 0)))
);


--
-- Name: loyalty_scan_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_scan_log (
    id bigint NOT NULL,
    key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_scan_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_scan_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.loyalty_scan_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: loyalty_signups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_signups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    phone_digits text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    patient_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    handled_by uuid,
    handled_at timestamp with time zone,
    CONSTRAINT loyalty_signups_full_name_check CHECK (((length(btrim(full_name)) >= 2) AND (length(btrim(full_name)) <= 120))),
    CONSTRAINT loyalty_signups_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'linked'::text, 'dismissed'::text])))
);


--
-- Name: loyalty_stamps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_stamps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    stamp_date date NOT NULL,
    cycle integer DEFAULT 1 NOT NULL,
    "position" integer NOT NULL,
    source text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    voided_at timestamp with time zone,
    voided_by uuid,
    void_reason text,
    CONSTRAINT loyalty_stamps_source_check CHECK ((source = ANY (ARRAY['qr'::text, 'manual'::text])))
);


--
-- Name: loyalty_unlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_unlocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    reward_id uuid NOT NULL,
    cycle integer NOT NULL,
    title text NOT NULL,
    kind text NOT NULL,
    value numeric(12,2),
    treatment_names text[] DEFAULT '{}'::text[] NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    redeemed_at timestamp with time zone,
    redeemed_by uuid,
    redeem_note text
);


--
-- Name: medicines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medicines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    generic_name text,
    brand_name text,
    med_type text,
    strength text,
    dosage_form text,
    potency text,
    pack text,
    default_dose text,
    default_frequency text,
    default_duration text,
    instructions text,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    available boolean DEFAULT false NOT NULL,
    stock_qty numeric(12,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT medicines_category_check CHECK ((category = ANY (ARRAY['dental'::text, 'homeopathic'::text]))),
    CONSTRAINT medicines_name_check CHECK ((length(btrim(name)) > 0)),
    CONSTRAINT medicines_price_check CHECK ((price >= (0)::numeric))
);


