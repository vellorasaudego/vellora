CREATE TABLE `admin_recovery_events` (
	`recovery_hash` text PRIMARY KEY NOT NULL,
	`admin_user_id` text NOT NULL,
	`applied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `caregiver_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`caregiver_user_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caregiver_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_assignments_patient` ON `caregiver_assignments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `idx_assignments_caregiver` ON `caregiver_assignments` (`caregiver_user_id`);--> statement-breakpoint
CREATE TABLE `caregiver_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text,
	`user_id` text,
	`name` text NOT NULL,
	`contact_email` text NOT NULL,
	`phone` text NOT NULL,
	`city` text,
	`profession` text NOT NULL,
	`coren` text,
	`experience` text,
	`availability_days` text DEFAULT '[]' NOT NULL,
	`availability_shifts` text DEFAULT '[]' NOT NULL,
	`available_from` text,
	`notes` text,
	`account_status` text DEFAULT 'aguardando_acesso' NOT NULL,
	`approved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `professional_applications`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `caregiver_profiles_application_unique` ON `caregiver_profiles` (`application_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `caregiver_profiles_user_unique` ON `caregiver_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_caregiver_profiles_status` ON `caregiver_profiles` (`account_status`,`approved_at`);--> statement-breakpoint
CREATE TABLE `contract_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`family_user_id` text,
	`caregiver_profile_id` text,
	`caregiver_user_id` text,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`storage_key` text NOT NULL,
	`uploaded_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`family_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caregiver_profile_id`) REFERENCES `caregiver_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caregiver_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "contract_documents_single_owner" CHECK(("contract_documents"."family_user_id" IS NOT NULL) + ("contract_documents"."caregiver_profile_id" IS NOT NULL) + ("contract_documents"."caregiver_user_id" IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_documents_storage_key_unique` ON `contract_documents` (`storage_key`);--> statement-breakpoint
CREATE INDEX `idx_contract_documents_family` ON `contract_documents` (`family_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_contract_documents_profile` ON `contract_documents` (`caregiver_profile_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_contract_documents_caregiver` ON `contract_documents` (`caregiver_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `daily_records` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`caregiver_user_id` text NOT NULL,
	`record_date` text NOT NULL,
	`record_time` text,
	`bp_systolic` integer,
	`bp_diastolic` integer,
	`heart_rate` integer,
	`temperature` real,
	`spo2` integer,
	`glucose` integer,
	`medications` text,
	`feeding` text,
	`hygiene` text,
	`mobility` text,
	`mood` text,
	`pain_level` integer,
	`notes` text,
	`incident` integer DEFAULT 0 NOT NULL,
	`incident_description` text,
	`photo_data` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caregiver_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_records_patient` ON `daily_records` (`patient_id`,`record_date`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_user` ON `password_reset_tokens` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_password_reset_expiry` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`birth_date` text,
	`address` text,
	`care_level` text,
	`condition_summary` text,
	`family_user_id` text,
	`status` text DEFAULT 'pendente' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`family_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `professional_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`city` text,
	`profession` text NOT NULL,
	`coren` text,
	`experience` text,
	`availability_days` text DEFAULT '[]' NOT NULL,
	`availability_shifts` text DEFAULT '[]' NOT NULL,
	`available_from` text,
	`notes` text,
	`status` text DEFAULT 'novo' NOT NULL,
	`lgpd_consent` integer DEFAULT false NOT NULL,
	`lgpd_consent_at` text,
	`privacy_notice_version` text,
	`reviewed_at` text,
	`reviewed_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_professional_applications_status` ON `professional_applications` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`phone` text,
	`session_version` integer DEFAULT 1 NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('admin','familia','cuidador'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_leads_status_created` ON `leads` (`status`,`created_at`);
