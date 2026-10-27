PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_finance_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_date` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`paid_on` text,
	`caregiver_schedule_entry_id` text,
	`caregiver_user_id` text,
	`payee` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`caregiver_schedule_entry_id`) REFERENCES `caregiver_schedule_entries`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`caregiver_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "finance_expenses_amount_positive" CHECK("__new_finance_expenses"."amount_cents" > 0),
	CONSTRAINT "finance_expenses_category_valid" CHECK("__new_finance_expenses"."category" IN ('marketing','sistema','contabilidade','impostos','equipe','operacao','outros')),
	CONSTRAINT "finance_expenses_description_nonempty" CHECK(length(trim("__new_finance_expenses"."description")) > 0)
);
--> statement-breakpoint
INSERT INTO `__new_finance_expenses`("id", "expense_date", "category", "description", "amount_cents", "paid_on", "created_by", "created_at", "updated_at") SELECT "id", "expense_date", "category", "description", "amount_cents", "paid_on", "created_by", "created_at", "updated_at" FROM `finance_expenses`;--> statement-breakpoint
DROP TABLE `finance_expenses`;--> statement-breakpoint
ALTER TABLE `__new_finance_expenses` RENAME TO `finance_expenses`;--> statement-breakpoint
CREATE INDEX `idx_finance_expenses_date` ON `finance_expenses` (`expense_date`);--> statement-breakpoint
CREATE INDEX `idx_finance_expenses_paid_on` ON `finance_expenses` (`paid_on`);--> statement-breakpoint
CREATE UNIQUE INDEX `finance_expenses_schedule_entry_unique` ON `finance_expenses` (`caregiver_schedule_entry_id`);--> statement-breakpoint
CREATE TABLE `__new_caregiver_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text,
	`user_id` text,
	`name` text NOT NULL,
	`contact_email` text NOT NULL,
	`phone` text NOT NULL,
	`city` text,
	`profession` text NOT NULL,
	`weekday_shift_rate_cents` integer,
	`sunday_shift_rate_cents` integer,
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
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "caregiver_profiles_shift_rates_nonnegative" CHECK(("__new_caregiver_profiles"."weekday_shift_rate_cents" IS NULL OR "__new_caregiver_profiles"."weekday_shift_rate_cents" >= 0) AND ("__new_caregiver_profiles"."sunday_shift_rate_cents" IS NULL OR "__new_caregiver_profiles"."sunday_shift_rate_cents" >= 0))
);
--> statement-breakpoint
INSERT INTO `__new_caregiver_profiles`("id", "application_id", "user_id", "name", "contact_email", "phone", "city", "profession", "coren", "experience", "availability_days", "availability_shifts", "available_from", "notes", "account_status", "approved_at", "created_at") SELECT "id", "application_id", "user_id", "name", "contact_email", "phone", "city", "profession", "coren", "experience", "availability_days", "availability_shifts", "available_from", "notes", "account_status", "approved_at", "created_at" FROM `caregiver_profiles`;--> statement-breakpoint
DROP TABLE `caregiver_profiles`;--> statement-breakpoint
ALTER TABLE `__new_caregiver_profiles` RENAME TO `caregiver_profiles`;--> statement-breakpoint
CREATE UNIQUE INDEX `caregiver_profiles_application_unique` ON `caregiver_profiles` (`application_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `caregiver_profiles_user_unique` ON `caregiver_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_caregiver_profiles_status` ON `caregiver_profiles` (`account_status`,`approved_at`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
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
--> statement-breakpoint
CREATE TRIGGER caregiver_schedule_entries_payroll_insert
AFTER INSERT ON caregiver_schedule_entries
BEGIN
	INSERT INTO finance_expenses (
		id, expense_date, category, description, amount_cents, paid_on,
		caregiver_schedule_entry_id, caregiver_user_id, payee, created_by
	)
	SELECT
		lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
		entry.scheduled_date,
		'equipe',
		'Plantão — ' || caregiver.name,
		CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END,
		NULL, entry.id, assignment.caregiver_user_id, caregiver.name, entry.created_by
	FROM caregiver_schedule_entries AS entry
	JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
	JOIN caregiver_profiles AS caregiver ON caregiver.user_id = assignment.caregiver_user_id
	WHERE entry.id = NEW.id
		AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END > 0
	ON CONFLICT(caregiver_schedule_entry_id) DO UPDATE SET
		expense_date = excluded.expense_date,
		description = excluded.description,
		amount_cents = excluded.amount_cents,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
	DELETE FROM finance_expenses
	WHERE caregiver_schedule_entry_id = NEW.id AND paid_on IS NULL
		AND NOT EXISTS (
			SELECT 1
			FROM caregiver_schedule_entries AS entry
			JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
			JOIN caregiver_profiles AS caregiver ON caregiver.user_id = assignment.caregiver_user_id
			WHERE entry.id = NEW.id
				AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END > 0
		);
END;
--> statement-breakpoint
CREATE TRIGGER caregiver_schedule_entries_payroll_update
AFTER UPDATE OF caregiver_assignment_id, scheduled_date ON caregiver_schedule_entries
BEGIN
	INSERT INTO finance_expenses (
		id, expense_date, category, description, amount_cents, paid_on,
		caregiver_schedule_entry_id, caregiver_user_id, payee, created_by
	)
	SELECT
		lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
		entry.scheduled_date,
		'equipe',
		'Plantão — ' || caregiver.name,
		CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END,
		NULL, entry.id, assignment.caregiver_user_id, caregiver.name, entry.created_by
	FROM caregiver_schedule_entries AS entry
	JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
	JOIN caregiver_profiles AS caregiver ON caregiver.user_id = assignment.caregiver_user_id
	WHERE entry.id = NEW.id
		AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END > 0
	ON CONFLICT(caregiver_schedule_entry_id) DO UPDATE SET
		expense_date = excluded.expense_date,
		description = excluded.description,
		amount_cents = excluded.amount_cents,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
	DELETE FROM finance_expenses
	WHERE caregiver_schedule_entry_id = NEW.id AND paid_on IS NULL
		AND NOT EXISTS (
			SELECT 1
			FROM caregiver_schedule_entries AS entry
			JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
			JOIN caregiver_profiles AS caregiver ON caregiver.user_id = assignment.caregiver_user_id
			WHERE entry.id = NEW.id
				AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END > 0
		);
END;
--> statement-breakpoint
CREATE TRIGGER caregiver_schedule_entries_payroll_delete
BEFORE DELETE ON caregiver_schedule_entries
BEGIN
	DELETE FROM finance_expenses
	WHERE caregiver_schedule_entry_id = OLD.id AND paid_on IS NULL;
END;
--> statement-breakpoint
CREATE TRIGGER caregiver_profiles_payroll_insert
AFTER INSERT ON caregiver_profiles
BEGIN
	INSERT INTO finance_expenses (
		id, expense_date, category, description, amount_cents, paid_on,
		caregiver_schedule_entry_id, caregiver_user_id, payee, created_by
	)
	SELECT
		lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
		entry.scheduled_date,
		'equipe',
		'Plantão — ' || NEW.name,
		CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN NEW.sunday_shift_rate_cents ELSE NEW.weekday_shift_rate_cents END,
		NULL, entry.id, NEW.user_id, NEW.name, entry.created_by
	FROM caregiver_schedule_entries AS entry
	JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
	WHERE NEW.user_id IS NOT NULL
		AND assignment.caregiver_user_id = NEW.user_id
		AND entry.scheduled_date >= date('now', '-3 hours', 'start of month')
		AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN NEW.sunday_shift_rate_cents ELSE NEW.weekday_shift_rate_cents END > 0
	ON CONFLICT(caregiver_schedule_entry_id) DO UPDATE SET
		expense_date = excluded.expense_date,
		description = excluded.description,
		amount_cents = excluded.amount_cents,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
END;
--> statement-breakpoint
CREATE TRIGGER caregiver_profiles_payroll_update
AFTER UPDATE OF user_id, name, weekday_shift_rate_cents, sunday_shift_rate_cents ON caregiver_profiles
BEGIN
	DELETE FROM finance_expenses
	WHERE paid_on IS NULL
		AND expense_date >= date('now', '-3 hours', 'start of month')
		AND caregiver_schedule_entry_id IN (
			SELECT entry.id
			FROM caregiver_schedule_entries AS entry
			JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
			WHERE assignment.caregiver_user_id = OLD.user_id
		)
		AND NOT EXISTS (
			SELECT 1
			FROM caregiver_schedule_entries AS entry
			JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
			WHERE entry.id = finance_expenses.caregiver_schedule_entry_id
				AND assignment.caregiver_user_id = NEW.user_id
				AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN NEW.sunday_shift_rate_cents ELSE NEW.weekday_shift_rate_cents END > 0
		);
	INSERT INTO finance_expenses (
		id, expense_date, category, description, amount_cents, paid_on,
		caregiver_schedule_entry_id, caregiver_user_id, payee, created_by
	)
	SELECT
		lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
		entry.scheduled_date,
		'equipe',
		'Plantão — ' || NEW.name,
		CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN NEW.sunday_shift_rate_cents ELSE NEW.weekday_shift_rate_cents END,
		NULL, entry.id, NEW.user_id, NEW.name, entry.created_by
	FROM caregiver_schedule_entries AS entry
	JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
	WHERE NEW.user_id IS NOT NULL
		AND assignment.caregiver_user_id = NEW.user_id
		AND entry.scheduled_date >= date('now', '-3 hours', 'start of month')
		AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN NEW.sunday_shift_rate_cents ELSE NEW.weekday_shift_rate_cents END > 0
	ON CONFLICT(caregiver_schedule_entry_id) DO UPDATE SET
		expense_date = excluded.expense_date,
		description = excluded.description,
		amount_cents = excluded.amount_cents,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
END;
--> statement-breakpoint
CREATE TRIGGER caregiver_assignments_prevent_paid_payroll_change
BEFORE UPDATE OF caregiver_user_id ON caregiver_assignments
BEGIN
	SELECT RAISE(ABORT, 'PAYROLL_PAID_SCHEDULE_CONFLICT')
	WHERE NEW.caregiver_user_id <> OLD.caregiver_user_id
		AND EXISTS (
			SELECT 1
			FROM caregiver_schedule_entries AS entry
			JOIN finance_expenses AS expense ON expense.caregiver_schedule_entry_id = entry.id
			WHERE entry.caregiver_assignment_id = OLD.id AND expense.paid_on IS NOT NULL
		);
END;
--> statement-breakpoint
CREATE TRIGGER caregiver_assignments_payroll_update
AFTER UPDATE OF caregiver_user_id ON caregiver_assignments
BEGIN
	INSERT INTO finance_expenses (
		id, expense_date, category, description, amount_cents, paid_on,
		caregiver_schedule_entry_id, caregiver_user_id, payee, created_by
	)
	SELECT
		lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
		entry.scheduled_date,
		'equipe',
		'Plantão — ' || caregiver.name,
		CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END,
		NULL, entry.id, NEW.caregiver_user_id, caregiver.name, entry.created_by
	FROM caregiver_schedule_entries AS entry
	JOIN caregiver_profiles AS caregiver ON caregiver.user_id = NEW.caregiver_user_id
	WHERE entry.caregiver_assignment_id = NEW.id
		AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END > 0
	ON CONFLICT(caregiver_schedule_entry_id) DO UPDATE SET
		expense_date = excluded.expense_date,
		description = excluded.description,
		amount_cents = excluded.amount_cents,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
	DELETE FROM finance_expenses
	WHERE paid_on IS NULL
		AND caregiver_schedule_entry_id IN (
			SELECT id FROM caregiver_schedule_entries WHERE caregiver_assignment_id = NEW.id
		)
		AND NOT EXISTS (
			SELECT 1
			FROM caregiver_schedule_entries AS entry
			JOIN caregiver_profiles AS caregiver ON caregiver.user_id = NEW.caregiver_user_id
			WHERE entry.id = finance_expenses.caregiver_schedule_entry_id
				AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END > 0
		);
END;
--> statement-breakpoint
