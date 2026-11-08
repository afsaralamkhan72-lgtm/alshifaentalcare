SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: FUNCTION begin_planned_treatment(p_treatment_id uuid, p_price numeric, p_paid numeric, p_method text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.begin_planned_treatment(p_treatment_id uuid, p_price numeric, p_paid numeric, p_method text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.begin_planned_treatment(p_treatment_id uuid, p_price numeric, p_paid numeric, p_method text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.begin_planned_treatment(p_treatment_id uuid, p_price numeric, p_paid numeric, p_method text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.begin_planned_treatment(p_treatment_id uuid, p_price numeric, p_paid numeric, p_method text, p_notes text, p_next_visit date, p_next_time text, p_chart_condition text, p_key text) TO service_role;


--
-- Name: FUNCTION block_patient_hard_delete(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.block_patient_hard_delete() TO anon;
GRANT ALL ON FUNCTION public.block_patient_hard_delete() TO authenticated;
GRANT ALL ON FUNCTION public.block_patient_hard_delete() TO service_role;


--
-- Name: FUNCTION cancel_payment_plan(p_plan uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.cancel_payment_plan(p_plan uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.cancel_payment_plan(p_plan uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cancel_payment_plan(p_plan uuid) TO anon;
GRANT ALL ON FUNCTION public.cancel_payment_plan(p_plan uuid) TO service_role;


--
-- Name: FUNCTION clinic_closed_suspects(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.clinic_closed_suspects() FROM PUBLIC;
GRANT ALL ON FUNCTION public.clinic_closed_suspects() TO authenticated;
GRANT ALL ON FUNCTION public.clinic_closed_suspects() TO service_role;


--
-- Name: FUNCTION clinic_set_days(p_from date, p_to date, p_closed boolean, p_reason text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.clinic_set_days(p_from date, p_to date, p_closed boolean, p_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.clinic_set_days(p_from date, p_to date, p_closed boolean, p_reason text) TO authenticated;
GRANT ALL ON FUNCTION public.clinic_set_days(p_from date, p_to date, p_closed boolean, p_reason text) TO service_role;


--
-- Name: FUNCTION close_day(p_date date, p_counted_cash numeric, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.close_day(p_date date, p_counted_cash numeric, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.close_day(p_date date, p_counted_cash numeric, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.close_day(p_date date, p_counted_cash numeric, p_note text) TO anon;
GRANT ALL ON FUNCTION public.close_day(p_date date, p_counted_cash numeric, p_note text) TO service_role;


--
-- Name: FUNCTION collect_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.collect_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.collect_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.collect_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.collect_payment(p_invoice_id uuid, p_amount numeric, p_method text, p_note text, p_key text) TO service_role;


--
-- Name: FUNCTION collect_with_discount(p_invoice_id uuid, p_discount numeric, p_amount numeric, p_method text, p_reason text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.collect_with_discount(p_invoice_id uuid, p_discount numeric, p_amount numeric, p_method text, p_reason text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.collect_with_discount(p_invoice_id uuid, p_discount numeric, p_amount numeric, p_method text, p_reason text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.collect_with_discount(p_invoice_id uuid, p_discount numeric, p_amount numeric, p_method text, p_reason text, p_key text) TO service_role;


--
-- Name: FUNCTION continue_treatment(p_treatment_id uuid, p_notes text, p_procedure text, p_next_visit date, p_extra_charge numeric, p_extra_label text, p_paid numeric, p_method text, p_key text, p_next_time text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.continue_treatment(p_treatment_id uuid, p_notes text, p_procedure text, p_next_visit date, p_extra_charge numeric, p_extra_label text, p_paid numeric, p_method text, p_key text, p_next_time text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.continue_treatment(p_treatment_id uuid, p_notes text, p_procedure text, p_next_visit date, p_extra_charge numeric, p_extra_label text, p_paid numeric, p_method text, p_key text, p_next_time text) TO authenticated;
GRANT ALL ON FUNCTION public.continue_treatment(p_treatment_id uuid, p_notes text, p_procedure text, p_next_visit date, p_extra_charge numeric, p_extra_label text, p_paid numeric, p_method text, p_key text, p_next_time text) TO anon;
GRANT ALL ON FUNCTION public.continue_treatment(p_treatment_id uuid, p_notes text, p_procedure text, p_next_visit date, p_extra_charge numeric, p_extra_label text, p_paid numeric, p_method text, p_key text, p_next_time text) TO service_role;


--
-- Name: FUNCTION create_invoice(p_patient_id uuid, p_items jsonb, p_discount_percent numeric, p_paid numeric, p_method text, p_doctor text, p_due_date date, p_notes text, p_idempotency_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_invoice(p_patient_id uuid, p_items jsonb, p_discount_percent numeric, p_paid numeric, p_method text, p_doctor text, p_due_date date, p_notes text, p_idempotency_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_invoice(p_patient_id uuid, p_items jsonb, p_discount_percent numeric, p_paid numeric, p_method text, p_doctor text, p_due_date date, p_notes text, p_idempotency_key text) TO authenticated;
GRANT ALL ON FUNCTION public.create_invoice(p_patient_id uuid, p_items jsonb, p_discount_percent numeric, p_paid numeric, p_method text, p_doctor text, p_due_date date, p_notes text, p_idempotency_key text) TO anon;
GRANT ALL ON FUNCTION public.create_invoice(p_patient_id uuid, p_items jsonb, p_discount_percent numeric, p_paid numeric, p_method text, p_doctor text, p_due_date date, p_notes text, p_idempotency_key text) TO service_role;


--
-- Name: FUNCTION create_payment_plan(p_treatment uuid, p_items jsonb, p_note text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_payment_plan(p_treatment uuid, p_items jsonb, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_payment_plan(p_treatment uuid, p_items jsonb, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.create_payment_plan(p_treatment uuid, p_items jsonb, p_note text) TO anon;
GRANT ALL ON FUNCTION public.create_payment_plan(p_treatment uuid, p_items jsonb, p_note text) TO service_role;


--
-- Name: FUNCTION create_share_link(p_patient uuid, p_prescription uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.create_share_link(p_patient uuid, p_prescription uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_share_link(p_patient uuid, p_prescription uuid) TO authenticated;
GRANT ALL ON FUNCTION public.create_share_link(p_patient uuid, p_prescription uuid) TO service_role;


--
-- Name: FUNCTION day_closings_immutable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.day_closings_immutable() TO anon;
GRANT ALL ON FUNCTION public.day_closings_immutable() TO authenticated;
GRANT ALL ON FUNCTION public.day_closings_immutable() TO service_role;


--
-- Name: FUNCTION day_summary(p_date date); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.day_summary(p_date date) FROM PUBLIC;
GRANT ALL ON FUNCTION public.day_summary(p_date date) TO authenticated;
GRANT ALL ON FUNCTION public.day_summary(p_date date) TO anon;
GRANT ALL ON FUNCTION public.day_summary(p_date date) TO service_role;


--
-- Name: FUNCTION delete_inventory_item(p_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.delete_inventory_item(p_id uuid) TO authenticated;


--
-- Name: FUNCTION find_similar_patients(p_name text, p_phone text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.find_similar_patients(p_name text, p_phone text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.find_similar_patients(p_name text, p_phone text) TO authenticated;
GRANT ALL ON FUNCTION public.find_similar_patients(p_name text, p_phone text) TO anon;
GRANT ALL ON FUNCTION public.find_similar_patients(p_name text, p_phone text) TO service_role;


--
-- Name: FUNCTION finish_clinical_visit(p_id uuid, p_data jsonb, p_rx jsonb, p_extra jsonb, p_treatments jsonb, p_discount numeric, p_paid numeric, p_method text, p_key text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.finish_clinical_visit(p_id uuid, p_data jsonb, p_rx jsonb, p_extra jsonb, p_treatments jsonb, p_discount numeric, p_paid numeric, p_method text, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.finish_clinical_visit(p_id uuid, p_data jsonb, p_rx jsonb, p_extra jsonb, p_treatments jsonb, p_discount numeric, p_paid numeric, p_method text, p_key text) TO authenticated;
GRANT ALL ON FUNCTION public.finish_clinical_visit(p_id uuid, p_data jsonb, p_rx jsonb, p_extra jsonb, p_treatments jsonb, p_discount numeric, p_paid numeric, p_method text, p_key text) TO anon;
GRANT ALL ON FUNCTION public.finish_clinical_visit(p_id uuid, p_data jsonb, p_rx jsonb, p_extra jsonb, p_treatments jsonb, p_discount numeric, p_paid numeric, p_method text, p_key text) TO service_role;


--
-- Name: FUNCTION generate_mr_number(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_mr_number() TO anon;
GRANT ALL ON FUNCTION public.generate_mr_number() TO authenticated;
GRANT ALL ON FUNCTION public.generate_mr_number() TO service_role;


--
-- Name: FUNCTION generate_portal_code(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_portal_code() TO anon;
GRANT ALL ON FUNCTION public.generate_portal_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_portal_code() TO service_role;


--
-- Name: FUNCTION give_consent(p_patient uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.give_consent(p_patient uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.give_consent(p_patient uuid) TO authenticated;
GRANT ALL ON FUNCTION public.give_consent(p_patient uuid) TO anon;
GRANT ALL ON FUNCTION public.give_consent(p_patient uuid) TO service_role;


--
-- Name: FUNCTION guard_inventory_quantity(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_inventory_quantity() TO anon;
GRANT ALL ON FUNCTION public.guard_inventory_quantity() TO authenticated;
GRANT ALL ON FUNCTION public.guard_inventory_quantity() TO service_role;


--
-- Name: FUNCTION guard_invoice_insert(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_invoice_insert() TO anon;
GRANT ALL ON FUNCTION public.guard_invoice_insert() TO authenticated;
GRANT ALL ON FUNCTION public.guard_invoice_insert() TO service_role;


--
-- Name: FUNCTION guard_invoice_row(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_invoice_row() TO anon;
GRANT ALL ON FUNCTION public.guard_invoice_row() TO authenticated;
GRANT ALL ON FUNCTION public.guard_invoice_row() TO service_role;


--
-- Name: FUNCTION guard_invoice_transactions(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_invoice_transactions() TO anon;
GRANT ALL ON FUNCTION public.guard_invoice_transactions() TO authenticated;
GRANT ALL ON FUNCTION public.guard_invoice_transactions() TO service_role;


--
-- Name: FUNCTION guard_lab_money(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_lab_money() TO anon;
GRANT ALL ON FUNCTION public.guard_lab_money() TO authenticated;
GRANT ALL ON FUNCTION public.guard_lab_money() TO service_role;


--
-- Name: FUNCTION guard_lab_patient(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_lab_patient() TO anon;
GRANT ALL ON FUNCTION public.guard_lab_patient() TO authenticated;
GRANT ALL ON FUNCTION public.guard_lab_patient() TO service_role;


--
-- Name: FUNCTION guard_patient_soft_delete(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_patient_soft_delete() TO anon;
GRANT ALL ON FUNCTION public.guard_patient_soft_delete() TO authenticated;
GRANT ALL ON FUNCTION public.guard_patient_soft_delete() TO service_role;


--
-- Name: FUNCTION guard_public_booking(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_public_booking() TO anon;
GRANT ALL ON FUNCTION public.guard_public_booking() TO authenticated;
GRANT ALL ON FUNCTION public.guard_public_booking() TO service_role;


--
-- Name: FUNCTION guard_staff_profile(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_staff_profile() TO anon;
GRANT ALL ON FUNCTION public.guard_staff_profile() TO authenticated;
GRANT ALL ON FUNCTION public.guard_staff_profile() TO service_role;


--
-- Name: FUNCTION guard_visit_note(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_visit_note() TO anon;
GRANT ALL ON FUNCTION public.guard_visit_note() TO authenticated;
GRANT ALL ON FUNCTION public.guard_visit_note() TO service_role;


--
-- Name: FUNCTION has_perm(p_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.has_perm(p_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_perm(p_code text) TO authenticated;
GRANT ALL ON FUNCTION public.has_perm(p_code text) TO anon;
GRANT ALL ON FUNCTION public.has_perm(p_code text) TO service_role;


--
-- Name: FUNCTION has_role(required_role text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role(required_role text) TO anon;
GRANT ALL ON FUNCTION public.has_role(required_role text) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(required_role text) TO service_role;


--
-- Name: FUNCTION inventory_item_flags(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inventory_item_flags() TO authenticated;


--
-- Name: FUNCTION inventory_movements_immutable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inventory_movements_immutable() TO anon;
GRANT ALL ON FUNCTION public.inventory_movements_immutable() TO authenticated;
GRANT ALL ON FUNCTION public.inventory_movements_immutable() TO service_role;


--
-- Name: FUNCTION inventory_reconcile(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.inventory_reconcile() TO authenticated;


--
-- Name: FUNCTION invoice_reconcile(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.invoice_reconcile() TO authenticated;


--
-- Name: FUNCTION is_owner(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_owner() TO anon;
GRANT ALL ON FUNCTION public.is_owner() TO authenticated;
GRANT ALL ON FUNCTION public.is_owner() TO service_role;


--
-- Name: FUNCTION is_staff(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_staff() TO anon;
GRANT ALL ON FUNCTION public.is_staff() TO authenticated;
GRANT ALL ON FUNCTION public.is_staff() TO service_role;


--
-- Name: FUNCTION leave_type_save(p_id uuid, p_name text, p_paid boolean, p_quota integer, p_active boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.leave_type_save(p_id uuid, p_name text, p_paid boolean, p_quota integer, p_active boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.leave_type_save(p_id uuid, p_name text, p_paid boolean, p_quota integer, p_active boolean) TO authenticated;
GRANT ALL ON FUNCTION public.leave_type_save(p_id uuid, p_name text, p_paid boolean, p_quota integer, p_active boolean) TO service_role;


--
-- Name: FUNCTION link_appointment_patient(p_appt uuid, p_create boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.link_appointment_patient(p_appt uuid, p_create boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.link_appointment_patient(p_appt uuid, p_create boolean) TO authenticated;
GRANT ALL ON FUNCTION public.link_appointment_patient(p_appt uuid, p_create boolean) TO anon;
GRANT ALL ON FUNCTION public.link_appointment_patient(p_appt uuid, p_create boolean) TO service_role;


--
-- Name: FUNCTION link_to_clinical_visit(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.link_to_clinical_visit() TO anon;
GRANT ALL ON FUNCTION public.link_to_clinical_visit() TO authenticated;
GRANT ALL ON FUNCTION public.link_to_clinical_visit() TO service_role;


--
-- Name: FUNCTION log_appointment_change(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.log_appointment_change() TO anon;
GRANT ALL ON FUNCTION public.log_appointment_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_appointment_change() TO service_role;


