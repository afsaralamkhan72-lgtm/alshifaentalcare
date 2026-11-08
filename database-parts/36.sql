SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: TABLE treatment_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treatment_plans TO anon;
GRANT ALL ON TABLE public.treatment_plans TO authenticated;
GRANT ALL ON TABLE public.treatment_plans TO service_role;


--
-- Name: TABLE patient_balances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patient_balances TO authenticated;
GRANT ALL ON TABLE public.patient_balances TO service_role;
GRANT ALL ON TABLE public.patient_balances TO anon;


--
-- Name: TABLE patient_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patient_history TO anon;
GRANT ALL ON TABLE public.patient_history TO authenticated;
GRANT ALL ON TABLE public.patient_history TO service_role;


--
-- Name: TABLE patient_ledger; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patient_ledger TO authenticated;
GRANT ALL ON TABLE public.patient_ledger TO service_role;
GRANT ALL ON TABLE public.patient_ledger TO anon;


--
-- Name: SEQUENCE patient_mr_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.patient_mr_seq TO authenticated;
GRANT ALL ON SEQUENCE public.patient_mr_seq TO service_role;
GRANT ALL ON SEQUENCE public.patient_mr_seq TO anon;


--
-- Name: TABLE patient_photos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patient_photos TO anon;
GRANT ALL ON TABLE public.patient_photos TO authenticated;
GRANT ALL ON TABLE public.patient_photos TO service_role;


--
-- Name: TABLE patient_treatments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patient_treatments TO anon;
GRANT ALL ON TABLE public.patient_treatments TO authenticated;
GRANT ALL ON TABLE public.patient_treatments TO service_role;


--
-- Name: TABLE payment_plan_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_plan_items TO anon;
GRANT ALL ON TABLE public.payment_plan_items TO authenticated;
GRANT ALL ON TABLE public.payment_plan_items TO service_role;


--
-- Name: TABLE payment_plans; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payment_plans TO anon;
GRANT ALL ON TABLE public.payment_plans TO authenticated;
GRANT ALL ON TABLE public.payment_plans TO service_role;


--
-- Name: TABLE payroll_periods; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE ON TABLE public.payroll_periods TO authenticated;
GRANT ALL ON TABLE public.payroll_periods TO service_role;


--
-- Name: TABLE permission_catalog; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.permission_catalog TO anon;
GRANT ALL ON TABLE public.permission_catalog TO authenticated;
GRANT ALL ON TABLE public.permission_catalog TO service_role;


--
-- Name: TABLE prescriptions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prescriptions TO anon;
GRANT ALL ON TABLE public.prescriptions TO authenticated;
GRANT ALL ON TABLE public.prescriptions TO service_role;


--
-- Name: TABLE push_keys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.push_keys TO anon;
GRANT ALL ON TABLE public.push_keys TO authenticated;
GRANT ALL ON TABLE public.push_keys TO service_role;


--
-- Name: TABLE push_subs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.push_subs TO anon;
GRANT ALL ON TABLE public.push_subs TO authenticated;
GRANT ALL ON TABLE public.push_subs TO service_role;


--
-- Name: TABLE recalls; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.recalls TO anon;
GRANT ALL ON TABLE public.recalls TO authenticated;
GRANT ALL ON TABLE public.recalls TO service_role;


--
-- Name: TABLE scratch_cards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scratch_cards TO anon;
GRANT ALL ON TABLE public.scratch_cards TO authenticated;
GRANT ALL ON TABLE public.scratch_cards TO service_role;


--
-- Name: TABLE scratch_prizes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scratch_prizes TO anon;
GRANT ALL ON TABLE public.scratch_prizes TO authenticated;
GRANT ALL ON TABLE public.scratch_prizes TO service_role;


--
-- Name: TABLE services; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.services TO anon;
GRANT ALL ON TABLE public.services TO authenticated;
GRANT ALL ON TABLE public.services TO service_role;


--
-- Name: TABLE share_links; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.share_links TO authenticated;
GRANT ALL ON TABLE public.share_links TO service_role;


--
-- Name: TABLE site_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.site_settings TO anon;
GRANT ALL ON TABLE public.site_settings TO authenticated;
GRANT ALL ON TABLE public.site_settings TO service_role;


--
-- Name: TABLE staff_attendance; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_attendance TO anon;
GRANT ALL ON TABLE public.staff_attendance TO authenticated;
GRANT ALL ON TABLE public.staff_attendance TO service_role;


--
-- Name: TABLE staff_ledger; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_ledger TO authenticated;
GRANT ALL ON TABLE public.staff_ledger TO anon;
GRANT ALL ON TABLE public.staff_ledger TO service_role;


--
-- Name: TABLE staff_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_members TO authenticated;
GRANT ALL ON TABLE public.staff_members TO anon;
GRANT ALL ON TABLE public.staff_members TO service_role;


--
-- Name: TABLE staff_balances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_balances TO authenticated;
GRANT ALL ON TABLE public.staff_balances TO anon;
GRANT ALL ON TABLE public.staff_balances TO service_role;


--
-- Name: TABLE staff_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_permissions TO anon;
GRANT ALL ON TABLE public.staff_permissions TO authenticated;
GRANT ALL ON TABLE public.staff_permissions TO service_role;


--
-- Name: TABLE staff_portal_access; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_portal_access TO anon;
GRANT ALL ON TABLE public.staff_portal_access TO authenticated;
GRANT ALL ON TABLE public.staff_portal_access TO service_role;


--
-- Name: TABLE staff_portal_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_portal_log TO anon;
GRANT ALL ON TABLE public.staff_portal_log TO authenticated;
GRANT ALL ON TABLE public.staff_portal_log TO service_role;


--
-- Name: SEQUENCE staff_portal_log_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.staff_portal_log_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.staff_portal_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.staff_portal_log_id_seq TO authenticated;


--
-- Name: TABLE staff_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.staff_profiles TO anon;
GRANT ALL ON TABLE public.staff_profiles TO authenticated;
GRANT ALL ON TABLE public.staff_profiles TO service_role;


--
-- Name: TABLE stock_counts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.stock_counts TO authenticated;
GRANT ALL ON TABLE public.stock_counts TO anon;
GRANT ALL ON TABLE public.stock_counts TO service_role;


--
-- Name: SEQUENCE stock_counts_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.stock_counts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.stock_counts_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.stock_counts_id_seq TO anon;


--
-- Name: TABLE testimonials; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.testimonials TO anon;
GRANT ALL ON TABLE public.testimonials TO authenticated;
GRANT ALL ON TABLE public.testimonials TO service_role;


--
-- Name: TABLE treating_doctors; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treating_doctors TO anon;
GRANT ALL ON TABLE public.treating_doctors TO authenticated;
GRANT ALL ON TABLE public.treating_doctors TO service_role;


--
-- Name: TABLE treatment_balances; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treatment_balances TO authenticated;
GRANT ALL ON TABLE public.treatment_balances TO anon;
GRANT ALL ON TABLE public.treatment_balances TO service_role;


--
-- Name: TABLE treatment_catalog; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treatment_catalog TO authenticated;
GRANT ALL ON TABLE public.treatment_catalog TO anon;
GRANT ALL ON TABLE public.treatment_catalog TO service_role;


--
-- Name: TABLE treatment_episodes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treatment_episodes TO anon;
GRANT ALL ON TABLE public.treatment_episodes TO authenticated;
GRANT ALL ON TABLE public.treatment_episodes TO service_role;


--
-- Name: TABLE treatment_materials; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treatment_materials TO authenticated;
GRANT ALL ON TABLE public.treatment_materials TO anon;
GRANT ALL ON TABLE public.treatment_materials TO service_role;


--
-- Name: TABLE visit_notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.visit_notes TO anon;
GRANT ALL ON TABLE public.visit_notes TO authenticated;
GRANT ALL ON TABLE public.visit_notes TO service_role;


--
-- Name: TABLE treatment_overview; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treatment_overview TO authenticated;
GRANT ALL ON TABLE public.treatment_overview TO anon;
GRANT ALL ON TABLE public.treatment_overview TO service_role;


--
-- Name: TABLE treatment_price_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treatment_price_history TO authenticated;
GRANT ALL ON TABLE public.treatment_price_history TO anon;
GRANT ALL ON TABLE public.treatment_price_history TO service_role;


--
-- Name: SEQUENCE treatment_price_history_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.treatment_price_history_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.treatment_price_history_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.treatment_price_history_id_seq TO anon;


--
-- Name: TABLE treatment_stages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.treatment_stages TO anon;
GRANT ALL ON TABLE public.treatment_stages TO authenticated;
GRANT ALL ON TABLE public.treatment_stages TO service_role;


--
-- Name: TABLE videos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.videos TO anon;
GRANT ALL ON TABLE public.videos TO authenticated;
GRANT ALL ON TABLE public.videos TO service_role;


--
-- PostgreSQL database dump complete
--



