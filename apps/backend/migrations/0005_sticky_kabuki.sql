PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exemplar_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`session_id` text,
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
INSERT INTO `__new_exemplar_answers`("id", "survey_id", "session_id", "slot_key", "raw_text", "extracted_value", "picked_by", "notes", "created_at") SELECT "id", "survey_id", "session_id", "slot_key", "raw_text", "extracted_value", "picked_by", "notes", "created_at" FROM `exemplar_answers`;--> statement-breakpoint
DROP TABLE `exemplar_answers`;--> statement-breakpoint
ALTER TABLE `__new_exemplar_answers` RENAME TO `exemplar_answers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;