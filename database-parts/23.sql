SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: idx_scratch_cards_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scratch_cards_patient ON public.scratch_cards USING btree (patient_id);


--
-- Name: idx_services_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_department ON public.services USING btree (department);


--
-- Name: idx_share_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_share_patient ON public.share_links USING btree (patient_id);


--
-- Name: idx_staff_ledger_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_ledger_staff ON public.staff_ledger USING btree (staff_id, entry_date DESC, created_at DESC);


--
-- Name: idx_staff_portal_log_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_portal_log_staff ON public.staff_portal_log USING btree (staff_id, created_at DESC);


--
-- Name: idx_stages_treatment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stages_treatment ON public.treatment_stages USING btree (treatment_id, sort_order);


--
-- Name: idx_stock_counts_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_counts_item ON public.stock_counts USING btree (inventory_id, counted_on DESC);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_date ON public.transactions USING btree (transaction_date);


--
-- Name: idx_transactions_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_doctor ON public.transactions USING btree (doctor_id, transaction_date);


--
-- Name: idx_transactions_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_due ON public.transactions USING btree (due_date) WHERE (balance_due > (0)::numeric);


--
-- Name: idx_transactions_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_invoice ON public.transactions USING btree (invoice_id) WHERE (invoice_id IS NOT NULL);


--
-- Name: idx_transactions_treating_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_treating_doctor ON public.transactions USING btree (treating_doctor, transaction_date);


--
-- Name: idx_transactions_treatment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_treatment ON public.transactions USING btree (treatment_name);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: idx_visits_next; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_next ON public.visit_notes USING btree (next_visit);


--
-- Name: idx_visits_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visits_patient ON public.visit_notes USING btree (patient_id);


--
-- Name: uq_appt_clinical_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_appt_clinical_visit ON public.appointments USING btree (clinical_visit_id) WHERE (clinical_visit_id IS NOT NULL);


--
-- Name: uq_appt_visit; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_appt_visit ON public.appointments USING btree (visit_id) WHERE (visit_id IS NOT NULL);


--
-- Name: uq_att_req_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_att_req_pending ON public.attendance_requests USING btree (staff_id, att_date, kind) WHERE (status = 'pending'::text);


--
-- Name: uq_catalog_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_catalog_name ON public.treatment_catalog USING btree (lower(btrim(name)));


--
-- Name: uq_clinic_options; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_clinic_options ON public.clinic_options USING btree (kind, lower(btrim(label)));


--
-- Name: uq_expense_budget_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_expense_budget_cat ON public.expense_budgets USING btree (lower(btrim(category)));


--
-- Name: uq_expense_category_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_expense_category_name ON public.expense_categories USING btree (lower(btrim(name)));


--
-- Name: uq_invoices_verify; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_invoices_verify ON public.invoices USING btree (verify_code);


--
-- Name: uq_loyalty_signup_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_loyalty_signup_pending ON public.loyalty_signups USING btree (phone_digits) WHERE (status = 'pending'::text);


--
-- Name: uq_loyalty_stamp_day; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_loyalty_stamp_day ON public.loyalty_stamps USING btree (patient_id, stamp_date) WHERE (voided_at IS NULL);


--
-- Name: uq_medicine; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_medicine ON public.medicines USING btree (category, lower(btrim(name)), COALESCE(lower(strength), ''::text), COALESCE(lower(potency), ''::text));


--
-- Name: uq_plan_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_plan_one_active ON public.payment_plans USING btree (patient_treatment_id) WHERE (status = 'active'::text);


--
-- Name: uq_prescriptions_verify; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_prescriptions_verify ON public.prescriptions USING btree (verify_code);


--
-- Name: uq_staff_members_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_staff_members_profile ON public.staff_members USING btree (profile_id) WHERE (profile_id IS NOT NULL);


--
-- Name: uq_staff_salary_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_staff_salary_period ON public.staff_ledger USING btree (staff_id, period) WHERE (kind = 'salary_due'::text);


--
-- Name: uq_transactions_idem; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_transactions_idem ON public.transactions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: uq_visit_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_visit_key ON public.visit_notes USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: uq_visit_treatment_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_visit_treatment_no ON public.visit_notes USING btree (treatment_id, visit_no) WHERE (treatment_id IS NOT NULL);


--
-- Name: staff_attendance trg_att_lock_guard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_att_lock_guard BEFORE INSERT OR DELETE OR UPDATE ON public.staff_attendance FOR EACH ROW EXECUTE FUNCTION public._att_lock_guard();


--
-- Name: attendance_requests trg_audit_attendance_requests; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_attendance_requests AFTER INSERT OR DELETE OR UPDATE ON public.attendance_requests FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: clinic_days trg_audit_clinic_days; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_clinic_days AFTER INSERT OR DELETE OR UPDATE ON public.clinic_days FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: clinical_visits trg_audit_clinical_visits; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_clinical_visits AFTER INSERT OR DELETE OR UPDATE ON public.clinical_visits FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: day_closings trg_audit_day_closings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_day_closings AFTER INSERT ON public.day_closings FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: expense_budgets trg_audit_expense_budgets; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_expense_budgets AFTER INSERT OR DELETE OR UPDATE ON public.expense_budgets FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: expense_categories trg_audit_expense_categories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_expense_categories AFTER INSERT OR DELETE OR UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: installments trg_audit_installments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_installments AFTER INSERT OR DELETE OR UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: inventory trg_audit_inventory; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_inventory AFTER INSERT OR DELETE OR UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: inventory_meta trg_audit_inventory_meta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_inventory_meta AFTER INSERT OR DELETE OR UPDATE ON public.inventory_meta FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: invoice_counter trg_audit_invoice_counter; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_invoice_counter AFTER INSERT OR DELETE OR UPDATE ON public.invoice_counter FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: invoice_items trg_audit_invoice_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_invoice_items AFTER INSERT OR DELETE OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: invoices trg_audit_invoices; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_invoices AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: lab_cases trg_audit_lab_cases; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_lab_cases AFTER INSERT OR DELETE OR UPDATE ON public.lab_cases FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: labs trg_audit_labs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_labs AFTER INSERT OR DELETE OR UPDATE ON public.labs FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: audit_log trg_audit_log_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_log_immutable BEFORE DELETE OR UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();


--
-- Name: loyalty_program trg_audit_loyalty_program; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_loyalty_program AFTER INSERT OR DELETE OR UPDATE ON public.loyalty_program FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: loyalty_rewards trg_audit_loyalty_rewards; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_loyalty_rewards AFTER INSERT OR DELETE OR UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: loyalty_stamps trg_audit_loyalty_stamps; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_loyalty_stamps AFTER INSERT OR DELETE OR UPDATE ON public.loyalty_stamps FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: loyalty_unlocks trg_audit_loyalty_unlocks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_loyalty_unlocks AFTER INSERT OR DELETE OR UPDATE ON public.loyalty_unlocks FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


--
-- Name: medicines trg_audit_medicines; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_medicines AFTER INSERT OR DELETE OR UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();


