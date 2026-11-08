SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: visit_notes visit_notes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_notes
    ADD CONSTRAINT visit_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: visit_notes visit_notes_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_notes
    ADD CONSTRAINT visit_notes_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id) ON DELETE SET NULL;


--
-- Name: visit_notes visit_notes_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_notes
    ADD CONSTRAINT visit_notes_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: _migration_report; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public._migration_report ENABLE ROW LEVEL SECURITY;

--
-- Name: patients admin_delete_patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_delete_patients ON public.patients FOR DELETE USING (( SELECT public.has_role('admin'::text) AS has_role));


--
-- Name: staff_profiles admin_manage_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_manage_staff ON public.staff_profiles USING (( SELECT public.has_role('admin'::text) AS has_role)) WITH CHECK (( SELECT public.has_role('admin'::text) AS has_role));


--
-- Name: audit_log admin_read_audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_read_audit ON public.audit_log FOR SELECT USING (( SELECT public.has_role('admin'::text) AS has_role));


--
-- Name: appointment_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointment_history ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: appointment_history appt_hist_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY appt_hist_select ON public.appointment_history FOR SELECT TO authenticated USING (( SELECT public.has_perm('appointments.view'::text) AS has_perm));


--
-- Name: attendance_rules ar_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ar_select ON public.attendance_rules FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: attendance_requests ars_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ars_select ON public.attendance_requests FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: attendance_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_days cd_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cd_select ON public.clinic_days FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: dental_chart clin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_delete ON public.dental_chart FOR DELETE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: patient_photos clin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_delete ON public.patient_photos FOR DELETE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: recalls clin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_delete ON public.recalls FOR DELETE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: dental_chart clin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_insert ON public.dental_chart FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: patient_history clin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_insert ON public.patient_history FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: patient_photos clin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_insert ON public.patient_photos FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: recalls clin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_insert ON public.recalls FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: visit_notes clin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_insert ON public.visit_notes FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: dental_chart clin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_select ON public.dental_chart FOR SELECT TO authenticated USING (( SELECT public.has_perm('clinical.view'::text) AS has_perm));


--
-- Name: patient_history clin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_select ON public.patient_history FOR SELECT TO authenticated USING (( SELECT public.has_perm('clinical.view'::text) AS has_perm));


--
-- Name: patient_photos clin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_select ON public.patient_photos FOR SELECT TO authenticated USING (( SELECT public.has_perm('clinical.view'::text) AS has_perm));


--
-- Name: recalls clin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_select ON public.recalls FOR SELECT TO authenticated USING (( SELECT public.has_perm('clinical.view'::text) AS has_perm));


--
-- Name: visit_notes clin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_select ON public.visit_notes FOR SELECT TO authenticated USING (( SELECT public.has_perm('clinical.view'::text) AS has_perm));


--
-- Name: dental_chart clin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_update ON public.dental_chart FOR UPDATE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: patient_history clin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_update ON public.patient_history FOR UPDATE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: patient_photos clin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_update ON public.patient_photos FOR UPDATE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: recalls clin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_update ON public.recalls FOR UPDATE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: visit_notes clin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clin_update ON public.visit_notes FOR UPDATE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: clinic_days; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinic_days ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinic_options ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinic_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: clinical_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clinical_visits ENABLE ROW LEVEL SECURITY;

--
-- Name: clinical_visits cv_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cv_select ON public.clinical_visits FOR SELECT TO authenticated USING (( SELECT public.has_perm('clinical.view'::text) AS has_perm));


--
-- Name: day_closings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.day_closings ENABLE ROW LEVEL SECURITY;

--
-- Name: dental_chart; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dental_chart ENABLE ROW LEVEL SECURITY;

--
-- Name: device_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_log ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_limits dl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dl_select ON public.discount_limits FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: discount_log dlog_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dlog_select ON public.discount_log FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: doctors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_budgets expbud_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expbud_insert ON public.expense_budgets FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: expense_budgets expbud_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expbud_select ON public.expense_budgets FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('expenses.manage'::text) AS has_perm) OR ( SELECT public.has_perm('reports.view'::text) AS has_perm)));


--
-- Name: expense_budgets expbud_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expbud_update ON public.expense_budgets FOR UPDATE TO authenticated USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: expense_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_receipts exprec_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exprec_select ON public.expense_receipts FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('expenses.manage'::text) AS has_perm) OR ( SELECT public.has_perm('inventory.manage'::text) AS has_perm) OR ( SELECT public.has_perm('reports.view'::text) AS has_perm)));


--
-- Name: gallery; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

--
-- Name: installments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

