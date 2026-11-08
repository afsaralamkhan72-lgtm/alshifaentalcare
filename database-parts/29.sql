SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: treatment_materials owner_insert_treatment_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_treatment_materials ON public.treatment_materials FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: treatment_plans owner_insert_treatment_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_treatment_plans ON public.treatment_plans FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: day_closings owner_select_day_closings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_day_closings ON public.day_closings FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('reports.view'::text) AS has_perm) OR ( SELECT public.has_perm('billing.collect'::text) AS has_perm)));


--
-- Name: expense_categories owner_select_expense_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_expense_categories ON public.expense_categories FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('expenses.manage'::text) AS has_perm) OR ( SELECT public.has_perm('reports.view'::text) AS has_perm)));


--
-- Name: installments owner_select_installments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_installments ON public.installments FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('billing.view'::text) AS has_perm)));


--
-- Name: inventory_movements owner_select_inventory_movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_inventory_movements ON public.inventory_movements FOR SELECT USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: invoice_counter owner_select_invoice_counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_invoice_counter ON public.invoice_counter FOR SELECT USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: invoice_items owner_select_invoice_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_invoice_items ON public.invoice_items FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('billing.view'::text) AS has_perm)));


--
-- Name: invoices owner_select_invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_invoices ON public.invoices FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('billing.view'::text) AS has_perm)));


--
-- Name: payments owner_select_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_payments ON public.payments FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('billing.view'::text) AS has_perm)));


--
-- Name: staff_ledger owner_select_staff_ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_staff_ledger ON public.staff_ledger FOR SELECT USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: staff_members owner_select_staff_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_staff_members ON public.staff_members FOR SELECT USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: stock_counts owner_select_stock_counts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_stock_counts ON public.stock_counts FOR SELECT USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: transactions owner_select_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_transactions ON public.transactions FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('billing.view'::text) AS has_perm) OR ( SELECT public.has_perm('reports.view'::text) AS has_perm)));


--
-- Name: treatment_catalog owner_select_treatment_catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_treatment_catalog ON public.treatment_catalog FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('settings.manage'::text) AS has_perm) OR ( SELECT public.has_perm('clinical.edit'::text) AS has_perm) OR ( SELECT public.has_perm('billing.view'::text) AS has_perm)));


--
-- Name: treatment_episodes owner_select_treatment_episodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_treatment_episodes ON public.treatment_episodes FOR SELECT USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: treatment_materials owner_select_treatment_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_treatment_materials ON public.treatment_materials FOR SELECT USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: treatment_plans owner_select_treatment_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_treatment_plans ON public.treatment_plans FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('billing.view'::text) AS has_perm)));


--
-- Name: treatment_price_history owner_select_treatment_price_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_treatment_price_history ON public.treatment_price_history FOR SELECT USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: expense_categories owner_update_expense_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_expense_categories ON public.expense_categories FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: installments owner_update_installments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_installments ON public.installments FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: inventory owner_update_inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_inventory ON public.inventory FOR UPDATE TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('inventory.manage'::text) AS has_perm))) WITH CHECK ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('inventory.manage'::text) AS has_perm)));


--
-- Name: invoice_counter owner_update_invoice_counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_invoice_counter ON public.invoice_counter FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: invoices owner_update_invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_invoices ON public.invoices FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: staff_members owner_update_staff_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_staff_members ON public.staff_members FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: transactions owner_update_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_transactions ON public.transactions FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: treatment_catalog owner_update_treatment_catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_treatment_catalog ON public.treatment_catalog FOR UPDATE TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('settings.manage'::text) AS has_perm))) WITH CHECK ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('settings.manage'::text) AS has_perm)));


--
-- Name: treatment_episodes owner_update_treatment_episodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_treatment_episodes ON public.treatment_episodes FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: treatment_materials owner_update_treatment_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_treatment_materials ON public.treatment_materials FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: treatment_plans owner_update_treatment_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_treatment_plans ON public.treatment_plans FOR UPDATE USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: message_templates owner_write_msgtpl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_write_msgtpl ON public.message_templates TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());


--
-- Name: patient_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_history ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_treatments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_treatments ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_plan_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_plan_items ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_catalog perm_catalog_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY perm_catalog_read ON public.permission_catalog FOR SELECT TO authenticated USING (( SELECT public.is_staff() AS is_staff));


--
-- Name: permission_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.permission_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_plans pp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pp_select ON public.payment_plans FOR SELECT TO authenticated USING ((public.has_perm('billing.view'::text) OR public.has_perm('billing.collect'::text) OR public.has_perm('billing.create'::text)));


--
-- Name: payroll_periods pp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pp_select ON public.payroll_periods FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: payment_plan_items ppi_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ppi_select ON public.payment_plan_items FOR SELECT TO authenticated USING ((public.has_perm('billing.view'::text) OR public.has_perm('billing.collect'::text) OR public.has_perm('billing.create'::text)));


--
-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_treatments pt_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pt_select ON public.patient_treatments FOR SELECT TO authenticated USING ((( SELECT public.has_perm('clinical.view'::text) AS has_perm) OR ( SELECT public.has_perm('billing.view'::text) AS has_perm) OR ( SELECT public.has_perm('billing.collect'::text) AS has_perm)));


--
-- Name: appointments public_can_book_appointment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_can_book_appointment ON public.appointments FOR INSERT WITH CHECK (true);


--
-- Name: blog_posts public_read_blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_blog ON public.blog_posts FOR SELECT USING ((is_published = true));


--
-- Name: clinic_photos public_read_clinic_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_clinic_photos ON public.clinic_photos FOR SELECT USING (true);


--
-- Name: doctors public_read_doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_doctors ON public.doctors FOR SELECT USING (true);


--
-- Name: gallery public_read_gallery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_gallery ON public.gallery FOR SELECT USING (true);


--
-- Name: services public_read_services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_services ON public.services FOR SELECT USING ((is_active = true));


--
-- Name: site_settings public_read_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_settings ON public.site_settings FOR SELECT USING (true);


--
-- Name: testimonials public_read_testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_testimonials ON public.testimonials FOR SELECT USING ((is_approved = true));


--
-- Name: videos public_read_videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_videos ON public.videos FOR SELECT USING (true);


--
-- Name: push_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_keys ENABLE ROW LEVEL SECURITY;

