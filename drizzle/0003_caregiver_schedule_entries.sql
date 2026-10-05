CREATE TABLE `caregiver_schedule_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`caregiver_assignment_id` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`ends_next_day` integer DEFAULT false NOT NULL,
	`profession` text NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`caregiver_assignment_id`) REFERENCES `caregiver_assignments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "caregiver_schedule_entries_profession_check" CHECK("caregiver_schedule_entries"."profession" IN ('cuidador','tecnico_enfermagem','enfermeiro','outros')),
	CONSTRAINT "caregiver_schedule_entries_time_order" CHECK(("caregiver_schedule_entries"."ends_next_day" = 0 AND "caregiver_schedule_entries"."end_time" > "caregiver_schedule_entries"."start_time") OR ("caregiver_schedule_entries"."ends_next_day" = 1 AND "caregiver_schedule_entries"."end_time" <= "caregiver_schedule_entries"."start_time"))
);
--> statement-breakpoint
CREATE INDEX `idx_schedule_assignment_date` ON `caregiver_schedule_entries` (`caregiver_assignment_id`,`scheduled_date`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_schedule_date_assignment` ON `caregiver_schedule_entries` (`scheduled_date`,`caregiver_assignment_id`);--> statement-breakpoint
CREATE TRIGGER `caregiver_schedule_entries_no_overlap_insert`
BEFORE INSERT ON `caregiver_schedule_entries`
WHEN EXISTS (
	SELECT 1
	FROM `caregiver_schedule_entries` AS existing_entry
	JOIN `caregiver_assignments` AS existing_assignment
		ON existing_assignment.`id` = existing_entry.`caregiver_assignment_id`
	JOIN `caregiver_assignments` AS new_assignment
		ON new_assignment.`id` = NEW.`caregiver_assignment_id`
	WHERE existing_entry.`id` <> NEW.`id`
		AND existing_assignment.`caregiver_user_id` = new_assignment.`caregiver_user_id`
		AND datetime(existing_entry.`scheduled_date` || ' ' || existing_entry.`start_time`)
			< datetime(NEW.`scheduled_date` || ' ' || NEW.`end_time`,
				CASE WHEN NEW.`ends_next_day` = 1 THEN '+1 day' ELSE '+0 day' END)
		AND datetime(NEW.`scheduled_date` || ' ' || NEW.`start_time`)
			< datetime(existing_entry.`scheduled_date` || ' ' || existing_entry.`end_time`,
				CASE WHEN existing_entry.`ends_next_day` = 1 THEN '+1 day' ELSE '+0 day' END)
)
BEGIN
	SELECT RAISE(ABORT, 'SCHEDULE_OVERLAP_CONFLICT');
END;--> statement-breakpoint
CREATE TRIGGER `caregiver_schedule_entries_no_overlap_update`
BEFORE UPDATE OF `caregiver_assignment_id`, `scheduled_date`, `start_time`, `end_time`, `ends_next_day`
ON `caregiver_schedule_entries`
WHEN EXISTS (
	SELECT 1
	FROM `caregiver_schedule_entries` AS existing_entry
	JOIN `caregiver_assignments` AS existing_assignment
		ON existing_assignment.`id` = existing_entry.`caregiver_assignment_id`
	JOIN `caregiver_assignments` AS new_assignment
		ON new_assignment.`id` = NEW.`caregiver_assignment_id`
	WHERE existing_entry.`id` <> NEW.`id`
		AND existing_assignment.`caregiver_user_id` = new_assignment.`caregiver_user_id`
		AND datetime(existing_entry.`scheduled_date` || ' ' || existing_entry.`start_time`)
			< datetime(NEW.`scheduled_date` || ' ' || NEW.`end_time`,
				CASE WHEN NEW.`ends_next_day` = 1 THEN '+1 day' ELSE '+0 day' END)
		AND datetime(NEW.`scheduled_date` || ' ' || NEW.`start_time`)
			< datetime(existing_entry.`scheduled_date` || ' ' || existing_entry.`end_time`,
				CASE WHEN existing_entry.`ends_next_day` = 1 THEN '+1 day' ELSE '+0 day' END)
)
BEGIN
	SELECT RAISE(ABORT, 'SCHEDULE_OVERLAP_CONFLICT');
END;
