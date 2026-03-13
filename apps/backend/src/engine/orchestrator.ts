import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { extractFromMessage } from "../ai/extractor.js";
import { classifySafety } from "../ai/safety.js";
import { renderQuestion } from "../ai/question-renderer.js";
import type { TurnExtraction } from "../schemas/extraction.js";
import type { SafetyAssessment } from "../schemas/safety.js";
import { detectForbiddenData } from "./forbidden.js";
import { redactPII } from "./redaction.js";
import { checkShouldStop } from "./stop-check.js";
import { calculateCompletionScore } from "./completion.js";
import { determineStage, type CaseSlots, type Stage } from "./stage.js";
import { getNextSlot } from "./slots.js";

export interface ExtractedCaseData {
	caseType?: string | null;
	severityLevel?: string | null;
	incidentSummary?: string | null;
	entryPoint: {
		first_touch_channel: string | null;
		first_touch_platform: string | null;
		was_ad: boolean | null;
		ad_format: string | null;
		ad_platform: string | null;
		ad_claim_type: string[];
	};
	actorProfile: {
		claimed_role: string[];
		claimed_affiliation: string[];
		trust_signal: string[];
		identity_verification_claim: string[];
	};
	interactionFlow: {
		moved_to_external_channel: boolean | null;
		external_channels: string[];
		asked_for_payment: boolean | null;
		asked_for_registration: boolean | null;
		asked_for_id_submission: boolean | null;
		asked_for_app_install: boolean | null;
		asked_for_remote_control: boolean | null;
		asked_for_crypto_transfer: boolean | null;
		asked_for_bank_transfer: boolean | null;
	};
	harmOutcome: {
		money_sent: boolean | null;
		estimated_amount_jpy: number | null;
		non_monetary_harm: string[];
		attempt_stopped_before_payment: boolean | null;
		felt_in_danger: boolean | null;
	};
	psychology: {
		why_it_felt_believable: string[];
		warning_signs_noticed: string[];
		why_warning_signs_did_not_stop_action: string[];
		emotions_during: string[];
		emotions_after: string[];
	};
	evidence: {
		has_screenshot: boolean | null;
		has_chat_log: boolean | null;
		has_transfer_record: boolean | null;
		has_ad_image_or_url: boolean | null;
		has_account_identifier: boolean | null;
	};
	preventionSignal: {
		what_platform_design_might_have_helped: string[];
		what_public_warning_might_have_helped: string[];
		what_information_or_support_might_have_helped: string[];
		what_should_be_improved_first: string[];
	};
}

export interface OrchestratorResult {
	question: string;
	stage: Stage;
	completionScore: number;
	shouldEnd: boolean;
	extractedData: ExtractedCaseData;
	safetyWarning?: string;
	forbiddenCategories?: string[];
	redactedMessage: string;
}

export function createDefaultCaseData(): ExtractedCaseData {
	return {
		caseType: null,
		severityLevel: null,
		incidentSummary: null,
		entryPoint: {
			first_touch_channel: null,
			first_touch_platform: null,
			was_ad: null,
			ad_format: null,
			ad_platform: null,
			ad_claim_type: [],
		},
		actorProfile: {
			claimed_role: [],
			claimed_affiliation: [],
			trust_signal: [],
			identity_verification_claim: [],
		},
		interactionFlow: {
			moved_to_external_channel: null,
			external_channels: [],
			asked_for_payment: null,
			asked_for_registration: null,
			asked_for_id_submission: null,
			asked_for_app_install: null,
			asked_for_remote_control: null,
			asked_for_crypto_transfer: null,
			asked_for_bank_transfer: null,
		},
		harmOutcome: {
			money_sent: null,
			estimated_amount_jpy: null,
			non_monetary_harm: [],
			attempt_stopped_before_payment: null,
			felt_in_danger: null,
		},
		psychology: {
			why_it_felt_believable: [],
			warning_signs_noticed: [],
			why_warning_signs_did_not_stop_action: [],
			emotions_during: [],
			emotions_after: [],
		},
		evidence: {
			has_screenshot: null,
			has_chat_log: null,
			has_transfer_record: null,
			has_ad_image_or_url: null,
			has_account_identifier: null,
		},
		preventionSignal: {
			what_platform_design_might_have_helped: [],
			what_public_warning_might_have_helped: [],
			what_information_or_support_might_have_helped: [],
			what_should_be_improved_first: [],
		},
	};
}

function mergeArrayField(existing: string[], extracted: string[] | undefined): string[] {
	if (!extracted || extracted.length === 0) return existing;
	const combined = new Set([...existing, ...extracted]);
	return Array.from(combined);
}

function mergeExtraction(
	existing: ExtractedCaseData,
	extraction: TurnExtraction,
): ExtractedCaseData {
	const facts = extraction.facts;
	if (!facts) return existing;

	return {
		caseType: facts.case_type ?? existing.caseType,
		severityLevel: facts.severity_level ?? existing.severityLevel,
		incidentSummary: facts.incident_summary ?? existing.incidentSummary,
		entryPoint: {
			first_touch_channel:
				facts.first_touch_channel ?? existing.entryPoint.first_touch_channel,
			first_touch_platform:
				facts.first_touch_platform ?? existing.entryPoint.first_touch_platform,
			was_ad: facts.was_ad ?? existing.entryPoint.was_ad,
			ad_format: facts.ad_format ?? existing.entryPoint.ad_format,
			ad_platform: facts.ad_platform ?? existing.entryPoint.ad_platform,
			ad_claim_type: mergeArrayField(
				existing.entryPoint.ad_claim_type,
				facts.ad_claim_type,
			),
		},
		actorProfile: {
			claimed_role: mergeArrayField(
				existing.actorProfile.claimed_role,
				facts.claimed_role,
			),
			claimed_affiliation: mergeArrayField(
				existing.actorProfile.claimed_affiliation,
				facts.claimed_affiliation,
			),
			trust_signal: mergeArrayField(
				existing.actorProfile.trust_signal,
				facts.trust_signal,
			),
			identity_verification_claim: mergeArrayField(
				existing.actorProfile.identity_verification_claim,
				facts.identity_verification_claim,
			),
		},
		interactionFlow: {
			moved_to_external_channel:
				facts.moved_to_external_channel ??
				existing.interactionFlow.moved_to_external_channel,
			external_channels: mergeArrayField(
				existing.interactionFlow.external_channels,
				facts.external_channels,
			),
			asked_for_payment:
				facts.asked_for_payment ?? existing.interactionFlow.asked_for_payment,
			asked_for_registration:
				facts.asked_for_registration ?? existing.interactionFlow.asked_for_registration,
			asked_for_id_submission:
				facts.asked_for_id_submission ?? existing.interactionFlow.asked_for_id_submission,
			asked_for_app_install:
				facts.asked_for_app_install ?? existing.interactionFlow.asked_for_app_install,
			asked_for_remote_control:
				facts.asked_for_remote_control ??
				existing.interactionFlow.asked_for_remote_control,
			asked_for_crypto_transfer:
				facts.asked_for_crypto_transfer ??
				existing.interactionFlow.asked_for_crypto_transfer,
			asked_for_bank_transfer:
				facts.asked_for_bank_transfer ?? existing.interactionFlow.asked_for_bank_transfer,
		},
		harmOutcome: {
			money_sent: facts.money_sent ?? existing.harmOutcome.money_sent,
			estimated_amount_jpy:
				facts.estimated_amount_jpy ?? existing.harmOutcome.estimated_amount_jpy,
			non_monetary_harm: mergeArrayField(
				existing.harmOutcome.non_monetary_harm,
				facts.non_monetary_harm,
			),
			attempt_stopped_before_payment:
				facts.attempt_stopped_before_payment ??
				existing.harmOutcome.attempt_stopped_before_payment,
			felt_in_danger: facts.felt_in_danger ?? existing.harmOutcome.felt_in_danger,
		},
		psychology: {
			why_it_felt_believable: mergeArrayField(
				existing.psychology.why_it_felt_believable,
				facts.why_it_felt_believable,
			),
			warning_signs_noticed: mergeArrayField(
				existing.psychology.warning_signs_noticed,
				facts.warning_signs_noticed,
			),
			why_warning_signs_did_not_stop_action: mergeArrayField(
				existing.psychology.why_warning_signs_did_not_stop_action,
				facts.why_warning_signs_did_not_stop_action,
			),
			emotions_during: mergeArrayField(
				existing.psychology.emotions_during,
				facts.emotions_during,
			),
			emotions_after: mergeArrayField(
				existing.psychology.emotions_after,
				facts.emotions_after,
			),
		},
		evidence: {
			has_screenshot: facts.has_screenshot ?? existing.evidence.has_screenshot,
			has_chat_log: facts.has_chat_log ?? existing.evidence.has_chat_log,
			has_transfer_record: facts.has_transfer_record ?? existing.evidence.has_transfer_record,
			has_ad_image_or_url:
				facts.has_ad_image_or_url ?? existing.evidence.has_ad_image_or_url,
			has_account_identifier:
				facts.has_account_identifier ?? existing.evidence.has_account_identifier,
		},
		preventionSignal: {
			what_platform_design_might_have_helped: mergeArrayField(
				existing.preventionSignal.what_platform_design_might_have_helped,
				facts.what_platform_design_might_have_helped,
			),
			what_public_warning_might_have_helped: mergeArrayField(
				existing.preventionSignal.what_public_warning_might_have_helped,
				facts.what_public_warning_might_have_helped,
			),
			what_information_or_support_might_have_helped: mergeArrayField(
				existing.preventionSignal.what_information_or_support_might_have_helped,
				facts.what_information_or_support_might_have_helped,
			),
			what_should_be_improved_first: mergeArrayField(
				existing.preventionSignal.what_should_be_improved_first,
				facts.what_should_be_improved_first,
			),
		},
	};
}

function caseDataToSlots(data: ExtractedCaseData): CaseSlots {
	return {
		case_type: data.caseType,
		first_touch_channel: data.entryPoint.first_touch_channel,
		was_ad: data.entryPoint.was_ad,
		ad_platform: data.entryPoint.ad_platform,
		claimed_role: data.actorProfile.claimed_role,
		moved_to_external_channel: data.interactionFlow.moved_to_external_channel,
		money_sent: data.harmOutcome.money_sent,
		attempt_stopped_before_payment: data.harmOutcome.attempt_stopped_before_payment,
		estimated_amount_jpy: data.harmOutcome.estimated_amount_jpy,
		why_it_felt_believable: data.psychology.why_it_felt_believable,
		warning_signs_noticed: data.psychology.warning_signs_noticed,
		what_platform_design_might_have_helped:
			data.preventionSignal.what_platform_design_might_have_helped,
		what_should_be_improved_first: data.preventionSignal.what_should_be_improved_first,
	};
}

function buildContextSummary(data: ExtractedCaseData): string {
	const parts: string[] = [];
	if (data.caseType) parts.push(`Case type: ${data.caseType}`);
	if (data.entryPoint.first_touch_channel)
		parts.push(`First contact: ${data.entryPoint.first_touch_channel}`);
	if (data.entryPoint.was_ad !== null) parts.push(`Was ad: ${data.entryPoint.was_ad}`);
	if (data.entryPoint.ad_platform) parts.push(`Ad platform: ${data.entryPoint.ad_platform}`);
	if (data.actorProfile.claimed_role.length > 0)
		parts.push(`Claimed role: ${data.actorProfile.claimed_role.join(", ")}`);
	if (data.interactionFlow.moved_to_external_channel !== null)
		parts.push(`Moved to external: ${data.interactionFlow.moved_to_external_channel}`);
	if (data.harmOutcome.money_sent !== null)
		parts.push(`Money sent: ${data.harmOutcome.money_sent}`);
	if (data.harmOutcome.estimated_amount_jpy !== null)
		parts.push(`Amount: ${data.harmOutcome.estimated_amount_jpy} JPY`);
	if (data.psychology.why_it_felt_believable.length > 0)
		parts.push(
			`Why believable: ${data.psychology.why_it_felt_believable.join(", ")}`,
		);
	if (data.psychology.warning_signs_noticed.length > 0)
		parts.push(
			`Warning signs: ${data.psychology.warning_signs_noticed.join(", ")}`,
		);
	return parts.length > 0 ? parts.join("\n") : "No information gathered yet.";
}

const WRAP_UP_MESSAGE =
	"ありがとうございます。貴重なお話を聞かせていただき、感謝いたします。" +
	"お話しいただいた内容は、今後の被害防止の研究に役立てさせていただきます。" +
	"\n\nもし何かお困りのことがあれば、消費者ホットライン（188）にご相談ください。";

const STOP_MESSAGE =
	"お話しいただきありがとうございます。無理をなさらなくて大丈夫です。" +
	"ここで一度お休みにしましょう。" +
	"\n\nもし何かお困りのことがあれば、消費者ホットライン（188）にご相談ください。";

export async function processTurn(
	provider: AnthropicProvider,
	userMessage: string,
	conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
	currentCaseData: ExtractedCaseData,
): Promise<OrchestratorResult> {
	// 1. Redact PII from message
	const redactedMessage = redactPII(userMessage);

	// 2. Run extractor and safety classifier in parallel
	const [extraction, safety] = await Promise.all([
		extractFromMessage(provider, conversationHistory, userMessage),
		classifySafety(provider, userMessage),
	]);

	// 3. Check forbidden data (rule-based)
	const forbidden = detectForbiddenData(userMessage);

	// 4. Merge extracted data
	const mergedData = mergeExtraction(currentCaseData, extraction);

	// 5. Check if should stop
	const stopCheck = checkShouldStop(safety);

	// 6. Calculate completion score
	const slots = caseDataToSlots(mergedData);
	const completionScore = calculateCompletionScore(slots);

	// 7. Determine stage
	let stage = determineStage(slots);

	// 8. Find next slot
	const nextSlot = getNextSlot(slots);

	// Build safety warning if needed
	let safetyWarning: string | undefined;
	if (stopCheck.shouldStop) {
		safetyWarning = `Safety concerns: ${stopCheck.reasons.join(", ")}`;
	}

	// 9. Determine response
	let question: string;
	let shouldEnd = false;

	if (stopCheck.shouldStop) {
		question = STOP_MESSAGE;
		stage = "stop";
		shouldEnd = true;
	} else if (!nextSlot || completionScore >= 0.85 || stage === "wrap_up") {
		question = WRAP_UP_MESSAGE;
		stage = "wrap_up";
		shouldEnd = true;
	} else {
		// Generate question for next slot
		const context = buildContextSummary(mergedData);
		question = await renderQuestion(provider, nextSlot, context);
	}

	return {
		question,
		stage,
		completionScore,
		shouldEnd,
		extractedData: mergedData,
		safetyWarning,
		forbiddenCategories: forbidden.hasViolation ? forbidden.categories : undefined,
		redactedMessage,
	};
}
