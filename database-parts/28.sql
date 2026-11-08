SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_meta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_meta ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_purchase_meta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_purchase_meta ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_meta invmeta_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invmeta_insert ON public.inventory_meta FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('inventory.manage'::text) AS has_perm)));


--
-- Name: inventory_meta invmeta_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invmeta_select ON public.inventory_meta FOR SELECT TO authenticated USING (public.is_staff());


--
-- Name: inventory_meta invmeta_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invmeta_update ON public.inventory_meta FOR UPDATE TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('inventory.manage'::text) AS has_perm))) WITH CHECK ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('inventory.manage'::text) AS has_perm)));


--
-- Name: invoice_counter; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_purchase_meta invpm_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invpm_select ON public.inventory_purchase_meta FOR SELECT TO authenticated USING ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('inventory.manage'::text) AS has_perm) OR ( SELECT public.has_perm('reports.view'::text) AS has_perm)));


--
-- Name: lab_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_photos lab_photos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_photos_insert ON public.patient_photos FOR INSERT TO authenticated WITH CHECK (((lab_case_id IS NOT NULL) AND ( SELECT public.has_perm('lab.manage'::text) AS has_perm)));


--
-- Name: patient_photos lab_photos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_photos_select ON public.patient_photos FOR SELECT TO authenticated USING (((lab_case_id IS NOT NULL) AND ( SELECT public.has_perm('lab.view'::text) AS has_perm)));


--
-- Name: lab_cases lab_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_select ON public.lab_cases FOR SELECT TO authenticated USING (( SELECT public.has_perm('lab.view'::text) AS has_perm));


--
-- Name: lab_cases lab_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_write ON public.lab_cases TO authenticated USING (( SELECT public.has_perm('lab.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('lab.manage'::text) AS has_perm));


--
-- Name: labs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

--
-- Name: labs labs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY labs_select ON public.labs FOR SELECT TO authenticated USING (( SELECT public.has_perm('lab.view'::text) AS has_perm));


--
-- Name: labs labs_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY labs_write ON public.labs TO authenticated USING (( SELECT public.has_perm('lab.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('lab.manage'::text) AS has_perm));


--
-- Name: leave_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_program loy_prog_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loy_prog_select ON public.loyalty_program FOR SELECT TO authenticated USING (true);


--
-- Name: loyalty_program loy_prog_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loy_prog_update ON public.loyalty_program FOR UPDATE TO authenticated USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: loyalty_rewards loy_rew_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loy_rew_insert ON public.loyalty_rewards FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: loyalty_rewards loy_rew_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loy_rew_select ON public.loyalty_rewards FOR SELECT TO authenticated USING (true);


--
-- Name: loyalty_rewards loy_rew_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loy_rew_update ON public.loyalty_rewards FOR UPDATE TO authenticated USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: loyalty_signups loy_signups_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loy_signups_select ON public.loyalty_signups FOR SELECT TO authenticated USING (( SELECT public.has_perm('patients.view'::text) AS has_perm));


--
-- Name: loyalty_stamps loy_stamps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loy_stamps_select ON public.loyalty_stamps FOR SELECT TO authenticated USING (( SELECT public.has_perm('patients.view'::text) AS has_perm));


--
-- Name: loyalty_unlocks loy_unlocks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loy_unlocks_select ON public.loyalty_unlocks FOR SELECT TO authenticated USING (( SELECT public.has_perm('patients.view'::text) AS has_perm));


--
-- Name: loyalty_devices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_devices ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_program; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_program ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_scan_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_scan_log ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_signups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_signups ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_stamps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_stamps ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_unlocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_unlocks ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_types lt_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lt_select ON public.leave_types FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: medicines med_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY med_insert ON public.medicines FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('settings.manage'::text) AS has_perm));


--
-- Name: medicines med_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY med_select ON public.medicines FOR SELECT TO authenticated USING ((( SELECT public.has_perm('prescriptions.view'::text) AS has_perm) OR ( SELECT public.has_perm('settings.manage'::text) AS has_perm)));


--
-- Name: medicines med_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY med_update ON public.medicines FOR UPDATE TO authenticated USING (( SELECT public.has_perm('settings.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('settings.manage'::text) AS has_perm));


--
-- Name: medicines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

--
-- Name: message_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: notify_log nl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nl_select ON public.notify_log FOR SELECT TO authenticated USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: notify_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notify_log ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_options opt_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opt_delete ON public.clinic_options FOR DELETE TO authenticated USING (( SELECT public.has_perm('settings.manage'::text) AS has_perm));


--
-- Name: clinic_options opt_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opt_insert ON public.clinic_options FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('settings.manage'::text) AS has_perm));


--
-- Name: clinic_options opt_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opt_select ON public.clinic_options FOR SELECT TO authenticated USING (true);


--
-- Name: clinic_options opt_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opt_update ON public.clinic_options FOR UPDATE TO authenticated USING (( SELECT public.has_perm('settings.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('settings.manage'::text) AS has_perm));


--
-- Name: treatment_materials owner_delete_treatment_materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_delete_treatment_materials ON public.treatment_materials FOR DELETE USING (( SELECT public.is_owner() AS is_owner));


--
-- Name: expense_categories owner_insert_expense_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_expense_categories ON public.expense_categories FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: installments owner_insert_installments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_installments ON public.installments FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: inventory owner_insert_inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_inventory ON public.inventory FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('inventory.manage'::text) AS has_perm)));


--
-- Name: invoice_items owner_insert_invoice_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_invoice_items ON public.invoice_items FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: invoices owner_insert_invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_invoices ON public.invoices FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: payments owner_insert_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_payments ON public.payments FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: staff_members owner_insert_staff_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_staff_members ON public.staff_members FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: transactions owner_insert_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_transactions ON public.transactions FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: treatment_catalog owner_insert_treatment_catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_treatment_catalog ON public.treatment_catalog FOR INSERT TO authenticated WITH CHECK ((( SELECT public.is_owner() AS is_owner) OR ( SELECT public.has_perm('settings.manage'::text) AS has_perm)));


--
-- Name: treatment_episodes owner_insert_treatment_episodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_treatment_episodes ON public.treatment_episodes FOR INSERT WITH CHECK (( SELECT public.is_owner() AS is_owner));


