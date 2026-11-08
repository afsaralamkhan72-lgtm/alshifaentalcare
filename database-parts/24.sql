SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: patient_treatments trg_audit_patient_treatments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_patient_treatments AFTER INSERT OR DELETE OR UPDATE ON public.patient_treatments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: patients trg_audit_patients; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_patients AFTER INSERT OR DELETE OR UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: payment_plans trg_audit_payment_plans; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_payment_plans AFTER INSERT OR DELETE OR UPDATE ON public.payment_plans FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: payments trg_audit_payments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: prescriptions trg_audit_prescriptions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_prescriptions AFTER INSERT OR DELETE OR UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: staff_attendance trg_audit_staff_attendance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_staff_attendance AFTER INSERT OR DELETE OR UPDATE ON public.staff_attendance FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: staff_members trg_audit_staff_members; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_staff_members AFTER INSERT OR DELETE OR UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: staff_permissions trg_audit_staff_permissions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_staff_permissions AFTER INSERT OR DELETE OR UPDATE ON public.staff_permissions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: staff_profiles trg_audit_staff_profiles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_staff_profiles AFTER INSERT OR DELETE OR UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: transactions trg_audit_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_transactions AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: treating_doctors trg_audit_treating_doctors; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_treating_doctors AFTER INSERT OR DELETE OR UPDATE ON public.treating_doctors FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: treatment_catalog trg_audit_treatment_catalog; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_treatment_catalog AFTER INSERT OR DELETE OR UPDATE ON public.treatment_catalog FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: treatment_episodes trg_audit_treatment_episodes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_treatment_episodes AFTER INSERT OR DELETE OR UPDATE ON public.treatment_episodes FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: treatment_materials trg_audit_treatment_materials; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_treatment_materials AFTER INSERT OR DELETE OR UPDATE ON public.treatment_materials FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: treatment_plans trg_audit_treatment_plans; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_treatment_plans AFTER INSERT OR DELETE OR UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: treatment_stages trg_audit_treatment_stages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_treatment_stages AFTER INSERT OR DELETE OR UPDATE ON public.treatment_stages FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: visit_notes trg_audit_visit_notes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_visit_notes AFTER INSERT OR DELETE OR UPDATE ON public.visit_notes FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: patients trg_block_patient_hard_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_block_patient_hard_delete BEFORE DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.block_patient_hard_delete();


--
-- Name: clinical_visits trg_cv_finish_close_appt; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cv_finish_close_appt AFTER INSERT OR UPDATE OF status ON public.clinical_visits FOR EACH ROW EXECUTE FUNCTION public._cv_finish_close_appt();


--
-- Name: day_closings trg_day_closings_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_day_closings_immutable BEFORE DELETE OR UPDATE ON public.day_closings FOR EACH ROW EXECUTE FUNCTION public.day_closings_immutable();


--
-- Name: patients trg_generate_mr_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_mr_number BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.generate_mr_number();


--
-- Name: invoice_items trg_guard_insert_invoice_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_insert_invoice_items BEFORE INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_insert();


--
-- Name: invoices trg_guard_insert_invoices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_insert_invoices BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_insert();


--
-- Name: payments trg_guard_insert_payments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_insert_payments BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_insert();


--
-- Name: inventory trg_guard_inventory_quantity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_inventory_quantity BEFORE INSERT OR UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.guard_inventory_quantity();


--
-- Name: invoices trg_guard_invoice_row; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_invoice_row BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_row();


--
-- Name: transactions trg_guard_invoice_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_invoice_transactions BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_transactions();


--
-- Name: lab_cases trg_guard_lab_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_lab_delete BEFORE DELETE OR UPDATE ON public.lab_cases FOR EACH ROW EXECUTE FUNCTION public.guard_lab_delete();


--
-- Name: lab_cases trg_guard_lab_money; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_lab_money BEFORE INSERT OR UPDATE ON public.lab_cases FOR EACH ROW EXECUTE FUNCTION public.guard_lab_money();


--
-- Name: lab_cases trg_guard_lab_patient; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_lab_patient BEFORE INSERT ON public.lab_cases FOR EACH ROW EXECUTE FUNCTION public.guard_lab_patient();


--
-- Name: patients trg_guard_patient_soft_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_patient_soft_delete BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.guard_patient_soft_delete();


--
-- Name: appointments trg_guard_public_booking; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_public_booking BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.guard_public_booking();


--
-- Name: staff_profiles trg_guard_staff_profile; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_staff_profile BEFORE DELETE OR UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_staff_profile();


--
-- Name: visit_notes trg_guard_visit_note; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_visit_note BEFORE UPDATE ON public.visit_notes FOR EACH ROW EXECUTE FUNCTION public.guard_visit_note();


--
-- Name: inventory_movements trg_inv_mov_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inv_mov_immutable BEFORE DELETE OR UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.inventory_movements_immutable();


--
-- Name: lab_cases trg_lab_case_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_lab_case_number BEFORE INSERT ON public.lab_cases FOR EACH ROW EXECUTE FUNCTION public.set_lab_case_number();


--
-- Name: dental_chart trg_link_cv_chart; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_link_cv_chart BEFORE INSERT ON public.dental_chart FOR EACH ROW EXECUTE FUNCTION public.link_to_clinical_visit();


--
-- Name: invoices trg_link_cv_invoices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_link_cv_invoices BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.link_to_clinical_visit();


--
-- Name: lab_cases trg_link_cv_lab; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_link_cv_lab BEFORE INSERT ON public.lab_cases FOR EACH ROW EXECUTE FUNCTION public.link_to_clinical_visit();


--
-- Name: patient_photos trg_link_cv_photos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_link_cv_photos BEFORE INSERT ON public.patient_photos FOR EACH ROW EXECUTE FUNCTION public.link_to_clinical_visit();


--
-- Name: prescriptions trg_link_cv_rx; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_link_cv_rx BEFORE INSERT ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.link_to_clinical_visit();


--
-- Name: visit_notes trg_link_cv_visit_notes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_link_cv_visit_notes BEFORE INSERT ON public.visit_notes FOR EACH ROW EXECUTE FUNCTION public.link_to_clinical_visit();


--
-- Name: appointments trg_log_appointment_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_appointment_change AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.log_appointment_change();


--
-- Name: invoices trg_log_invoice_discount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_invoice_discount AFTER INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public._log_invoice_discount();


--
-- Name: patient_treatments trg_log_treatment_discount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_treatment_discount AFTER INSERT OR UPDATE OF price ON public.patient_treatments FOR EACH ROW EXECUTE FUNCTION public._log_treatment_discount();


--
-- Name: payroll_periods trg_payroll_periods_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_payroll_periods_guard BEFORE DELETE OR UPDATE ON public.payroll_periods FOR EACH ROW EXECUTE FUNCTION public._payroll_periods_guard();


--
-- Name: treatment_catalog trg_price_history_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_price_history_ins AFTER INSERT ON public.treatment_catalog FOR EACH ROW EXECUTE FUNCTION public.log_price_change();


--
-- Name: treatment_catalog trg_price_history_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_price_history_upd BEFORE UPDATE ON public.treatment_catalog FOR EACH ROW EXECUTE FUNCTION public.log_price_change_upd();


--
-- Name: payments trg_push_on_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_push_on_payment AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.push_on_payment();


--
-- Name: patients trg_set_portal_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_portal_code BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_portal_code();


--
-- Name: staff_ledger trg_staff_ledger_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_staff_ledger_guard BEFORE DELETE OR UPDATE ON public.staff_ledger FOR EACH ROW EXECUTE FUNCTION public.staff_ledger_guard();


--
-- Name: staff_portal_log trg_staff_portal_log_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_staff_portal_log_immutable BEFORE DELETE OR UPDATE ON public.staff_portal_log FOR EACH ROW EXECUTE FUNCTION public.staff_portal_log_immutable();


--
-- Name: medicines trg_touch_medicine; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_medicine BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.touch_medicine();


--
-- Name: patient_history trg_touch_patient_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_touch_patient_history BEFORE UPDATE ON public.patient_history FOR EACH ROW EXECUTE FUNCTION public.touch_patient_history();


--
-- Name: appointment_history appointment_history_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


