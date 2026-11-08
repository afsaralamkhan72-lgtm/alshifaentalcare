SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: patient_treatments patient_treatments_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_treatments
    ADD CONSTRAINT patient_treatments_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES public.treatment_catalog(id);


--
-- Name: patient_treatments patient_treatments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_treatments
    ADD CONSTRAINT patient_treatments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patients patients_assigned_doctor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_assigned_doctor_fkey FOREIGN KEY (assigned_doctor) REFERENCES public.staff_profiles(id);


--
-- Name: patients patients_family_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_family_of_fkey FOREIGN KEY (family_of) REFERENCES public.patients(id);


--
-- Name: patients patients_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.staff_profiles(id);


--
-- Name: payment_plan_items payment_plan_items_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plan_items
    ADD CONSTRAINT payment_plan_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.payment_plans(id) ON DELETE CASCADE;


--
-- Name: payment_plans payment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plans
    ADD CONSTRAINT payment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: payment_plans payment_plans_patient_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_plans
    ADD CONSTRAINT payment_plans_patient_treatment_id_fkey FOREIGN KEY (patient_treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: payments payments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: payments payments_reverses_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reverses_payment_id_fkey FOREIGN KEY (reverses_payment_id) REFERENCES public.payments(id);


--
-- Name: payroll_periods payroll_periods_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id);


--
-- Name: prescriptions prescriptions_clinical_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_clinical_visit_id_fkey FOREIGN KEY (clinical_visit_id) REFERENCES public.clinical_visits(id);


--
-- Name: prescriptions prescriptions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_prescribed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_prescribed_by_fkey FOREIGN KEY (prescribed_by) REFERENCES public.staff_profiles(id);


--
-- Name: prescriptions prescriptions_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: prescriptions prescriptions_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit_notes(id);


--
-- Name: recalls recalls_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recalls
    ADD CONSTRAINT recalls_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff_profiles(id);


--
-- Name: recalls recalls_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recalls
    ADD CONSTRAINT recalls_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: staff_attendance sa_leave_type_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT sa_leave_type_fk FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);


--
-- Name: scratch_cards scratch_cards_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_cards
    ADD CONSTRAINT scratch_cards_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: scratch_cards scratch_cards_prize_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_cards
    ADD CONSTRAINT scratch_cards_prize_id_fkey FOREIGN KEY (prize_id) REFERENCES public.scratch_prizes(id);


--
-- Name: share_links share_links_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: site_settings site_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff_profiles(id);


--
-- Name: staff_attendance staff_attendance_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id);


--
-- Name: staff_ledger staff_ledger_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_ledger
    ADD CONSTRAINT staff_ledger_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id);


--
-- Name: staff_members staff_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.staff_profiles(id);


--
-- Name: staff_permissions staff_permissions_perm_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_perm_code_fkey FOREIGN KEY (perm_code) REFERENCES public.permission_catalog(code) ON DELETE CASCADE;


--
-- Name: staff_permissions staff_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.staff_profiles(id) ON DELETE CASCADE;


--
-- Name: staff_portal_access staff_portal_access_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_portal_access
    ADD CONSTRAINT staff_portal_access_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id);


--
-- Name: staff_portal_log staff_portal_log_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_portal_log
    ADD CONSTRAINT staff_portal_log_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id);


--
-- Name: staff_profiles staff_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stock_counts stock_counts_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id);


--
-- Name: transactions transactions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff_profiles(id);


--
-- Name: transactions transactions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff_profiles(id);


--
-- Name: treatment_episodes treatment_episodes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_episodes
    ADD CONSTRAINT treatment_episodes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff_profiles(id);


--
-- Name: treatment_episodes treatment_episodes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_episodes
    ADD CONSTRAINT treatment_episodes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: treatment_materials treatment_materials_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_materials
    ADD CONSTRAINT treatment_materials_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id);


--
-- Name: treatment_materials treatment_materials_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_materials
    ADD CONSTRAINT treatment_materials_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.treatment_catalog(id);


--
-- Name: treatment_plans treatment_plans_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff_profiles(id);


--
-- Name: treatment_plans treatment_plans_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: treatment_price_history treatment_price_history_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_price_history
    ADD CONSTRAINT treatment_price_history_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.treatment_catalog(id);


--
-- Name: treatment_stages treatment_stages_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_stages
    ADD CONSTRAINT treatment_stages_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: treatment_stages treatment_stages_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_stages
    ADD CONSTRAINT treatment_stages_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: visit_notes visit_notes_clinical_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_notes
    ADD CONSTRAINT visit_notes_clinical_visit_id_fkey FOREIGN KEY (clinical_visit_id) REFERENCES public.clinical_visits(id);


--
-- Name: visit_notes visit_notes_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_notes
    ADD CONSTRAINT visit_notes_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.staff_profiles(id);


