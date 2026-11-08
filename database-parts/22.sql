SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: idx_cv_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cv_patient ON public.clinical_visits USING btree (patient_id, visit_date DESC);


--
-- Name: idx_dental_chart_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dental_chart_patient ON public.dental_chart USING btree (patient_id);


--
-- Name: idx_device_tokens_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_tokens_patient ON public.device_tokens USING btree (patient_id) WHERE (patient_id IS NOT NULL);


--
-- Name: idx_device_tokens_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_tokens_staff ON public.device_tokens USING btree (staff_id) WHERE (staff_id IS NOT NULL);


--
-- Name: idx_dlog_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dlog_created ON public.discount_log USING btree (created_at DESC);


--
-- Name: idx_doctors_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctors_home ON public.doctors USING btree (sort_order) WHERE (show_on_home = true);


--
-- Name: idx_episodes_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_episodes_cleanup ON public.treatment_episodes USING btree (completed_on) WHERE (photos_cleared_at IS NULL);


--
-- Name: idx_episodes_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_episodes_patient ON public.treatment_episodes USING btree (patient_id, completed_on DESC);


--
-- Name: idx_history_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_patient ON public.patient_history USING btree (patient_id);


--
-- Name: idx_inst_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inst_due ON public.installments USING btree (due_date);


--
-- Name: idx_inst_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inst_plan ON public.installments USING btree (plan_id);


--
-- Name: idx_inv_cv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_cv ON public.invoices USING btree (clinical_visit_id) WHERE (clinical_visit_id IS NOT NULL);


--
-- Name: idx_inv_mov_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_mov_batch ON public.inventory_movements USING btree (batch_key) WHERE (batch_key IS NOT NULL);


--
-- Name: idx_inv_mov_inv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_mov_inv ON public.inventory_movements USING btree (invoice_id) WHERE (invoice_id IS NOT NULL);


--
-- Name: idx_inv_mov_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_mov_item ON public.inventory_movements USING btree (inventory_id, created_at DESC);


--
-- Name: idx_inv_treatment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inv_treatment ON public.invoices USING btree (patient_treatment_id);


--
-- Name: idx_inventory_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_category ON public.inventory USING btree (category);


--
-- Name: idx_invoice_items_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items USING btree (invoice_id);


--
-- Name: idx_invoices_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_date ON public.invoices USING btree (invoice_date DESC);


--
-- Name: idx_invoices_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_patient ON public.invoices USING btree (patient_id, invoice_date DESC);


--
-- Name: idx_lab_cases_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_cases_due ON public.lab_cases USING btree (due_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_lab_cases_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_cases_patient ON public.lab_cases USING btree (patient_id);


--
-- Name: idx_lab_cases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_cases_status ON public.lab_cases USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_loyalty_scan_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_scan_log ON public.loyalty_scan_log USING btree (key, created_at DESC);


--
-- Name: idx_loyalty_stamps_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_stamps_date ON public.loyalty_stamps USING btree (stamp_date DESC);


--
-- Name: idx_loyalty_stamps_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_stamps_patient ON public.loyalty_stamps USING btree (patient_id, cycle);


--
-- Name: idx_loyalty_unlocks_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_unlocks_patient ON public.loyalty_unlocks USING btree (patient_id);


--
-- Name: idx_medicine_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medicine_search ON public.medicines USING gin (name gin_trgm_ops);


--
-- Name: idx_patient_photos_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_photos_patient ON public.patient_photos USING btree (patient_id, taken_on);


--
-- Name: idx_patients_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_department ON public.patients USING btree (department);


--
-- Name: idx_patients_dob; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_dob ON public.patients USING btree (date_of_birth);


--
-- Name: idx_patients_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_doctor ON public.patients USING btree (assigned_doctor);


--
-- Name: idx_patients_family; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_family ON public.patients USING btree (family_of) WHERE (family_of IS NOT NULL);


--
-- Name: idx_patients_live; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_live ON public.patients USING btree (created_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_patients_mr_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_mr_trgm ON public.patients USING gin (mr_number gin_trgm_ops);


--
-- Name: idx_patients_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_name_trgm ON public.patients USING gin (full_name gin_trgm_ops);


--
-- Name: idx_patients_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_phone ON public.patients USING btree (phone);


--
-- Name: idx_patients_phone_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_phone_trgm ON public.patients USING gin (phone gin_trgm_ops);


--
-- Name: idx_patients_portal_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_portal_code ON public.patients USING btree (portal_code) WHERE (portal_code IS NOT NULL);


--
-- Name: idx_patients_primary_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_primary_doctor ON public.patients USING btree (primary_doctor);


--
-- Name: idx_payments_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_invoice ON public.payments USING btree (invoice_id);


--
-- Name: idx_payments_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_patient ON public.payments USING btree (patient_id, paid_on DESC);


--
-- Name: idx_photos_lab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_photos_lab ON public.patient_photos USING btree (lab_case_id) WHERE (lab_case_id IS NOT NULL);


--
-- Name: idx_photos_treatment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_photos_treatment ON public.patient_photos USING btree (treatment_id) WHERE (treatment_id IS NOT NULL);


--
-- Name: idx_plan_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_patient ON public.payment_plans USING btree (patient_id);


--
-- Name: idx_plans_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_doctor ON public.treatment_plans USING btree (doctor_id);


--
-- Name: idx_plans_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_patient ON public.treatment_plans USING btree (patient_id);


--
-- Name: idx_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_status ON public.treatment_plans USING btree (status);


--
-- Name: idx_prescriptions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient ON public.prescriptions USING btree (patient_id);


--
-- Name: idx_price_history_treatment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_treatment ON public.treatment_price_history USING btree (treatment_id, changed_at DESC);


--
-- Name: idx_pt_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pt_patient ON public.patient_treatments USING btree (patient_id, status);


--
-- Name: idx_recalls_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recalls_due ON public.recalls USING btree (next_due) WHERE (status = 'active'::text);


--
-- Name: idx_recalls_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recalls_patient ON public.recalls USING btree (patient_id);


--
-- Name: idx_recalls_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_recalls_unique ON public.recalls USING btree (patient_id, recall_type) WHERE (status = 'active'::text);


--
-- Name: idx_rx_cv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rx_cv ON public.prescriptions USING btree (clinical_visit_id) WHERE (clinical_visit_id IS NOT NULL);


