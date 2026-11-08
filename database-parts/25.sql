SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: appointments appointments_clinical_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_clinical_visit_id_fkey FOREIGN KEY (clinical_visit_id) REFERENCES public.clinical_visits(id);


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: appointments appointments_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: appointments appointments_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit_notes(id);


--
-- Name: attendance_requests attendance_requests_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_requests
    ADD CONSTRAINT attendance_requests_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_members(id);


--
-- Name: clinical_visits clinical_visits_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_visits
    ADD CONSTRAINT clinical_visits_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: clinical_visits clinical_visits_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_visits
    ADD CONSTRAINT clinical_visits_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: clinical_visits clinical_visits_next_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_visits
    ADD CONSTRAINT clinical_visits_next_treatment_id_fkey FOREIGN KEY (next_treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: clinical_visits clinical_visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinical_visits
    ADD CONSTRAINT clinical_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: dental_chart dental_chart_clinical_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_clinical_visit_id_fkey FOREIGN KEY (clinical_visit_id) REFERENCES public.clinical_visits(id);


--
-- Name: dental_chart dental_chart_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: dental_chart dental_chart_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff_profiles(id);


--
-- Name: dental_chart dental_chart_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dental_chart
    ADD CONSTRAINT dental_chart_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: device_tokens device_tokens_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: expense_receipts expense_receipts_tx_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_tx_id_fkey FOREIGN KEY (tx_id) REFERENCES public.transactions(id);


--
-- Name: transactions fk_transactions_invoice; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT fk_transactions_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: installments installments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.treatment_plans(id) ON DELETE CASCADE;


--
-- Name: installments installments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installments
    ADD CONSTRAINT installments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff_profiles(id);


--
-- Name: inventory inventory_merged_into_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_merged_into_fkey FOREIGN KEY (merged_into) REFERENCES public.inventory(id);


--
-- Name: inventory_meta inventory_meta_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_meta
    ADD CONSTRAINT inventory_meta_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id);


--
-- Name: inventory_movements inventory_movements_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.inventory(id);


--
-- Name: inventory_movements inventory_movements_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: inventory_movements inventory_movements_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: inventory_movements inventory_movements_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.treatment_catalog(id);


--
-- Name: inventory_purchase_meta inventory_purchase_meta_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_purchase_meta
    ADD CONSTRAINT inventory_purchase_meta_movement_id_fkey FOREIGN KEY (movement_id) REFERENCES public.inventory_movements(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoice_items invoice_items_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.treatment_catalog(id);


--
-- Name: invoices invoices_clinical_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_clinical_visit_id_fkey FOREIGN KEY (clinical_visit_id) REFERENCES public.clinical_visits(id);


--
-- Name: invoices invoices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: invoices invoices_patient_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_treatment_id_fkey FOREIGN KEY (patient_treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: lab_cases lab_cases_clinical_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_cases
    ADD CONSTRAINT lab_cases_clinical_visit_id_fkey FOREIGN KEY (clinical_visit_id) REFERENCES public.clinical_visits(id);


--
-- Name: lab_cases lab_cases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_cases
    ADD CONSTRAINT lab_cases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff_profiles(id);


--
-- Name: lab_cases lab_cases_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_cases
    ADD CONSTRAINT lab_cases_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id) ON DELETE SET NULL;


--
-- Name: lab_cases lab_cases_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_cases
    ADD CONSTRAINT lab_cases_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: loyalty_devices loyalty_devices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_devices
    ADD CONSTRAINT loyalty_devices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: loyalty_signups loyalty_signups_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_signups
    ADD CONSTRAINT loyalty_signups_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: loyalty_stamps loyalty_stamps_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_stamps
    ADD CONSTRAINT loyalty_stamps_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: loyalty_unlocks loyalty_unlocks_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_unlocks
    ADD CONSTRAINT loyalty_unlocks_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: loyalty_unlocks loyalty_unlocks_reward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_unlocks
    ADD CONSTRAINT loyalty_unlocks_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.loyalty_rewards(id);


--
-- Name: notify_log notify_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notify_log
    ADD CONSTRAINT notify_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_history patient_history_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_history
    ADD CONSTRAINT patient_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_history patient_history_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_history
    ADD CONSTRAINT patient_history_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.staff_profiles(id);


--
-- Name: patient_photos patient_photos_clinical_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_photos
    ADD CONSTRAINT patient_photos_clinical_visit_id_fkey FOREIGN KEY (clinical_visit_id) REFERENCES public.clinical_visits(id);


--
-- Name: patient_photos patient_photos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_photos
    ADD CONSTRAINT patient_photos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff_profiles(id);


--
-- Name: patient_photos patient_photos_lab_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_photos
    ADD CONSTRAINT patient_photos_lab_case_id_fkey FOREIGN KEY (lab_case_id) REFERENCES public.lab_cases(id);


--
-- Name: patient_photos patient_photos_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_photos
    ADD CONSTRAINT patient_photos_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_photos patient_photos_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_photos
    ADD CONSTRAINT patient_photos_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.patient_treatments(id);


--
-- Name: patient_photos patient_photos_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_photos
    ADD CONSTRAINT patient_photos_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visit_notes(id);


