SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: FUNCTION log_price_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_price_change() TO anon;
GRANT ALL ON FUNCTION public.log_price_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_price_change() TO service_role;


--
-- Name: FUNCTION log_price_change_upd(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_price_change_upd() TO anon;
GRANT ALL ON FUNCTION public.log_price_change_upd() TO authenticated;
GRANT ALL ON FUNCTION public.log_price_change_upd() TO service_role;


--
-- Name: FUNCTION loyalty_device_lookup(p_hash text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_device_lookup(p_hash text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_device_lookup(p_hash text) TO service_role;
GRANT ALL ON FUNCTION public.loyalty_device_lookup(p_hash text) TO anon;
GRANT ALL ON FUNCTION public.loyalty_device_lookup(p_hash text) TO authenticated;


--
-- Name: FUNCTION loyalty_device_save(p_hash text, p_patient uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_device_save(p_hash text, p_patient uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_device_save(p_hash text, p_patient uuid) TO service_role;
GRANT ALL ON FUNCTION public.loyalty_device_save(p_hash text, p_patient uuid) TO anon;
GRANT ALL ON FUNCTION public.loyalty_device_save(p_hash text, p_patient uuid) TO authenticated;


--
-- Name: FUNCTION loyalty_dismiss_signup(p_signup uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_dismiss_signup(p_signup uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_dismiss_signup(p_signup uuid) TO authenticated;
GRANT ALL ON FUNCTION public.loyalty_dismiss_signup(p_signup uuid) TO anon;
GRANT ALL ON FUNCTION public.loyalty_dismiss_signup(p_signup uuid) TO service_role;


--
-- Name: FUNCTION loyalty_find_patients(p_phone text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_find_patients(p_phone text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_find_patients(p_phone text) TO service_role;
GRANT ALL ON FUNCTION public.loyalty_find_patients(p_phone text) TO anon;
GRANT ALL ON FUNCTION public.loyalty_find_patients(p_phone text) TO authenticated;


--
-- Name: FUNCTION loyalty_link_signup(p_signup uuid, p_patient uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_link_signup(p_signup uuid, p_patient uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_link_signup(p_signup uuid, p_patient uuid) TO authenticated;
GRANT ALL ON FUNCTION public.loyalty_link_signup(p_signup uuid, p_patient uuid) TO anon;
GRANT ALL ON FUNCTION public.loyalty_link_signup(p_signup uuid, p_patient uuid) TO service_role;


--
-- Name: FUNCTION loyalty_manual_stamp(p_patient uuid, p_date date, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_manual_stamp(p_patient uuid, p_date date, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_manual_stamp(p_patient uuid, p_date date, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.loyalty_manual_stamp(p_patient uuid, p_date date, p_note text) TO anon;
GRANT ALL ON FUNCTION public.loyalty_manual_stamp(p_patient uuid, p_date date, p_note text) TO service_role;


--
-- Name: FUNCTION loyalty_rate_ok(p_key text, p_max integer, p_minutes integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_rate_ok(p_key text, p_max integer, p_minutes integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_rate_ok(p_key text, p_max integer, p_minutes integer) TO service_role;
GRANT ALL ON FUNCTION public.loyalty_rate_ok(p_key text, p_max integer, p_minutes integer) TO anon;
GRANT ALL ON FUNCTION public.loyalty_rate_ok(p_key text, p_max integer, p_minutes integer) TO authenticated;


--
-- Name: FUNCTION loyalty_redeem(p_unlock uuid, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_redeem(p_unlock uuid, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_redeem(p_unlock uuid, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.loyalty_redeem(p_unlock uuid, p_note text) TO anon;
GRANT ALL ON FUNCTION public.loyalty_redeem(p_unlock uuid, p_note text) TO service_role;


--
-- Name: FUNCTION loyalty_signup(p_name text, p_phone text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_signup(p_name text, p_phone text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_signup(p_name text, p_phone text) TO service_role;
GRANT ALL ON FUNCTION public.loyalty_signup(p_name text, p_phone text) TO anon;
GRANT ALL ON FUNCTION public.loyalty_signup(p_name text, p_phone text) TO authenticated;


--
-- Name: FUNCTION loyalty_void_stamp(p_stamp uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.loyalty_void_stamp(p_stamp uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.loyalty_void_stamp(p_stamp uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.loyalty_void_stamp(p_stamp uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.loyalty_void_stamp(p_stamp uuid, p_reason text) TO service_role;


--
-- Name: FUNCTION merge_inventory_items(p_keep uuid, p_remove uuid, p_note text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.merge_inventory_items(p_keep uuid, p_remove uuid, p_note text) TO authenticated;


--
-- Name: FUNCTION my_attendance_clock(p_action text, p_lat numeric, p_lng numeric, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_attendance_clock(p_action text, p_lat numeric, p_lng numeric, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_attendance_clock(p_action text, p_lat numeric, p_lng numeric, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.my_attendance_clock(p_action text, p_lat numeric, p_lng numeric, p_reason text) TO service_role;


--
-- Name: FUNCTION my_attendance_request(p_kind text, p_reason text, p_date date, p_time time without time zone, p_lat numeric, p_lng numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_attendance_request(p_kind text, p_reason text, p_date date, p_time time without time zone, p_lat numeric, p_lng numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_attendance_request(p_kind text, p_reason text, p_date date, p_time time without time zone, p_lat numeric, p_lng numeric) TO authenticated;
GRANT ALL ON FUNCTION public.my_attendance_request(p_kind text, p_reason text, p_date date, p_time time without time zone, p_lat numeric, p_lng numeric) TO service_role;


--
-- Name: FUNCTION my_attendance_state(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_attendance_state() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_attendance_state() TO authenticated;
GRANT ALL ON FUNCTION public.my_attendance_state() TO service_role;


--
-- Name: FUNCTION my_discount_limit(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_discount_limit() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_discount_limit() TO authenticated;
GRANT ALL ON FUNCTION public.my_discount_limit() TO service_role;


--
-- Name: FUNCTION my_permissions(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_permissions() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_permissions() TO authenticated;
GRANT ALL ON FUNCTION public.my_permissions() TO anon;
GRANT ALL ON FUNCTION public.my_permissions() TO service_role;


--
-- Name: FUNCTION my_staff(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.my_staff() FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_staff() TO authenticated;
GRANT ALL ON FUNCTION public.my_staff() TO anon;
GRANT ALL ON FUNCTION public.my_staff() TO service_role;


--
-- Name: FUNCTION open_clinical_visit(p_patient_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.open_clinical_visit(p_patient_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.open_clinical_visit(p_patient_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.open_clinical_visit(p_patient_id uuid) TO anon;
GRANT ALL ON FUNCTION public.open_clinical_visit(p_patient_id uuid) TO service_role;


--
-- Name: FUNCTION pay_installment(p_installment_id uuid, p_amount numeric, p_method text, p_note text, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pay_installment(p_installment_id uuid, p_amount numeric, p_method text, p_note text, p_idempotency_key text) TO authenticated;


--
-- Name: FUNCTION pay_lab_case(p_case_id uuid, p_amount numeric, p_method text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.pay_lab_case(p_case_id uuid, p_amount numeric, p_method text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.pay_lab_case(p_case_id uuid, p_amount numeric, p_method text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.pay_lab_case(p_case_id uuid, p_amount numeric, p_method text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.pay_lab_case(p_case_id uuid, p_amount numeric, p_method text, p_key text) TO service_role;


--
-- Name: FUNCTION pay_lab_total(p_lab_name text, p_amount numeric, p_method text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.pay_lab_total(p_lab_name text, p_amount numeric, p_method text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.pay_lab_total(p_lab_name text, p_amount numeric, p_method text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.pay_lab_total(p_lab_name text, p_amount numeric, p_method text, p_key text) TO service_role;


--
-- Name: FUNCTION pay_legacy_due(p_tx_id uuid, p_amount numeric, p_method text, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pay_legacy_due(p_tx_id uuid, p_amount numeric, p_method text, p_idempotency_key text) TO authenticated;


--
-- Name: FUNCTION pay_treatment(p_treatment_id uuid, p_amount numeric, p_method text, p_note text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.pay_treatment(p_treatment_id uuid, p_amount numeric, p_method text, p_note text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.pay_treatment(p_treatment_id uuid, p_amount numeric, p_method text, p_note text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.pay_treatment(p_treatment_id uuid, p_amount numeric, p_method text, p_note text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.pay_treatment(p_treatment_id uuid, p_amount numeric, p_method text, p_note text, p_key text) TO service_role;


--
-- Name: FUNCTION payroll_calc(p_period text, p_staff uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payroll_calc(p_period text, p_staff uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payroll_calc(p_period text, p_staff uuid) TO authenticated;
GRANT ALL ON FUNCTION public.payroll_calc(p_period text, p_staff uuid) TO service_role;


--
-- Name: FUNCTION payroll_finalize(p_staff uuid, p_period text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payroll_finalize(p_staff uuid, p_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payroll_finalize(p_staff uuid, p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.payroll_finalize(p_staff uuid, p_period text) TO service_role;


--
-- Name: FUNCTION payroll_finalize_all(p_period text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.payroll_finalize_all(p_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.payroll_finalize_all(p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.payroll_finalize_all(p_period text) TO service_role;


--
-- Name: FUNCTION pre_req(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pre_req() TO anon;
GRANT ALL ON FUNCTION public.pre_req() TO authenticated;
GRANT ALL ON FUNCTION public.pre_req() TO service_role;


--
-- Name: FUNCTION purge_inventory_item(p_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.purge_inventory_item(p_id uuid) TO authenticated;


--
-- Name: FUNCTION push_on_payment(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.push_on_payment() TO anon;
GRANT ALL ON FUNCTION public.push_on_payment() TO authenticated;
GRANT ALL ON FUNCTION public.push_on_payment() TO service_role;


--
-- Name: FUNCTION receive_lab_case(p_case_id uuid, p_cost numeric, p_paid numeric, p_method text, p_note text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.receive_lab_case(p_case_id uuid, p_cost numeric, p_paid numeric, p_method text, p_note text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.receive_lab_case(p_case_id uuid, p_cost numeric, p_paid numeric, p_method text, p_note text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.receive_lab_case(p_case_id uuid, p_cost numeric, p_paid numeric, p_method text, p_note text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.receive_lab_case(p_case_id uuid, p_cost numeric, p_paid numeric, p_method text, p_note text, p_key text) TO service_role;


--
-- Name: FUNCTION record_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_idempotency_key text) TO authenticated;
GRANT ALL ON FUNCTION public.record_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_idempotency_key text) TO anon;
GRANT ALL ON FUNCTION public.record_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION record_purchase(p_inventory_id uuid, p_qty numeric, p_total_cost numeric, p_method text, p_supplier text, p_expiry date, p_note text, p_kind text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_purchase(p_inventory_id uuid, p_qty numeric, p_total_cost numeric, p_method text, p_supplier text, p_expiry date, p_note text, p_kind text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_purchase(p_inventory_id uuid, p_qty numeric, p_total_cost numeric, p_method text, p_supplier text, p_expiry date, p_note text, p_kind text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.record_purchase(p_inventory_id uuid, p_qty numeric, p_total_cost numeric, p_method text, p_supplier text, p_expiry date, p_note text, p_kind text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.record_purchase(p_inventory_id uuid, p_qty numeric, p_total_cost numeric, p_method text, p_supplier text, p_expiry date, p_note text, p_kind text, p_key text) TO service_role;


--
-- Name: FUNCTION record_purchase_pack(p_inventory_id uuid, p_packs numeric, p_units_per_pack numeric, p_total_cost numeric, p_method text, p_supplier text, p_company text, p_bill_no text, p_bill_path text, p_expiry date, p_note text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_purchase_pack(p_inventory_id uuid, p_packs numeric, p_units_per_pack numeric, p_total_cost numeric, p_method text, p_supplier text, p_company text, p_bill_no text, p_bill_path text, p_expiry date, p_note text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_purchase_pack(p_inventory_id uuid, p_packs numeric, p_units_per_pack numeric, p_total_cost numeric, p_method text, p_supplier text, p_company text, p_bill_no text, p_bill_path text, p_expiry date, p_note text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.record_purchase_pack(p_inventory_id uuid, p_packs numeric, p_units_per_pack numeric, p_total_cost numeric, p_method text, p_supplier text, p_company text, p_bill_no text, p_bill_path text, p_expiry date, p_note text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.record_purchase_pack(p_inventory_id uuid, p_packs numeric, p_units_per_pack numeric, p_total_cost numeric, p_method text, p_supplier text, p_company text, p_bill_no text, p_bill_path text, p_expiry date, p_note text, p_key text) TO service_role;


--
-- Name: FUNCTION record_stock_count(p_counts jsonb, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_stock_count(p_counts jsonb, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_stock_count(p_counts jsonb, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.record_stock_count(p_counts jsonb, p_note text) TO anon;
GRANT ALL ON FUNCTION public.record_stock_count(p_counts jsonb, p_note text) TO service_role;


--
-- Name: FUNCTION record_usage(p_items jsonb, p_patient_id uuid, p_invoice_id uuid, p_note text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.record_usage(p_items jsonb, p_patient_id uuid, p_invoice_id uuid, p_note text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_usage(p_items jsonb, p_patient_id uuid, p_invoice_id uuid, p_note text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.record_usage(p_items jsonb, p_patient_id uuid, p_invoice_id uuid, p_note text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.record_usage(p_items jsonb, p_patient_id uuid, p_invoice_id uuid, p_note text, p_key text) TO service_role;


--
-- Name: FUNCTION report_summary(p_from date, p_to date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.report_summary(p_from date, p_to date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.report_summary(p_from date, p_to date) TO authenticated;
GRANT ALL ON FUNCTION public.report_summary(p_from date, p_to date) TO anon;
GRANT ALL ON FUNCTION public.report_summary(p_from date, p_to date) TO service_role;


--
-- Name: FUNCTION reschedule_appointment(p_id uuid, p_date date, p_time text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reschedule_appointment(p_id uuid, p_date date, p_time text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reschedule_appointment(p_id uuid, p_date date, p_time text) TO authenticated;
GRANT ALL ON FUNCTION public.reschedule_appointment(p_id uuid, p_date date, p_time text) TO anon;
GRANT ALL ON FUNCTION public.reschedule_appointment(p_id uuid, p_date date, p_time text) TO service_role;


--
-- Name: FUNCTION restore_inventory_item(p_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.restore_inventory_item(p_id uuid) TO authenticated;


--
-- Name: FUNCTION reverse_payment(p_payment_id uuid, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text) TO anon;
GRANT ALL ON FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text) TO service_role;


