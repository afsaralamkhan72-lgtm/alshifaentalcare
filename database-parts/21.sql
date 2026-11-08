SET check_function_bodies = false;
SET search_path = public, extensions;
--
-- Name: payments payments_reverses_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reverses_payment_id_key UNIQUE (reverses_payment_id);


--
-- Name: payroll_periods payroll_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (staff_id, period);


--
-- Name: permission_catalog permission_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_catalog
    ADD CONSTRAINT permission_catalog_pkey PRIMARY KEY (code);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: push_keys push_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_keys
    ADD CONSTRAINT push_keys_pkey PRIMARY KEY (id);


--
-- Name: push_subs push_subs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subs
    ADD CONSTRAINT push_subs_pkey PRIMARY KEY (endpoint);


--
-- Name: recalls recalls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recalls
    ADD CONSTRAINT recalls_pkey PRIMARY KEY (id);


--
-- Name: scratch_cards scratch_cards_patient_id_card_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_cards
    ADD CONSTRAINT scratch_cards_patient_id_card_date_key UNIQUE (patient_id, card_date);


--
-- Name: scratch_cards scratch_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_cards
    ADD CONSTRAINT scratch_cards_pkey PRIMARY KEY (id);


--
-- Name: scratch_prizes scratch_prizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scratch_prizes
    ADD CONSTRAINT scratch_prizes_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: share_links share_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_pkey PRIMARY KEY (id);


--
-- Name: share_links share_links_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.share_links
    ADD CONSTRAINT share_links_token_key UNIQUE (token);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: staff_attendance staff_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (id);


--
-- Name: staff_attendance staff_attendance_staff_id_att_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_att_date_key UNIQUE (staff_id, att_date);


--
-- Name: staff_ledger staff_ledger_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_ledger
    ADD CONSTRAINT staff_ledger_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: staff_ledger staff_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_ledger
    ADD CONSTRAINT staff_ledger_pkey PRIMARY KEY (id);


--
-- Name: staff_members staff_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_pkey PRIMARY KEY (user_id, perm_code);


--
-- Name: staff_portal_access staff_portal_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_portal_access
    ADD CONSTRAINT staff_portal_access_pkey PRIMARY KEY (staff_id);


--
-- Name: staff_portal_access staff_portal_access_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_portal_access
    ADD CONSTRAINT staff_portal_access_token_hash_key UNIQUE (token_hash);


--
-- Name: staff_portal_log staff_portal_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_portal_log
    ADD CONSTRAINT staff_portal_log_pkey PRIMARY KEY (id);


--
-- Name: staff_profiles staff_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_profiles
    ADD CONSTRAINT staff_profiles_pkey PRIMARY KEY (id);


--
-- Name: stock_counts stock_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_counts
    ADD CONSTRAINT stock_counts_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: treating_doctors treating_doctors_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treating_doctors
    ADD CONSTRAINT treating_doctors_name_key UNIQUE (name);


--
-- Name: treating_doctors treating_doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treating_doctors
    ADD CONSTRAINT treating_doctors_pkey PRIMARY KEY (id);


--
-- Name: treatment_catalog treatment_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_catalog
    ADD CONSTRAINT treatment_catalog_pkey PRIMARY KEY (id);


--
-- Name: treatment_episodes treatment_episodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_episodes
    ADD CONSTRAINT treatment_episodes_pkey PRIMARY KEY (id);


--
-- Name: treatment_materials treatment_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_materials
    ADD CONSTRAINT treatment_materials_pkey PRIMARY KEY (treatment_id, inventory_id);


--
-- Name: treatment_plans treatment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_plans
    ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);


--
-- Name: treatment_price_history treatment_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_price_history
    ADD CONSTRAINT treatment_price_history_pkey PRIMARY KEY (id);


--
-- Name: treatment_stages treatment_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatment_stages
    ADD CONSTRAINT treatment_stages_pkey PRIMARY KEY (id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: visit_notes visit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visit_notes
    ADD CONSTRAINT visit_notes_pkey PRIMARY KEY (id);


--
-- Name: idx_appointments_live; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_live ON public.appointments USING btree (preferred_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_appt_hist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appt_hist ON public.appointment_history USING btree (appointment_id, changed_at);


--
-- Name: idx_appt_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appt_patient ON public.appointments USING btree (patient_id);


--
-- Name: idx_appt_phone_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appt_phone_trgm ON public.appointments USING gin (phone gin_trgm_ops);


--
-- Name: idx_att_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_att_date ON public.staff_attendance USING btree (att_date);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_patient ON public.audit_log USING btree (patient_id) WHERE (patient_id IS NOT NULL);


--
-- Name: idx_audit_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_table ON public.audit_log USING btree (table_name, created_at DESC);


--
-- Name: idx_blog_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_chart_cv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chart_cv ON public.dental_chart USING btree (clinical_visit_id) WHERE (clinical_visit_id IS NOT NULL);


--
-- Name: idx_clinic_photos_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clinic_photos_order ON public.clinic_photos USING btree (sort_order) WHERE (is_active = true);


