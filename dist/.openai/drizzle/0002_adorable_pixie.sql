CREATE TABLE `daily_record_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`actor_user_id` text,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`changed_fields` text DEFAULT '[]' NOT NULL,
	`before_data` text,
	`after_data` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `daily_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "daily_record_audit_action_check" CHECK("daily_record_audit_events"."action" IN ('created','updated'))
);
--> statement-breakpoint
CREATE INDEX `idx_record_audit_record` ON `daily_record_audit_events` (`record_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_record_audit_patient` ON `daily_record_audit_events` (`patient_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `daily_records` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;