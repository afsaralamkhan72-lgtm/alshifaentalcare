SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: FUNCTION revoke_share_links(p_patient uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.revoke_share_links(p_patient uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.revoke_share_links(p_patient uuid) TO authenticated;
GRANT ALL ON FUNCTION public.revoke_share_links(p_patient uuid) TO service_role;


--
-- Name: FUNCTION rotate_weak_portal_codes(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.rotate_weak_portal_codes() FROM PUBLIC;
GRANT ALL ON FUNCTION public.rotate_weak_portal_codes() TO authenticated;
GRANT ALL ON FUNCTION public.rotate_weak_portal_codes() TO anon;
GRANT ALL ON FUNCTION public.rotate_weak_portal_codes() TO service_role;


--
-- Name: FUNCTION save_clinical_visit(p_id uuid, p_data jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_clinical_visit(p_id uuid, p_data jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_clinical_visit(p_id uuid, p_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.save_clinical_visit(p_id uuid, p_data jsonb) TO anon;
GRANT ALL ON FUNCTION public.save_clinical_visit(p_id uuid, p_data jsonb) TO service_role;


--
-- Name: FUNCTION save_visit_draft_extra(p_id uuid, p_extra jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.save_visit_draft_extra(p_id uuid, p_extra jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.save_visit_draft_extra(p_id uuid, p_extra jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.save_visit_draft_extra(p_id uuid, p_extra jsonb) TO anon;
GRANT ALL ON FUNCTION public.save_visit_draft_extra(p_id uuid, p_extra jsonb) TO service_role;


--
-- Name: FUNCTION scratch_play(p_patient uuid, p_peek boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.scratch_play(p_patient uuid, p_peek boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.scratch_play(p_patient uuid, p_peek boolean) TO service_role;


--
-- Name: FUNCTION scratch_redeem(p_card uuid, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.scratch_redeem(p_card uuid, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.scratch_redeem(p_card uuid, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.scratch_redeem(p_card uuid, p_note text) TO service_role;


--
-- Name: FUNCTION seed_treatment_catalog_from_history(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.seed_treatment_catalog_from_history() FROM PUBLIC;
GRANT ALL ON FUNCTION public.seed_treatment_catalog_from_history() TO authenticated;
GRANT ALL ON FUNCTION public.seed_treatment_catalog_from_history() TO anon;
GRANT ALL ON FUNCTION public.seed_treatment_catalog_from_history() TO service_role;


--
-- Name: FUNCTION set_discount_limit(p_role text, p_percent numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_discount_limit(p_role text, p_percent numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_discount_limit(p_role text, p_percent numeric) TO authenticated;
GRANT ALL ON FUNCTION public.set_discount_limit(p_role text, p_percent numeric) TO service_role;


--
-- Name: FUNCTION set_expense_receipt(p_tx_id uuid, p_path text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_expense_receipt(p_tx_id uuid, p_path text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_expense_receipt(p_tx_id uuid, p_path text) TO authenticated;
GRANT ALL ON FUNCTION public.set_expense_receipt(p_tx_id uuid, p_path text) TO anon;
GRANT ALL ON FUNCTION public.set_expense_receipt(p_tx_id uuid, p_path text) TO service_role;


--
-- Name: FUNCTION set_inventory_active(p_id uuid, p_active boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_inventory_active(p_id uuid, p_active boolean) TO authenticated;


--
-- Name: FUNCTION set_lab_case_number(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_lab_case_number() TO anon;
GRANT ALL ON FUNCTION public.set_lab_case_number() TO authenticated;
GRANT ALL ON FUNCTION public.set_lab_case_number() TO service_role;


--
-- Name: FUNCTION set_next_invoice_number(p_next integer, p_prefix text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_next_invoice_number(p_next integer, p_prefix text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_next_invoice_number(p_next integer, p_prefix text) TO authenticated;
GRANT ALL ON FUNCTION public.set_next_invoice_number(p_next integer, p_prefix text) TO anon;
GRANT ALL ON FUNCTION public.set_next_invoice_number(p_next integer, p_prefix text) TO service_role;


--
-- Name: FUNCTION set_portal_code(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_portal_code() TO anon;
GRANT ALL ON FUNCTION public.set_portal_code() TO authenticated;
GRANT ALL ON FUNCTION public.set_portal_code() TO service_role;


--
-- Name: FUNCTION set_staff_permissions(p_user uuid, p_codes text[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_staff_permissions(p_user uuid, p_codes text[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_staff_permissions(p_user uuid, p_codes text[]) TO authenticated;
GRANT ALL ON FUNCTION public.set_staff_permissions(p_user uuid, p_codes text[]) TO anon;
GRANT ALL ON FUNCTION public.set_staff_permissions(p_user uuid, p_codes text[]) TO service_role;


--
-- Name: FUNCTION set_treatment_status(p_treatment_id uuid, p_status text, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.set_treatment_status(p_treatment_id uuid, p_status text, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_treatment_status(p_treatment_id uuid, p_status text, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.set_treatment_status(p_treatment_id uuid, p_status text, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.set_treatment_status(p_treatment_id uuid, p_status text, p_reason text) TO service_role;


--
-- Name: FUNCTION share_fail(p_token text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.share_fail(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.share_fail(p_token text) TO service_role;


--
-- Name: FUNCTION share_ok(p_token text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.share_ok(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.share_ok(p_token text) TO service_role;


--
-- Name: FUNCTION staff_acknowledge(p_staff_id uuid, p_entry_id uuid, p_ip text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_acknowledge(p_staff_id uuid, p_entry_id uuid, p_ip text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_acknowledge(p_staff_id uuid, p_entry_id uuid, p_ip text) TO service_role;
GRANT ALL ON FUNCTION public.staff_acknowledge(p_staff_id uuid, p_entry_id uuid, p_ip text) TO anon;
GRANT ALL ON FUNCTION public.staff_acknowledge(p_staff_id uuid, p_entry_id uuid, p_ip text) TO authenticated;


--
-- Name: FUNCTION staff_add_entry(p_staff_id uuid, p_kind text, p_amount numeric, p_date date, p_period text, p_method text, p_note text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_add_entry(p_staff_id uuid, p_kind text, p_amount numeric, p_date date, p_period text, p_method text, p_note text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_add_entry(p_staff_id uuid, p_kind text, p_amount numeric, p_date date, p_period text, p_method text, p_note text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.staff_add_entry(p_staff_id uuid, p_kind text, p_amount numeric, p_date date, p_period text, p_method text, p_note text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.staff_add_entry(p_staff_id uuid, p_kind text, p_amount numeric, p_date date, p_period text, p_method text, p_note text, p_key text) TO service_role;


--
-- Name: FUNCTION staff_att_settings(p_staff uuid, p jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_att_settings(p_staff uuid, p jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_att_settings(p_staff uuid, p jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.staff_att_settings(p_staff uuid, p jsonb) TO service_role;


--
-- Name: FUNCTION staff_attendance_request(p_staff uuid, p_kind text, p_reason text, p_date date, p_time time without time zone, p_lat numeric, p_lng numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_attendance_request(p_staff uuid, p_kind text, p_reason text, p_date date, p_time time without time zone, p_lat numeric, p_lng numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_attendance_request(p_staff uuid, p_kind text, p_reason text, p_date date, p_time time without time zone, p_lat numeric, p_lng numeric) TO service_role;


--
-- Name: FUNCTION staff_attendance_state(p_staff uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_attendance_state(p_staff uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_attendance_state(p_staff uuid) TO service_role;


--
-- Name: FUNCTION staff_generate_salary(p_period text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_generate_salary(p_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_generate_salary(p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.staff_generate_salary(p_period text) TO anon;
GRANT ALL ON FUNCTION public.staff_generate_salary(p_period text) TO service_role;


--
-- Name: FUNCTION staff_ledger_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.staff_ledger_guard() TO anon;
GRANT ALL ON FUNCTION public.staff_ledger_guard() TO authenticated;
GRANT ALL ON FUNCTION public.staff_ledger_guard() TO service_role;


--
-- Name: FUNCTION staff_portal_fail(p_staff_id uuid, p_ip text, p_max integer, p_lock_minutes integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_portal_fail(p_staff_id uuid, p_ip text, p_max integer, p_lock_minutes integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_portal_fail(p_staff_id uuid, p_ip text, p_max integer, p_lock_minutes integer) TO service_role;
GRANT ALL ON FUNCTION public.staff_portal_fail(p_staff_id uuid, p_ip text, p_max integer, p_lock_minutes integer) TO anon;
GRANT ALL ON FUNCTION public.staff_portal_fail(p_staff_id uuid, p_ip text, p_max integer, p_lock_minutes integer) TO authenticated;


--
-- Name: FUNCTION staff_portal_log_immutable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.staff_portal_log_immutable() TO anon;
GRANT ALL ON FUNCTION public.staff_portal_log_immutable() TO authenticated;
GRANT ALL ON FUNCTION public.staff_portal_log_immutable() TO service_role;


--
-- Name: FUNCTION staff_portal_ok(p_staff_id uuid, p_ip text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_portal_ok(p_staff_id uuid, p_ip text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_portal_ok(p_staff_id uuid, p_ip text) TO service_role;
GRANT ALL ON FUNCTION public.staff_portal_ok(p_staff_id uuid, p_ip text) TO anon;
GRANT ALL ON FUNCTION public.staff_portal_ok(p_staff_id uuid, p_ip text) TO authenticated;


--
-- Name: FUNCTION staff_self_clock(p_staff uuid, p_action text, p_lat numeric, p_lng numeric, p_reason text, p_source text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.staff_self_clock(p_staff uuid, p_action text, p_lat numeric, p_lng numeric, p_reason text, p_source text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.staff_self_clock(p_staff uuid, p_action text, p_lat numeric, p_lng numeric, p_reason text, p_source text) TO service_role;


--
-- Name: FUNCTION start_treatment(p_patient_id uuid, p_name text, p_catalog_id uuid, p_teeth text[], p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_chart_condition text, p_key text, p_next_time text, p_planned boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.start_treatment(p_patient_id uuid, p_name text, p_catalog_id uuid, p_teeth text[], p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_chart_condition text, p_key text, p_next_time text, p_planned boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.start_treatment(p_patient_id uuid, p_name text, p_catalog_id uuid, p_teeth text[], p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_chart_condition text, p_key text, p_next_time text, p_planned boolean) TO authenticated;
GRANT ALL ON FUNCTION public.start_treatment(p_patient_id uuid, p_name text, p_catalog_id uuid, p_teeth text[], p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_chart_condition text, p_key text, p_next_time text, p_planned boolean) TO anon;
GRANT ALL ON FUNCTION public.start_treatment(p_patient_id uuid, p_name text, p_catalog_id uuid, p_teeth text[], p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_chart_condition text, p_key text, p_next_time text, p_planned boolean) TO service_role;


--
-- Name: FUNCTION stock_return_or_damage(p_inventory_id uuid, p_qty numeric, p_kind text, p_refund numeric, p_method text, p_note text, p_key text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.stock_return_or_damage(p_inventory_id uuid, p_qty numeric, p_kind text, p_refund numeric, p_method text, p_note text, p_key text) TO authenticated;


--
-- Name: FUNCTION tooth_label(p text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tooth_label(p text) TO anon;
GRANT ALL ON FUNCTION public.tooth_label(p text) TO authenticated;
GRANT ALL ON FUNCTION public.tooth_label(p text) TO service_role;


--
-- Name: FUNCTION touch_medicine(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.touch_medicine() TO anon;
GRANT ALL ON FUNCTION public.touch_medicine() TO authenticated;
GRANT ALL ON FUNCTION public.touch_medicine() TO service_role;


--
-- Name: FUNCTION touch_patient_history(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.touch_patient_history() TO anon;
GRANT ALL ON FUNCTION public.touch_patient_history() TO authenticated;
GRANT ALL ON FUNCTION public.touch_patient_history() TO service_role;


--
-- Name: FUNCTION update_inventory_item(p_id uuid, p_name text, p_category text, p_unit text, p_reorder numeric, p_supplier text, p_group text, p_description text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_inventory_item(p_id uuid, p_name text, p_category text, p_unit text, p_reorder numeric, p_supplier text, p_group text, p_description text) TO authenticated;


--
-- Name: FUNCTION verify_document(p_code text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.verify_document(p_code text) TO anon;
GRANT ALL ON FUNCTION public.verify_document(p_code text) TO authenticated;


--
-- Name: FUNCTION void_expense(p_tx_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.void_expense(p_tx_id uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.void_expense(p_tx_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.void_expense(p_tx_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.void_expense(p_tx_id uuid, p_reason text) TO service_role;


--
-- Name: FUNCTION void_invoice(p_invoice_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.void_invoice(p_invoice_id uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.void_invoice(p_invoice_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.void_invoice(p_invoice_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.void_invoice(p_invoice_id uuid, p_reason text) TO service_role;


--
-- Name: FUNCTION zz_try(q text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.zz_try(q text) TO authenticated;
GRANT ALL ON FUNCTION public.zz_try(q text) TO anon;
GRANT ALL ON FUNCTION public.zz_try(q text) TO service_role;


--
-- Name: TABLE _migration_report; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public._migration_report TO anon;
GRANT ALL ON TABLE public._migration_report TO authenticated;
GRANT ALL ON TABLE public._migration_report TO service_role;


--
-- Name: TABLE appointment_history; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.appointment_history TO anon;
GRANT ALL ON TABLE public.appointment_history TO authenticated;
GRANT ALL ON TABLE public.appointment_history TO service_role;


--
-- Name: SEQUENCE appointment_history_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.appointment_history_id_seq TO service_role;
GRANT ALL ON SEQUENCE public.appointment_history_id_seq TO anon;
GRANT ALL ON SEQUENCE public.appointment_history_id_seq TO authenticated;


--
-- Name: TABLE appointments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.appointments TO anon;
GRANT ALL ON TABLE public.appointments TO authenticated;
GRANT ALL ON TABLE public.appointments TO service_role;


