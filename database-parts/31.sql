SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION _att_days(p_period text, p_staff uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._att_days(p_period text, p_staff uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._att_days(p_period text, p_staff uuid) TO service_role;


--
-- Name: FUNCTION _att_lock_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._att_lock_guard() TO anon;
GRANT ALL ON FUNCTION public._att_lock_guard() TO authenticated;
GRANT ALL ON FUNCTION public._att_lock_guard() TO service_role;


--
-- Name: FUNCTION _att_request(p_staff uuid, p_kind text, p_date date, p_time time without time zone, p_reason text, p_lat numeric, p_lng numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._att_request(p_staff uuid, p_kind text, p_date date, p_time time without time zone, p_reason text, p_lat numeric, p_lng numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public._att_request(p_staff uuid, p_kind text, p_date date, p_time time without time zone, p_reason text, p_lat numeric, p_lng numeric) TO service_role;


--
-- Name: FUNCTION _att_state(p_staff uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._att_state(p_staff uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._att_state(p_staff uuid) TO service_role;


--
-- Name: FUNCTION _att_today(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._att_today() TO anon;
GRANT ALL ON FUNCTION public._att_today() TO authenticated;
GRANT ALL ON FUNCTION public._att_today() TO service_role;


--
-- Name: FUNCTION _begin_treatment(p_t uuid, p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._begin_treatment(p_t uuid, p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public._begin_treatment(p_t uuid, p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) TO anon;
GRANT ALL ON FUNCTION public._begin_treatment(p_t uuid, p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public._begin_treatment(p_t uuid, p_price numeric, p_paid numeric, p_method text, p_doctor text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) TO service_role;


--
-- Name: FUNCTION _clinic_open(p_day date, p_off integer[]); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._clinic_open(p_day date, p_off integer[]) TO anon;
GRANT ALL ON FUNCTION public._clinic_open(p_day date, p_off integer[]) TO authenticated;
GRANT ALL ON FUNCTION public._clinic_open(p_day date, p_off integer[]) TO service_role;


--
-- Name: FUNCTION _cv_finish_close_appt(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._cv_finish_close_appt() TO anon;
GRANT ALL ON FUNCTION public._cv_finish_close_appt() TO authenticated;
GRANT ALL ON FUNCTION public._cv_finish_close_appt() TO service_role;


--
-- Name: FUNCTION _disc_pct(p_base numeric, p_final numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._disc_pct(p_base numeric, p_final numeric) TO anon;
GRANT ALL ON FUNCTION public._disc_pct(p_base numeric, p_final numeric) TO authenticated;
GRANT ALL ON FUNCTION public._disc_pct(p_base numeric, p_final numeric) TO service_role;


--
-- Name: FUNCTION _geo_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._geo_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric) TO anon;
GRANT ALL ON FUNCTION public._geo_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric) TO authenticated;
GRANT ALL ON FUNCTION public._geo_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric) TO service_role;


--
-- Name: FUNCTION _karachi_today(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._karachi_today() TO anon;
GRANT ALL ON FUNCTION public._karachi_today() TO authenticated;
GRANT ALL ON FUNCTION public._karachi_today() TO service_role;


--
-- Name: FUNCTION _log_invoice_discount(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._log_invoice_discount() TO anon;
GRANT ALL ON FUNCTION public._log_invoice_discount() TO authenticated;
GRANT ALL ON FUNCTION public._log_invoice_discount() TO service_role;


--
-- Name: FUNCTION _log_treatment_discount(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._log_treatment_discount() TO anon;
GRANT ALL ON FUNCTION public._log_treatment_discount() TO authenticated;
GRANT ALL ON FUNCTION public._log_treatment_discount() TO service_role;


--
-- Name: FUNCTION _loyalty_award(p_patient uuid, p_source text, p_by uuid, p_note text, p_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._loyalty_award(p_patient uuid, p_source text, p_by uuid, p_note text, p_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public._loyalty_award(p_patient uuid, p_source text, p_by uuid, p_note text, p_date date) TO service_role;
GRANT ALL ON FUNCTION public._loyalty_award(p_patient uuid, p_source text, p_by uuid, p_note text, p_date date) TO anon;
GRANT ALL ON FUNCTION public._loyalty_award(p_patient uuid, p_source text, p_by uuid, p_note text, p_date date) TO authenticated;


--
-- Name: FUNCTION _loyalty_card(p_patient uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._loyalty_card(p_patient uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._loyalty_card(p_patient uuid) TO service_role;
GRANT ALL ON FUNCTION public._loyalty_card(p_patient uuid) TO authenticated;
GRANT ALL ON FUNCTION public._loyalty_card(p_patient uuid) TO anon;


--
-- Name: FUNCTION _loyalty_digits(p text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._loyalty_digits(p text) FROM PUBLIC;
GRANT ALL ON FUNCTION public._loyalty_digits(p text) TO service_role;
GRANT ALL ON FUNCTION public._loyalty_digits(p text) TO anon;
GRANT ALL ON FUNCTION public._loyalty_digits(p text) TO authenticated;


--
-- Name: FUNCTION _loyalty_has_visit(p_patient uuid, p_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._loyalty_has_visit(p_patient uuid, p_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public._loyalty_has_visit(p_patient uuid, p_date date) TO service_role;
GRANT ALL ON FUNCTION public._loyalty_has_visit(p_patient uuid, p_date date) TO anon;
GRANT ALL ON FUNCTION public._loyalty_has_visit(p_patient uuid, p_date date) TO authenticated;


--
-- Name: FUNCTION _pay_treatment_core(p_treatment uuid, p_amount numeric, p_method text, p_note text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._pay_treatment_core(p_treatment uuid, p_amount numeric, p_method text, p_note text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public._pay_treatment_core(p_treatment uuid, p_amount numeric, p_method text, p_note text, p_key text) TO anon;
GRANT ALL ON FUNCTION public._pay_treatment_core(p_treatment uuid, p_amount numeric, p_method text, p_note text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public._pay_treatment_core(p_treatment uuid, p_amount numeric, p_method text, p_note text, p_key text) TO service_role;


--
-- Name: FUNCTION _payroll_periods_guard(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._payroll_periods_guard() TO anon;
GRANT ALL ON FUNCTION public._payroll_periods_guard() TO authenticated;
GRANT ALL ON FUNCTION public._payroll_periods_guard() TO service_role;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: FUNCTION _reverse_payment_core(v_pay public.payments, v_inv public.invoices, p_reason text, v_uid uuid, v_today date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._reverse_payment_core(v_pay public.payments, v_inv public.invoices, p_reason text, v_uid uuid, v_today date) FROM PUBLIC;
GRANT ALL ON FUNCTION public._reverse_payment_core(v_pay public.payments, v_inv public.invoices, p_reason text, v_uid uuid, v_today date) TO authenticated;
GRANT ALL ON FUNCTION public._reverse_payment_core(v_pay public.payments, v_inv public.invoices, p_reason text, v_uid uuid, v_today date) TO anon;
GRANT ALL ON FUNCTION public._reverse_payment_core(v_pay public.payments, v_inv public.invoices, p_reason text, v_uid uuid, v_today date) TO service_role;


--
-- Name: FUNCTION _staff_clock(p_staff uuid, p_action text, p_lat numeric, p_lng numeric, p_reason text, p_source text, p_by uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._staff_clock(p_staff uuid, p_action text, p_lat numeric, p_lng numeric, p_reason text, p_source text, p_by uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public._staff_clock(p_staff uuid, p_action text, p_lat numeric, p_lng numeric, p_reason text, p_source text, p_by uuid) TO service_role;


--
-- Name: FUNCTION _treatment_appointment(p_patient uuid, p_treatment uuid, p_name text, p_date date, p_time text, p_visit uuid, p_doctor text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._treatment_appointment(p_patient uuid, p_treatment uuid, p_name text, p_date date, p_time text, p_visit uuid, p_doctor text) FROM PUBLIC;
GRANT ALL ON FUNCTION public._treatment_appointment(p_patient uuid, p_treatment uuid, p_name text, p_date date, p_time text, p_visit uuid, p_doctor text) TO anon;
GRANT ALL ON FUNCTION public._treatment_appointment(p_patient uuid, p_treatment uuid, p_name text, p_date date, p_time text, p_visit uuid, p_doctor text) TO authenticated;
GRANT ALL ON FUNCTION public._treatment_appointment(p_patient uuid, p_treatment uuid, p_name text, p_date date, p_time text, p_visit uuid, p_doctor text) TO service_role;


--
-- Name: FUNCTION _tt(t time without time zone); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._tt(t time without time zone) TO anon;
GRANT ALL ON FUNCTION public._tt(t time without time zone) TO authenticated;
GRANT ALL ON FUNCTION public._tt(t time without time zone) TO service_role;


--
-- Name: FUNCTION add_expense(p_amount numeric, p_category text, p_method text, p_note text, p_date date, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.add_expense(p_amount numeric, p_category text, p_method text, p_note text, p_date date, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.add_expense(p_amount numeric, p_category text, p_method text, p_note text, p_date date, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.add_expense(p_amount numeric, p_category text, p_method text, p_note text, p_date date, p_key text) TO anon;
GRANT ALL ON FUNCTION public.add_expense(p_amount numeric, p_category text, p_method text, p_note text, p_date date, p_key text) TO service_role;


--
-- Name: FUNCTION apply_reward_discount(p_invoice uuid, p_source text, p_reward uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.apply_reward_discount(p_invoice uuid, p_source text, p_reward uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.apply_reward_discount(p_invoice uuid, p_source text, p_reward uuid) TO authenticated;
GRANT ALL ON FUNCTION public.apply_reward_discount(p_invoice uuid, p_source text, p_reward uuid) TO service_role;


--
-- Name: FUNCTION attendance_apply_deduction(p_staff uuid, p_period text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_apply_deduction(p_staff uuid, p_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_apply_deduction(p_staff uuid, p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_apply_deduction(p_staff uuid, p_period text) TO service_role;


--
-- Name: FUNCTION attendance_clock(p_staff uuid, p_action text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_clock(p_staff uuid, p_action text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_clock(p_staff uuid, p_action text) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_clock(p_staff uuid, p_action text) TO service_role;


--
-- Name: FUNCTION attendance_day_view(p_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_day_view(p_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_day_view(p_date date) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_day_view(p_date date) TO service_role;


--
-- Name: FUNCTION attendance_mark(p_staff uuid, p_date date, p_status text, p_in time without time zone, p_out time without time zone, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_mark(p_staff uuid, p_date date, p_status text, p_in time without time zone, p_out time without time zone, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_mark(p_staff uuid, p_date date, p_status text, p_in time without time zone, p_out time without time zone, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_mark(p_staff uuid, p_date date, p_status text, p_in time without time zone, p_out time without time zone, p_note text) TO service_role;


--
-- Name: FUNCTION attendance_mark2(p_staff uuid, p_date date, p_status text, p_in time without time zone, p_out time without time zone, p_note text, p_leave_type uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_mark2(p_staff uuid, p_date date, p_status text, p_in time without time zone, p_out time without time zone, p_note text, p_leave_type uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_mark2(p_staff uuid, p_date date, p_status text, p_in time without time zone, p_out time without time zone, p_note text, p_leave_type uuid) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_mark2(p_staff uuid, p_date date, p_status text, p_in time without time zone, p_out time without time zone, p_note text, p_leave_type uuid) TO service_role;


--
-- Name: FUNCTION attendance_mark_all_present(p_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_mark_all_present(p_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_mark_all_present(p_date date) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_mark_all_present(p_date date) TO service_role;


--
-- Name: FUNCTION attendance_month_days(p_staff uuid, p_period text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_month_days(p_staff uuid, p_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_month_days(p_staff uuid, p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_month_days(p_staff uuid, p_period text) TO service_role;


--
-- Name: FUNCTION attendance_request_decide(p_id uuid, p_approve boolean, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_request_decide(p_id uuid, p_approve boolean, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_request_decide(p_id uuid, p_approve boolean, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_request_decide(p_id uuid, p_approve boolean, p_note text) TO service_role;


--
-- Name: FUNCTION attendance_set_clinic_location(p_lat numeric, p_lng numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_set_clinic_location(p_lat numeric, p_lng numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_set_clinic_location(p_lat numeric, p_lng numeric) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_set_clinic_location(p_lat numeric, p_lng numeric) TO service_role;


--
-- Name: FUNCTION attendance_set_rules(p_start time without time zone, p_grace integer, p_late_cut numeric, p_absent_cut boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_set_rules(p_start time without time zone, p_grace integer, p_late_cut numeric, p_absent_cut boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_set_rules(p_start time without time zone, p_grace integer, p_late_cut numeric, p_absent_cut boolean) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_set_rules(p_start time without time zone, p_grace integer, p_late_cut numeric, p_absent_cut boolean) TO service_role;


--
-- Name: FUNCTION attendance_set_rules2(p jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_set_rules2(p jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_set_rules2(p jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_set_rules2(p jsonb) TO service_role;


--
-- Name: FUNCTION attendance_summary(p_period text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.attendance_summary(p_period text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.attendance_summary(p_period text) TO authenticated;
GRANT ALL ON FUNCTION public.attendance_summary(p_period text) TO service_role;


--
-- Name: FUNCTION audit_log_immutable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.audit_log_immutable() TO anon;
GRANT ALL ON FUNCTION public.audit_log_immutable() TO authenticated;
GRANT ALL ON FUNCTION public.audit_log_immutable() TO service_role;


--
-- Name: FUNCTION audit_row_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.audit_row_change() TO anon;
GRANT ALL ON FUNCTION public.audit_row_change() TO authenticated;
GRANT ALL ON FUNCTION public.audit_row_change() TO service_role;


