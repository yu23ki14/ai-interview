import { and, asc, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { postValidateTranscript } from "../ai/post-validator.js";
import { createAnthropicProvider } from "../ai/provider.js";
import { extractedCases, interviewSessions, transcripts } from "../db/schema.js";

/** Maximum sessions to process per cron invocation (Workers CPU budget) */
const BATCH_SIZE = 5;

interface Env {
	DB: D1Database;
	ANTHROPIC_API_KEY: string;
}

/** Merge array: add only new items not already present */
function mergeArray(existing: string[], extracted: string[] | undefined): string[] {
	if (!extracted || extracted.length === 0) return existing;
	const combined = new Set([...existing, ...extracted]);
	return Array.from(combined);
}

/** Pick the first non-null value (existing takes priority) */
function keepOrFill<T>(existing: T | null, extracted: T | null | undefined): T | null {
	return existing ?? extracted ?? null;
}

/**
 * Cron handler: post-validate completed (or stale) sessions.
 *
 * Targets:
 *  - postValidatedAt IS NULL
 *  - AND (completedAt IS NOT NULL  OR  last message > 1 hour ago)
 *
 * Strategy: additive merge — only fills in missing data, never overwrites existing.
 */
export async function handlePostValidation(env: Env): Promise<void> {
	const db = drizzle(env.DB);

	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

	// Find sessions that need post-validation
	const candidates = await db
		.select({
			sessionId: extractedCases.sessionId,
		})
		.from(extractedCases)
		.innerJoin(interviewSessions, eq(extractedCases.sessionId, interviewSessions.id))
		.where(
			and(
				isNull(extractedCases.postValidatedAt),
				or(isNotNull(interviewSessions.completedAt), lt(interviewSessions.startedAt, oneHourAgo)),
			),
		)
		.limit(BATCH_SIZE)
		.all();

	if (candidates.length === 0) return;

	const provider = createAnthropicProvider(env.ANTHROPIC_API_KEY);

	for (const { sessionId } of candidates) {
		try {
			// Load current record
			const current = await db
				.select()
				.from(extractedCases)
				.where(eq(extractedCases.sessionId, sessionId))
				.get();

			if (!current) continue;

			// Load full transcript
			const entries = await db
				.select()
				.from(transcripts)
				.where(eq(transcripts.sessionId, sessionId))
				.orderBy(asc(transcripts.turnIndex))
				.all();

			if (entries.length === 0) {
				await db
					.update(extractedCases)
					.set({ postValidatedAt: new Date(), updatedAt: new Date() })
					.where(eq(extractedCases.sessionId, sessionId));
				continue;
			}

			const conversationHistory = entries.map((t) => ({
				role: (t.speaker === "ai" ? "assistant" : "user") as "user" | "assistant",
				content: t.content,
			}));

			// Build existing data for the prompt
			const existingData = {
				caseType: current.caseType,
				entryPoint: current.entryPoint,
				actorProfile: current.actorProfile,
				interactionFlow: current.interactionFlow,
				harmOutcome: current.harmOutcome,
				psychology: current.psychology,
				evidence: current.evidence,
				preventionSignal: current.preventionSignal,
			};

			// Run full extraction (additive — prompt instructs to only fill missing)
			const extraction = await postValidateTranscript(provider, conversationHistory, existingData);
			const facts = extraction.facts;

			if (!facts) {
				await db
					.update(extractedCases)
					.set({ postValidatedAt: new Date(), updatedAt: new Date() })
					.where(eq(extractedCases.sessionId, sessionId));
				continue;
			}

			const ep = current.entryPoint ?? {
				first_touch_channel: null,
				first_touch_platform: null,
				was_ad: null,
				ad_format: null,
				ad_platform: null,
				ad_claim_type: [],
			};
			const ap = current.actorProfile ?? {
				claimed_role: [],
				claimed_affiliation: [],
				trust_signal: [],
				identity_verification_claim: [],
			};
			const ifl = current.interactionFlow ?? {
				moved_to_external_channel: null,
				external_channels: [],
				asked_for_payment: null,
				asked_for_registration: null,
				asked_for_id_submission: null,
				asked_for_app_install: null,
				asked_for_remote_control: null,
				asked_for_crypto_transfer: null,
				asked_for_bank_transfer: null,
			};
			const ho = current.harmOutcome ?? {
				money_sent: null,
				estimated_amount_jpy: null,
				non_monetary_harm: [],
				attempt_stopped_before_payment: null,
				felt_in_danger: null,
			};
			const psy = current.psychology ?? {
				why_it_felt_believable: [],
				warning_signs_noticed: [],
				why_warning_signs_did_not_stop_action: [],
				emotions_during: [],
				emotions_after: [],
			};
			const ev = current.evidence ?? {
				has_screenshot: null,
				has_chat_log: null,
				has_transfer_record: null,
				has_ad_image_or_url: null,
				has_account_identifier: null,
			};
			const ps = current.preventionSignal ?? {
				what_platform_design_might_have_helped: [],
				what_public_warning_might_have_helped: [],
				what_information_or_support_might_have_helped: [],
				what_should_be_improved_first: [],
			};

			// Additive merge: existing values take priority
			await db
				.update(extractedCases)
				.set({
					caseType: keepOrFill(current.caseType, facts.case_type),
					severityLevel: keepOrFill(current.severityLevel, facts.severity_level),
					incidentSummary: keepOrFill(current.incidentSummary, facts.incident_summary),
					entryPoint: {
						first_touch_channel: keepOrFill(ep.first_touch_channel, facts.first_touch_channel),
						first_touch_platform: keepOrFill(ep.first_touch_platform, facts.first_touch_platform),
						was_ad: keepOrFill(ep.was_ad, facts.was_ad),
						ad_format: keepOrFill(ep.ad_format, facts.ad_format),
						ad_platform: keepOrFill(ep.ad_platform, facts.ad_platform),
						ad_claim_type: mergeArray(ep.ad_claim_type, facts.ad_claim_type),
					},
					actorProfile: {
						claimed_role: mergeArray(ap.claimed_role, facts.claimed_role),
						claimed_affiliation: mergeArray(ap.claimed_affiliation, facts.claimed_affiliation),
						trust_signal: mergeArray(ap.trust_signal, facts.trust_signal),
						identity_verification_claim: mergeArray(
							ap.identity_verification_claim,
							facts.identity_verification_claim,
						),
					},
					interactionFlow: {
						moved_to_external_channel: keepOrFill(
							ifl.moved_to_external_channel,
							facts.moved_to_external_channel,
						),
						external_channels: mergeArray(ifl.external_channels, facts.external_channels),
						asked_for_payment: keepOrFill(ifl.asked_for_payment, facts.asked_for_payment),
						asked_for_registration: keepOrFill(
							ifl.asked_for_registration,
							facts.asked_for_registration,
						),
						asked_for_id_submission: keepOrFill(
							ifl.asked_for_id_submission,
							facts.asked_for_id_submission,
						),
						asked_for_app_install: keepOrFill(
							ifl.asked_for_app_install,
							facts.asked_for_app_install,
						),
						asked_for_remote_control: keepOrFill(
							ifl.asked_for_remote_control,
							facts.asked_for_remote_control,
						),
						asked_for_crypto_transfer: keepOrFill(
							ifl.asked_for_crypto_transfer,
							facts.asked_for_crypto_transfer,
						),
						asked_for_bank_transfer: keepOrFill(
							ifl.asked_for_bank_transfer,
							facts.asked_for_bank_transfer,
						),
					},
					harmOutcome: {
						money_sent: keepOrFill(ho.money_sent, facts.money_sent),
						estimated_amount_jpy: keepOrFill(ho.estimated_amount_jpy, facts.estimated_amount_jpy),
						non_monetary_harm: mergeArray(ho.non_monetary_harm, facts.non_monetary_harm),
						attempt_stopped_before_payment: keepOrFill(
							ho.attempt_stopped_before_payment,
							facts.attempt_stopped_before_payment,
						),
						felt_in_danger: keepOrFill(ho.felt_in_danger, facts.felt_in_danger),
					},
					psychology: {
						why_it_felt_believable: mergeArray(
							psy.why_it_felt_believable,
							facts.why_it_felt_believable,
						),
						warning_signs_noticed: mergeArray(
							psy.warning_signs_noticed,
							facts.warning_signs_noticed,
						),
						why_warning_signs_did_not_stop_action: mergeArray(
							psy.why_warning_signs_did_not_stop_action,
							facts.why_warning_signs_did_not_stop_action,
						),
						emotions_during: mergeArray(psy.emotions_during, facts.emotions_during),
						emotions_after: mergeArray(psy.emotions_after, facts.emotions_after),
					},
					evidence: {
						has_screenshot: keepOrFill(ev.has_screenshot, facts.has_screenshot),
						has_chat_log: keepOrFill(ev.has_chat_log, facts.has_chat_log),
						has_transfer_record: keepOrFill(ev.has_transfer_record, facts.has_transfer_record),
						has_ad_image_or_url: keepOrFill(ev.has_ad_image_or_url, facts.has_ad_image_or_url),
						has_account_identifier: keepOrFill(
							ev.has_account_identifier,
							facts.has_account_identifier,
						),
					},
					preventionSignal: {
						what_platform_design_might_have_helped: mergeArray(
							ps.what_platform_design_might_have_helped,
							facts.what_platform_design_might_have_helped,
						),
						what_public_warning_might_have_helped: mergeArray(
							ps.what_public_warning_might_have_helped,
							facts.what_public_warning_might_have_helped,
						),
						what_information_or_support_might_have_helped: mergeArray(
							ps.what_information_or_support_might_have_helped,
							facts.what_information_or_support_might_have_helped,
						),
						what_should_be_improved_first: mergeArray(
							ps.what_should_be_improved_first,
							facts.what_should_be_improved_first,
						),
					},
					// skippedSlots, confirmationState, detailScoresData, followedUpSlots preserved (not set)
					postValidatedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(extractedCases.sessionId, sessionId));
		} catch (e) {
			console.error(`Post-validation failed for session ${sessionId}:`, e);
		}
	}
}
