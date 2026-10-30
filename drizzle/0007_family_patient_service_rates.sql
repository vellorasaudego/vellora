CREATE TABLE `family_patient_service_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`family_user_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`profession` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`family_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "family_patient_service_rates_profession_check" CHECK("family_patient_service_rates"."profession" IN ('cuidador','tecnico_enfermagem','enfermeiro','outros')),
	CONSTRAINT "family_patient_service_rates_amount_check" CHECK("family_patient_service_rates"."amount_cents" > 0 AND "family_patient_service_rates"."amount_cents" <= 100000000),
	CONSTRAINT "family_patient_service_rates_valid_dates_check" CHECK("family_patient_service_rates"."valid_to" IS NULL OR "family_patient_service_rates"."valid_to" >= "family_patient_service_rates"."valid_from")
);
--> statement-breakpoint
CREATE INDEX `idx_family_patient_service_rates_lookup` ON `family_patient_service_rates` (`family_user_id`,`patient_id`,`profession`,`valid_from`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_caregiver_schedule_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`caregiver_assignment_id` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`ends_next_day` integer DEFAULT false NOT NULL,
	`profession` text NOT NULL,
	`payroll_rate_status` text DEFAULT 'valor_pendente' NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`caregiver_assignment_id`) REFERENCES `caregiver_assignments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "caregiver_schedule_entries_profession_check" CHECK("__new_caregiver_schedule_entries"."profession" IN ('cuidador','tecnico_enfermagem','enfermeiro','outros')),
	CONSTRAINT "caregiver_schedule_entries_payroll_rate_status_check" CHECK("__new_caregiver_schedule_entries"."payroll_rate_status" IN ('valor_pendente','gerado')),
	CONSTRAINT "caregiver_schedule_entries_time_order" CHECK(("__new_caregiver_schedule_entries"."ends_next_day" = 0 AND "__new_caregiver_schedule_entries"."end_time" > "__new_caregiver_schedule_entries"."start_time") OR ("__new_caregiver_schedule_entries"."ends_next_day" = 1 AND "__new_caregiver_schedule_entries"."end_time" <= "__new_caregiver_schedule_entries"."start_time"))
);
--> statement-breakpoint
INSERT INTO `__new_caregiver_schedule_entries`("id", "caregiver_assignment_id", "scheduled_date", "start_time", "end_time", "ends_next_day", "profession", "payroll_rate_status", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "caregiver_assignment_id", "scheduled_date", "start_time", "end_time", "ends_next_day", "profession", 'valor_pendente', "created_by", "updated_by", "created_at", "updated_at" FROM `caregiver_schedule_entries`;--> statement-breakpoint
DROP TABLE `caregiver_schedule_entries`;--> statement-breakpoint
ALTER TABLE `__new_caregiver_schedule_entries` RENAME TO `caregiver_schedule_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_schedule_assignment_date` ON `caregiver_schedule_entries` (`caregiver_assignment_id`,`scheduled_date`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_schedule_date_assignment` ON `caregiver_schedule_entries` (`scheduled_date`,`caregiver_assignment_id`);--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_schedule_entries_payroll_insert;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_schedule_entries_payroll_update;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_schedule_entries_payroll_delete;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_profiles_payroll_insert;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_profiles_payroll_update;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_assignments_payroll_update;--> statement-breakpoint
CREATE TRIGGER family_patient_service_rates_validate_insert
BEFORE INSERT ON family_patient_service_rates
WHEN NOT EXISTS (
	SELECT 1 FROM patients AS patient
	JOIN users AS family ON family.id = patient.family_user_id
	WHERE patient.id = NEW.patient_id
		AND patient.family_user_id = NEW.family_user_id
		AND family.role = 'familia'
		AND family.deleted_at IS NULL
)
BEGIN
	SELECT RAISE(ABORT, 'RATE_FAMILY_PATIENT_MISMATCH');
END;--> statement-breakpoint
CREATE TRIGGER family_patient_service_rates_validate_update
BEFORE UPDATE ON family_patient_service_rates
WHEN NOT EXISTS (
	SELECT 1 FROM patients AS patient
	JOIN users AS family ON family.id = patient.family_user_id
	WHERE patient.id = NEW.patient_id
		AND patient.family_user_id = NEW.family_user_id
		AND family.role = 'familia'
		AND family.deleted_at IS NULL
)
BEGIN
	SELECT RAISE(ABORT, 'RATE_FAMILY_PATIENT_MISMATCH');
END;--> statement-breakpoint
CREATE TRIGGER family_patient_service_rates_overlap_insert
BEFORE INSERT ON family_patient_service_rates
WHEN EXISTS (
	SELECT 1 FROM family_patient_service_rates AS existing
	WHERE existing.family_user_id = NEW.family_user_id
		AND existing.patient_id = NEW.patient_id
		AND existing.profession = NEW.profession
		AND NEW.valid_from <= COALESCE(existing.valid_to, '9999-12-31')
		AND existing.valid_from <= COALESCE(NEW.valid_to, '9999-12-31')
)
BEGIN
	SELECT RAISE(ABORT, 'RATE_VALIDITY_OVERLAP');
END;--> statement-breakpoint
CREATE TRIGGER family_patient_service_rates_overlap_update
BEFORE UPDATE ON family_patient_service_rates
WHEN EXISTS (
	SELECT 1 FROM family_patient_service_rates AS existing
	WHERE existing.id <> NEW.id
		AND existing.family_user_id = NEW.family_user_id
		AND existing.patient_id = NEW.patient_id
		AND existing.profession = NEW.profession
		AND NEW.valid_from <= COALESCE(existing.valid_to, '9999-12-31')
		AND existing.valid_from <= COALESCE(NEW.valid_to, '9999-12-31')
)
BEGIN
	SELECT RAISE(ABORT, 'RATE_VALIDITY_OVERLAP');
END;--> statement-breakpoint
DELETE FROM finance_expenses
WHERE paid_on IS NULL
	AND caregiver_payroll_amount_overridden = 0
	AND caregiver_schedule_entry_id IN (
		SELECT id FROM caregiver_schedule_entries
		WHERE scheduled_date >= date('now', '-3 hours')
	);--> statement-breakpoint
UPDATE caregiver_schedule_entries
SET payroll_rate_status = CASE WHEN EXISTS (
	SELECT 1 FROM finance_expenses AS expense
	WHERE expense.caregiver_schedule_entry_id = caregiver_schedule_entries.id
) THEN 'gerado' ELSE 'valor_pendente' END;
--> statement-breakpoint
CREATE TRIGGER caregiver_schedule_entries_no_overlap_insert
BEFORE INSERT ON caregiver_schedule_entries
WHEN EXISTS (
	SELECT 1
	FROM caregiver_schedule_entries AS existing_entry
	JOIN caregiver_assignments AS existing_assignment
		ON existing_assignment.id = existing_entry.caregiver_assignment_id
	JOIN caregiver_assignments AS new_assignment
		ON new_assignment.id = NEW.caregiver_assignment_id
	WHERE existing_entry.id <> NEW.id
		AND existing_assignment.caregiver_user_id = new_assignment.caregiver_user_id
		AND datetime(existing_entry.scheduled_date || ' ' || existing_entry.start_time)
			< datetime(NEW.scheduled_date || ' ' || NEW.end_time,
				CASE WHEN NEW.ends_next_day = 1 THEN '+1 day' ELSE '+0 day' END)
		AND datetime(NEW.scheduled_date || ' ' || NEW.start_time)
			< datetime(existing_entry.scheduled_date || ' ' || existing_entry.end_time,
				CASE WHEN existing_entry.ends_next_day = 1 THEN '+1 day' ELSE '+0 day' END)
)
BEGIN
	SELECT RAISE(ABORT, 'SCHEDULE_OVERLAP_CONFLICT');
END;
--> statement-breakpoint
CREATE TRIGGER caregiver_schedule_entries_no_overlap_update
BEFORE UPDATE OF caregiver_assignment_id, scheduled_date, start_time, end_time, ends_next_day
ON caregiver_schedule_entries
WHEN EXISTS (
	SELECT 1
	FROM caregiver_schedule_entries AS existing_entry
	JOIN caregiver_assignments AS existing_assignment
		ON existing_assignment.id = existing_entry.caregiver_assignment_id
	JOIN caregiver_assignments AS new_assignment
		ON new_assignment.id = NEW.caregiver_assignment_id
	WHERE existing_entry.id <> NEW.id
		AND existing_assignment.caregiver_user_id = new_assignment.caregiver_user_id
		AND datetime(existing_entry.scheduled_date || ' ' || existing_entry.start_time)
			< datetime(NEW.scheduled_date || ' ' || NEW.end_time,
				CASE WHEN NEW.ends_next_day = 1 THEN '+1 day' ELSE '+0 day' END)
		AND datetime(NEW.scheduled_date || ' ' || NEW.start_time)
			< datetime(existing_entry.scheduled_date || ' ' || existing_entry.end_time,
				CASE WHEN existing_entry.ends_next_day = 1 THEN '+1 day' ELSE '+0 day' END)
)
BEGIN
	SELECT RAISE(ABORT, 'SCHEDULE_OVERLAP_CONFLICT');
END;
--> statement-breakpoint
CREATE TRIGGER caregiver_schedule_entries_prevent_paid_payroll_change
BEFORE UPDATE OF caregiver_assignment_id, scheduled_date ON caregiver_schedule_entries
BEGIN
	SELECT RAISE(ABORT, 'PAYROLL_PAID_SCHEDULE_CONFLICT')
	WHERE (NEW.caregiver_assignment_id <> OLD.caregiver_assignment_id OR NEW.scheduled_date <> OLD.scheduled_date)
		AND EXISTS (
			SELECT 1 FROM finance_expenses
			WHERE caregiver_schedule_entry_id = OLD.id AND paid_on IS NOT NULL
		);
END;
