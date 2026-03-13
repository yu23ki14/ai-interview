CREATE TABLE `extracted_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`case_type` text,
	`severity_level` text,
	`incident_summary` text,
	`entry_point` text,
	`actor_profile` text,
	`interaction_flow` text,
	`harm_outcome` text,
	`psychology` text,
	`evidence` text,
	`prevention_signal` text,
	`safety_meta` text,
	`quality_meta` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `extracted_cases_session_id_unique` ON `extracted_cases` (`session_id`);--> statement-breakpoint
CREATE TABLE `interview_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`stage` text DEFAULT 'intro' NOT NULL,
	`completion_score` real DEFAULT 0 NOT NULL,
	`consent_given` integer DEFAULT false NOT NULL,
	`burden_level` integer DEFAULT 0 NOT NULL,
	`risk_level` text DEFAULT 'none' NOT NULL,
	`current_slot` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`theme` text NOT NULL,
	`estimated_minutes` integer DEFAULT 10 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`turn_index` integer NOT NULL,
	`speaker` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
