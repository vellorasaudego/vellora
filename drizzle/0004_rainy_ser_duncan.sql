CREATE TABLE `finance_charges` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`competence_month` text NOT NULL,
	`due_date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "finance_charges_amount_positive" CHECK("finance_charges"."amount_cents" > 0),
	CONSTRAINT "finance_charges_label_nonempty" CHECK(length(trim("finance_charges"."label")) > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_finance_charges_month_due` ON `finance_charges` (`competence_month`,`due_date`);--> statement-breakpoint
CREATE TABLE `finance_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_date` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`paid_on` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "finance_expenses_amount_positive" CHECK("finance_expenses"."amount_cents" > 0),
	CONSTRAINT "finance_expenses_category_valid" CHECK("finance_expenses"."category" IN ('marketing','sistema','contabilidade','impostos','operacao','outros')),
	CONSTRAINT "finance_expenses_description_nonempty" CHECK(length(trim("finance_expenses"."description")) > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_finance_expenses_date` ON `finance_expenses` (`expense_date`);--> statement-breakpoint
CREATE INDEX `idx_finance_expenses_paid_on` ON `finance_expenses` (`paid_on`);--> statement-breakpoint
CREATE TABLE `finance_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`charge_id` text NOT NULL,
	`received_on` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`charge_id`) REFERENCES `finance_charges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "finance_receipts_amount_positive" CHECK("finance_receipts"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_finance_receipts_charge` ON `finance_receipts` (`charge_id`,`received_on`);--> statement-breakpoint
CREATE INDEX `idx_finance_receipts_date` ON `finance_receipts` (`received_on`);