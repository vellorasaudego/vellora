PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_caregiver_profiles` (
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
INSERT INTO `__new_caregiver_profiles`("id", "application_id", "user_id", "name", "contact_email", "phone", "city", "profession", "coren", "experience", "availability_days", "availability_shifts", "available_from", "notes", "account_status", "approved_at", "created_at") SELECT "id", "application_id", "user_id", "name", "contact_email", "phone", "city", "profession", "coren", "experience", "availability_days", "availability_shifts", "available_from", "notes", "account_status", "approved_at", "created_at" FROM `caregiver_profiles`;--> statement-breakpoint
DROP TABLE `caregiver_profiles`;--> statement-breakpoint
ALTER TABLE `__new_caregiver_profiles` RENAME TO `caregiver_profiles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `caregiver_profiles_application_unique` ON `caregiver_profiles` (`application_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `caregiver_profiles_user_unique` ON `caregiver_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_caregiver_profiles_status` ON `caregiver_profiles` (`account_status`,`approved_at`);