CREATE TABLE `detail_rubrics` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`slot_key` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`criteria` text NOT NULL,
	`generated_from` text NOT NULL,
	`created_at` integer NOT NULL,
	`activated_at` integer,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `detail_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`slot_key` text NOT NULL,
	`score` real NOT NULL,
	`rubric_id` text,
	`judged_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rubric_id`) REFERENCES `detail_rubrics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exemplar_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`session_id` text NOT NULL,
	`slot_key` text NOT NULL,
	`raw_text` text NOT NULL,
	`extracted_value` text NOT NULL,
	`picked_by` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `extracted_cases` ADD `detail_scores_data` text;