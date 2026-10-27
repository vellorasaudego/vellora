ALTER TABLE `finance_expenses` ADD `caregiver_payroll_amount_overridden` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_finance_expenses_caregiver_user` ON `finance_expenses` (`caregiver_user_id`);--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_schedule_entries_payroll_insert;--> statement-breakpoint
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
		amount_cents = CASE WHEN finance_expenses.caregiver_payroll_amount_overridden THEN finance_expenses.amount_cents ELSE excluded.amount_cents END,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
	DELETE FROM finance_expenses
	WHERE caregiver_schedule_entry_id = NEW.id AND paid_on IS NULL AND caregiver_payroll_amount_overridden = 0
		AND NOT EXISTS (
			SELECT 1
			FROM caregiver_schedule_entries AS entry
			JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
			JOIN caregiver_profiles AS caregiver ON caregiver.user_id = assignment.caregiver_user_id
			WHERE entry.id = NEW.id
				AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END > 0
		);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_schedule_entries_payroll_update;--> statement-breakpoint
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
		amount_cents = CASE WHEN finance_expenses.caregiver_payroll_amount_overridden THEN finance_expenses.amount_cents ELSE excluded.amount_cents END,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
	DELETE FROM finance_expenses
	WHERE caregiver_schedule_entry_id = NEW.id AND paid_on IS NULL AND caregiver_payroll_amount_overridden = 0
		AND NOT EXISTS (
			SELECT 1
			FROM caregiver_schedule_entries AS entry
			JOIN caregiver_assignments AS assignment ON assignment.id = entry.caregiver_assignment_id
			JOIN caregiver_profiles AS caregiver ON caregiver.user_id = assignment.caregiver_user_id
			WHERE entry.id = NEW.id
				AND CASE WHEN strftime('%w', entry.scheduled_date) = '0' THEN caregiver.sunday_shift_rate_cents ELSE caregiver.weekday_shift_rate_cents END > 0
		);
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_profiles_payroll_insert;--> statement-breakpoint
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
		amount_cents = CASE WHEN finance_expenses.caregiver_payroll_amount_overridden THEN finance_expenses.amount_cents ELSE excluded.amount_cents END,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
END;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_profiles_payroll_update;--> statement-breakpoint
CREATE TRIGGER caregiver_profiles_payroll_update
AFTER UPDATE OF user_id, name, weekday_shift_rate_cents, sunday_shift_rate_cents ON caregiver_profiles
BEGIN
	DELETE FROM finance_expenses
	WHERE paid_on IS NULL
		AND expense_date >= date('now', '-3 hours', 'start of month')
		AND caregiver_payroll_amount_overridden = 0
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
		amount_cents = CASE WHEN finance_expenses.caregiver_payroll_amount_overridden THEN finance_expenses.amount_cents ELSE excluded.amount_cents END,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
END;--> statement-breakpoint
UPDATE caregiver_profiles
SET weekday_shift_rate_cents = COALESCE(weekday_shift_rate_cents, sunday_shift_rate_cents),
	sunday_shift_rate_cents = COALESCE(weekday_shift_rate_cents, sunday_shift_rate_cents)
WHERE weekday_shift_rate_cents IS NOT sunday_shift_rate_cents;--> statement-breakpoint
DROP TRIGGER IF EXISTS caregiver_assignments_payroll_update;--> statement-breakpoint
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
		amount_cents = CASE WHEN finance_expenses.caregiver_payroll_amount_overridden THEN finance_expenses.amount_cents ELSE excluded.amount_cents END,
		caregiver_user_id = excluded.caregiver_user_id,
		payee = excluded.payee,
		updated_at = CURRENT_TIMESTAMP
	WHERE finance_expenses.paid_on IS NULL;
	DELETE FROM finance_expenses
	WHERE paid_on IS NULL
		AND caregiver_payroll_amount_overridden = 0
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
