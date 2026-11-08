SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: TABLE attendance_requests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.attendance_requests TO authenticated;
GRANT ALL ON TABLE public.attendance_requests TO service_role;


--
-- Name: TABLE attendance_rules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.attendance_rules TO anon;
GRANT ALL ON TABLE public.attendance_rules TO authenticated;
GRANT ALL ON TABLE public.attendance_rules TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO anon;
GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- Name: SEQUENCE audit_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO anon;


--
-- Name: TABLE blog_posts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.blog_posts TO anon;
GRANT ALL ON TABLE public.blog_posts TO authenticated;
GRANT ALL ON TABLE public.blog_posts TO service_role;


--
-- Name: TABLE clinic_days; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.clinic_days TO authenticated;
GRANT ALL ON TABLE public.clinic_days TO service_role;


--
-- Name: TABLE clinic_options; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clinic_options TO authenticated;
GRANT ALL ON TABLE public.clinic_options TO anon;
GRANT ALL ON TABLE public.clinic_options TO service_role;


--
-- Name: TABLE clinic_photos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clinic_photos TO anon;
GRANT ALL ON TABLE public.clinic_photos TO authenticated;
GRANT ALL ON TABLE public.clinic_photos TO service_role;


--
-- Name: TABLE clinical_visits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clinical_visits TO anon;
GRANT ALL ON TABLE public.clinical_visits TO authenticated;
GRANT ALL ON TABLE public.clinical_visits TO service_role;


--
-- Name: TABLE day_closings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.day_closings TO authenticated;
GRANT ALL ON TABLE public.day_closings TO anon;
GRANT ALL ON TABLE public.day_closings TO service_role;


--
-- Name: TABLE dental_chart; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dental_chart TO anon;
GRANT ALL ON TABLE public.dental_chart TO authenticated;
GRANT ALL ON TABLE public.dental_chart TO service_role;


--
-- Name: TABLE device_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.device_tokens TO service_role;


--
-- Name: TABLE discount_limits; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.discount_limits TO anon;
GRANT ALL ON TABLE public.discount_limits TO authenticated;
GRANT ALL ON TABLE public.discount_limits TO service_role;


--
-- Name: TABLE discount_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.discount_log TO anon;
GRANT ALL ON TABLE public.discount_log TO authenticated;
GRANT ALL ON TABLE public.discount_log TO service_role;


--
-- Name: TABLE doctors; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.doctors TO anon;
GRANT ALL ON TABLE public.doctors TO authenticated;
GRANT ALL ON TABLE public.doctors TO service_role;


--
-- Name: TABLE expense_budgets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.expense_budgets TO authenticated;
GRANT ALL ON TABLE public.expense_budgets TO anon;
GRANT ALL ON TABLE public.expense_budgets TO service_role;


--
-- Name: TABLE expense_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.expense_categories TO authenticated;
GRANT ALL ON TABLE public.expense_categories TO anon;
GRANT ALL ON TABLE public.expense_categories TO service_role;


--
-- Name: TABLE expense_receipts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.expense_receipts TO authenticated;
GRANT ALL ON TABLE public.expense_receipts TO anon;
GRANT ALL ON TABLE public.expense_receipts TO service_role;


--
-- Name: TABLE gallery; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.gallery TO anon;
GRANT ALL ON TABLE public.gallery TO authenticated;
GRANT ALL ON TABLE public.gallery TO service_role;


--
-- Name: TABLE installments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.installments TO anon;
GRANT ALL ON TABLE public.installments TO authenticated;
GRANT ALL ON TABLE public.installments TO service_role;


--
-- Name: TABLE inventory; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory TO anon;
GRANT ALL ON TABLE public.inventory TO authenticated;
GRANT ALL ON TABLE public.inventory TO service_role;


--
-- Name: TABLE inventory_meta; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_meta TO authenticated;
GRANT ALL ON TABLE public.inventory_meta TO anon;
GRANT ALL ON TABLE public.inventory_meta TO service_role;


--
-- Name: TABLE inventory_movements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_movements TO authenticated;
GRANT ALL ON TABLE public.inventory_movements TO anon;
GRANT ALL ON TABLE public.inventory_movements TO service_role;


--
-- Name: SEQUENCE inventory_movements_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.inventory_movements_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.inventory_movements_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.inventory_movements_id_seq TO anon;


--
-- Name: TABLE inventory_purchase_meta; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inventory_purchase_meta TO authenticated;
GRANT ALL ON TABLE public.inventory_purchase_meta TO anon;
GRANT ALL ON TABLE public.inventory_purchase_meta TO service_role;


--
-- Name: TABLE invoice_counter; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invoice_counter TO authenticated;
GRANT ALL ON TABLE public.invoice_counter TO anon;
GRANT ALL ON TABLE public.invoice_counter TO service_role;


--
-- Name: TABLE invoice_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invoice_items TO authenticated;
GRANT ALL ON TABLE public.invoice_items TO anon;
GRANT ALL ON TABLE public.invoice_items TO service_role;


--
-- Name: TABLE lab_cases; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lab_cases TO anon;
GRANT ALL ON TABLE public.lab_cases TO authenticated;
GRANT ALL ON TABLE public.lab_cases TO service_role;


--
-- Name: TABLE labs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.labs TO anon;
GRANT ALL ON TABLE public.labs TO authenticated;
GRANT ALL ON TABLE public.labs TO service_role;


--
-- Name: TABLE leave_types; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.leave_types TO authenticated;
GRANT ALL ON TABLE public.leave_types TO service_role;


--
-- Name: TABLE loyalty_devices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loyalty_devices TO service_role;
GRANT ALL ON TABLE public.loyalty_devices TO anon;
GRANT ALL ON TABLE public.loyalty_devices TO authenticated;


--
-- Name: TABLE loyalty_program; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loyalty_program TO service_role;
GRANT ALL ON TABLE public.loyalty_program TO authenticated;
GRANT ALL ON TABLE public.loyalty_program TO anon;


--
-- Name: TABLE loyalty_rewards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loyalty_rewards TO service_role;
GRANT ALL ON TABLE public.loyalty_rewards TO authenticated;
GRANT ALL ON TABLE public.loyalty_rewards TO anon;


--
-- Name: TABLE loyalty_scan_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loyalty_scan_log TO service_role;
GRANT ALL ON TABLE public.loyalty_scan_log TO anon;
GRANT ALL ON TABLE public.loyalty_scan_log TO authenticated;


--
-- Name: SEQUENCE loyalty_scan_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.loyalty_scan_log_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.loyalty_scan_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.loyalty_scan_log_id_seq TO authenticated;


--
-- Name: TABLE loyalty_signups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loyalty_signups TO service_role;
GRANT ALL ON TABLE public.loyalty_signups TO authenticated;
GRANT ALL ON TABLE public.loyalty_signups TO anon;


--
-- Name: TABLE loyalty_stamps; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loyalty_stamps TO service_role;
GRANT ALL ON TABLE public.loyalty_stamps TO authenticated;
GRANT ALL ON TABLE public.loyalty_stamps TO anon;


--
-- Name: TABLE loyalty_unlocks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.loyalty_unlocks TO service_role;
GRANT ALL ON TABLE public.loyalty_unlocks TO authenticated;
GRANT ALL ON TABLE public.loyalty_unlocks TO anon;


--
-- Name: TABLE medicines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.medicines TO anon;
GRANT ALL ON TABLE public.medicines TO authenticated;
GRANT ALL ON TABLE public.medicines TO service_role;


--
-- Name: TABLE message_templates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.message_templates TO anon;
GRANT ALL ON TABLE public.message_templates TO authenticated;
GRANT ALL ON TABLE public.message_templates TO service_role;


--
-- Name: TABLE notify_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notify_log TO service_role;
GRANT SELECT ON TABLE public.notify_log TO authenticated;


--
-- Name: TABLE patients; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patients TO anon;
GRANT ALL ON TABLE public.patients TO authenticated;
GRANT ALL ON TABLE public.patients TO service_role;


--
-- Name: TABLE transactions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.transactions TO anon;
GRANT ALL ON TABLE public.transactions TO authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;


