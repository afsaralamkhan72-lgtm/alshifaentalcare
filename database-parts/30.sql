SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: push_subs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subs ENABLE ROW LEVEL SECURITY;

--
-- Name: recalls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recalls ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions rx_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rx_delete ON public.prescriptions FOR DELETE TO authenticated USING (( SELECT public.has_perm('prescriptions.write'::text) AS has_perm));


--
-- Name: prescriptions rx_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rx_insert ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('prescriptions.write'::text) AS has_perm));


--
-- Name: prescriptions rx_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rx_select ON public.prescriptions FOR SELECT TO authenticated USING (( SELECT public.has_perm('prescriptions.view'::text) AS has_perm));


--
-- Name: prescriptions rx_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rx_update ON public.prescriptions FOR UPDATE TO authenticated USING (( SELECT public.has_perm('prescriptions.write'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('prescriptions.write'::text) AS has_perm));


--
-- Name: staff_attendance sa_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sa_select ON public.staff_attendance FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: scratch_cards scr_card_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scr_card_select ON public.scratch_cards FOR SELECT TO authenticated USING (( SELECT public.has_perm('patients.view'::text) AS has_perm));


--
-- Name: scratch_prizes scr_prize_ins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scr_prize_ins ON public.scratch_prizes FOR INSERT TO authenticated WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: scratch_prizes scr_prize_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scr_prize_select ON public.scratch_prizes FOR SELECT TO authenticated USING (true);


--
-- Name: scratch_prizes scr_prize_upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scr_prize_upd ON public.scratch_prizes FOR UPDATE TO authenticated USING (( SELECT public.is_owner() AS is_owner)) WITH CHECK (( SELECT public.is_owner() AS is_owner));


--
-- Name: scratch_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scratch_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: scratch_prizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scratch_prizes ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: share_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: share_links sl_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sl_select ON public.share_links FOR SELECT TO authenticated USING (public.is_owner());


--
-- Name: treating_doctors staff_all_treating_doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_all_treating_doctors ON public.treating_doctors USING (( SELECT public.is_staff() AS is_staff)) WITH CHECK (( SELECT public.is_staff() AS is_staff));


--
-- Name: staff_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: patients staff_insert_patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_insert_patients ON public.patients FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('patients.create'::text) AS has_perm));


--
-- Name: staff_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments staff_manage_appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_manage_appointments ON public.appointments FOR SELECT TO authenticated USING (( SELECT public.has_perm('appointments.view'::text) AS has_perm));


--
-- Name: staff_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_permissions staff_perm_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_perm_read ON public.staff_permissions FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR ( SELECT public.has_role('admin'::text) AS has_role)));


--
-- Name: staff_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_portal_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_portal_access ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_portal_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_portal_log ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory staff_select_inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_select_inventory ON public.inventory FOR SELECT TO authenticated USING (( SELECT public.has_perm('inventory.view'::text) AS has_perm));


--
-- Name: message_templates staff_select_msgtpl; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_select_msgtpl ON public.message_templates FOR SELECT TO authenticated USING (true);


--
-- Name: patients staff_select_patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_select_patients ON public.patients FOR SELECT TO authenticated USING (( SELECT public.has_perm('patients.view'::text) AS has_perm));


--
-- Name: appointments staff_update_appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_update_appointments ON public.appointments FOR UPDATE TO authenticated USING (( SELECT public.has_perm('appointments.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('appointments.manage'::text) AS has_perm));


--
-- Name: patients staff_update_patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_update_patients ON public.patients FOR UPDATE TO authenticated USING (( SELECT public.has_perm('patients.edit'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('patients.edit'::text) AS has_perm));


--
-- Name: staff_profiles staff_view_own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_view_own_profile ON public.staff_profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR ( SELECT public.is_owner() AS is_owner)));


--
-- Name: blog_posts staff_write_blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_write_blog ON public.blog_posts TO authenticated USING (( SELECT public.has_perm('website.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('website.manage'::text) AS has_perm));


--
-- Name: clinic_photos staff_write_clinic_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_write_clinic_photos ON public.clinic_photos TO authenticated USING (( SELECT public.has_perm('website.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('website.manage'::text) AS has_perm));


--
-- Name: doctors staff_write_doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_write_doctors ON public.doctors TO authenticated USING (( SELECT public.has_perm('website.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('website.manage'::text) AS has_perm));


--
-- Name: gallery staff_write_gallery; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_write_gallery ON public.gallery TO authenticated USING (( SELECT public.has_perm('website.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('website.manage'::text) AS has_perm));


--
-- Name: services staff_write_services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_write_services ON public.services TO authenticated USING (( SELECT public.has_perm('website.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('website.manage'::text) AS has_perm));


--
-- Name: site_settings staff_write_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_write_settings ON public.site_settings TO authenticated USING (( SELECT public.has_perm('website.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('website.manage'::text) AS has_perm));


--
-- Name: testimonials staff_write_testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_write_testimonials ON public.testimonials TO authenticated USING (( SELECT public.has_perm('website.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('website.manage'::text) AS has_perm));


--
-- Name: videos staff_write_videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_write_videos ON public.videos TO authenticated USING (( SELECT public.has_perm('website.manage'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('website.manage'::text) AS has_perm));


--
-- Name: treatment_stages stages_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stages_delete ON public.treatment_stages FOR DELETE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: treatment_stages stages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stages_insert ON public.treatment_stages FOR INSERT TO authenticated WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: treatment_stages stages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stages_select ON public.treatment_stages FOR SELECT TO authenticated USING (( SELECT public.has_perm('clinical.view'::text) AS has_perm));


--
-- Name: treatment_stages stages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stages_update ON public.treatment_stages FOR UPDATE TO authenticated USING (( SELECT public.has_perm('clinical.edit'::text) AS has_perm)) WITH CHECK (( SELECT public.has_perm('clinical.edit'::text) AS has_perm));


--
-- Name: stock_counts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;

--
-- Name: testimonials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: treating_doctors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treating_doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_episodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_episodes ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: treatment_stages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatment_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

--
-- Name: visit_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visit_notes ENABLE ROW LEVEL SECURITY;

