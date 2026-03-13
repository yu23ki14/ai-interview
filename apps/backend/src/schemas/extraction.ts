import { z } from "zod";

export const turnExtractionSchema = z.object({
	facts: z
		.object({
			case_type: z.enum(["victim", "near_miss", "unclear"]).nullable().optional(),
			severity_level: z.string().nullable().optional(),
			incident_summary: z.string().nullable().optional(),
			first_touch_channel: z.string().nullable().optional(),
			first_touch_platform: z.string().nullable().optional(),
			was_ad: z.boolean().nullable().optional(),
			ad_format: z.string().nullable().optional(),
			ad_platform: z.string().nullable().optional(),
			ad_claim_type: z.array(z.string()).optional(),
			claimed_role: z.array(z.string()).optional(),
			claimed_affiliation: z.array(z.string()).optional(),
			trust_signal: z.array(z.string()).optional(),
			identity_verification_claim: z.array(z.string()).optional(),
			moved_to_external_channel: z.boolean().nullable().optional(),
			external_channels: z.array(z.string()).optional(),
			asked_for_payment: z.boolean().nullable().optional(),
			asked_for_registration: z.boolean().nullable().optional(),
			asked_for_id_submission: z.boolean().nullable().optional(),
			asked_for_app_install: z.boolean().nullable().optional(),
			asked_for_remote_control: z.boolean().nullable().optional(),
			asked_for_crypto_transfer: z.boolean().nullable().optional(),
			asked_for_bank_transfer: z.boolean().nullable().optional(),
			money_sent: z.boolean().nullable().optional(),
			estimated_amount_jpy: z.number().nullable().optional(),
			non_monetary_harm: z.array(z.string()).optional(),
			attempt_stopped_before_payment: z.boolean().nullable().optional(),
			felt_in_danger: z.boolean().nullable().optional(),
			why_it_felt_believable: z.array(z.string()).optional(),
			warning_signs_noticed: z.array(z.string()).optional(),
			why_warning_signs_did_not_stop_action: z.array(z.string()).optional(),
			emotions_during: z.array(z.string()).optional(),
			emotions_after: z.array(z.string()).optional(),
			has_screenshot: z.boolean().nullable().optional(),
			has_chat_log: z.boolean().nullable().optional(),
			has_transfer_record: z.boolean().nullable().optional(),
			has_ad_image_or_url: z.boolean().nullable().optional(),
			has_account_identifier: z.boolean().nullable().optional(),
			what_platform_design_might_have_helped: z.array(z.string()).optional(),
			what_public_warning_might_have_helped: z.array(z.string()).optional(),
			what_information_or_support_might_have_helped: z.array(z.string()).optional(),
			what_should_be_improved_first: z.array(z.string()).optional(),
		})
		.optional(),
	timeline_events: z
		.array(
			z.object({
				description: z.string(),
				order: z.number().optional(),
			}),
		)
		.optional(),
	psychology_signals: z
		.object({
			burden_level: z.number().min(0).max(3).optional(),
			stop_intent: z.boolean().optional(),
			risk_level: z.enum(["none", "low", "medium", "high"]).optional(),
		})
		.optional(),
	pii_detected: z.boolean().optional(),
	secret_detected: z.boolean().optional(),
	uncertain_fields: z.array(z.string()).optional(),
});

export type TurnExtraction = z.infer<typeof turnExtractionSchema>;
