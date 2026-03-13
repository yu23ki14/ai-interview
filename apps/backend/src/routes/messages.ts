import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { scoreDetailBatch } from "../ai/detail-scorer.js";
import { createAnthropicProvider } from "../ai/provider.js";
import {
	detailRubrics,
	exemplarAnswers,
	extractedCases,
	interviewSessions,
	surveys,
	transcripts,
} from "../db/schema.js";
import { calculateCompletionScore, getMissingFields } from "../engine/completion.js";
import {
	caseDataToSlots,
	createDefaultCaseData,
	type ExtractedCaseData,
	getSlotsNeedingScoring,
	processTurn,
} from "../engine/orchestrator.js";
import {
	errorSchema,
	sendMessageBodySchema,
	sendMessageResponseSchema,
	transcriptEntrySchema,
} from "../schemas/api.js";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ANTHROPIC_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

const sendMessageRoute = createRoute({
	method: "post",
	path: "/api/sessions/{id}/messages",
	request: {
		params: z.object({
			id: z.string(),
		}),
		body: {
			content: {
				"application/json": {
					schema: sendMessageBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: sendMessageResponseSchema,
				},
			},
			description: "AI response",
		},
		404: {
			content: {
				"application/json": {
					schema: errorSchema,
				},
			},
			description: "Session not found",
		},
	},
});

const getMessagesRoute = createRoute({
	method: "get",
	path: "/api/sessions/{id}/messages",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.array(transcriptEntrySchema),
				},
			},
			description: "Transcript entries",
		},
		404: {
			content: {
				"application/json": {
					schema: errorSchema,
				},
			},
			description: "Session not found",
		},
	},
});

app.openapi(sendMessageRoute, async (c) => {
	const { id } = c.req.valid("param");
	const { content } = c.req.valid("json");
	const db = drizzle(c.env.DB);

	// Get session
	const session = await db
		.select()
		.from(interviewSessions)
		.where(eq(interviewSessions.id, id))
		.get();

	if (!session) {
		return c.json({ error: "Session not found" }, 404);
	}

	// Get existing transcripts for conversation history
	const existingTranscripts = await db
		.select()
		.from(transcripts)
		.where(eq(transcripts.sessionId, id))
		.orderBy(asc(transcripts.turnIndex))
		.all();

	const conversationHistory = existingTranscripts.map((t) => ({
		role: (t.speaker === "ai" ? "assistant" : "user") as "user" | "assistant",
		content: t.content,
	}));

	// Get current case data
	const caseRecord = await db
		.select()
		.from(extractedCases)
		.where(eq(extractedCases.sessionId, id))
		.get();

	const currentCaseData: ExtractedCaseData = caseRecord
		? {
				caseType: caseRecord.caseType,
				severityLevel: caseRecord.severityLevel,
				incidentSummary: caseRecord.incidentSummary,
				entryPoint: caseRecord.entryPoint ?? {
					first_touch_channel: null,
					first_touch_platform: null,
					was_ad: null,
					ad_format: null,
					ad_platform: null,
					ad_claim_type: [],
				},
				actorProfile: caseRecord.actorProfile ?? {
					claimed_role: [],
					claimed_affiliation: [],
					trust_signal: [],
					identity_verification_claim: [],
				},
				interactionFlow: caseRecord.interactionFlow ?? {
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
				harmOutcome: caseRecord.harmOutcome ?? {
					money_sent: null,
					estimated_amount_jpy: null,
					non_monetary_harm: [],
					attempt_stopped_before_payment: null,
					felt_in_danger: null,
				},
				psychology: caseRecord.psychology ?? {
					why_it_felt_believable: [],
					warning_signs_noticed: [],
					why_warning_signs_did_not_stop_action: [],
					emotions_during: [],
					emotions_after: [],
				},
				evidence: caseRecord.evidence ?? {
					has_screenshot: null,
					has_chat_log: null,
					has_transfer_record: null,
					has_ad_image_or_url: null,
					has_account_identifier: null,
				},
				preventionSignal: caseRecord.preventionSignal ?? {
					what_platform_design_might_have_helped: [],
					what_public_warning_might_have_helped: [],
					what_information_or_support_might_have_helped: [],
					what_should_be_improved_first: [],
				},
				skippedSlots: caseRecord.skippedSlots ?? [],
				confirmationState:
					(caseRecord.confirmationState as "not_asked" | "pending" | "done") ?? "not_asked",
				detailScores: (caseRecord.detailScoresData as Record<string, number>) ?? {},
				followedUpSlots: (caseRecord.followedUpSlots as string[]) ?? [],
			}
		: createDefaultCaseData();

	// Load survey threshold for detail scoring
	const survey = await db.select().from(surveys).where(eq(surveys.id, session.surveyId)).get();
	const detailThreshold = survey?.detailThreshold;

	// Process turn through orchestrator (extraction + safety + question generation)
	const provider = createAnthropicProvider(c.env.ANTHROPIC_API_KEY);
	const result = await processTurn(
		provider,
		content,
		conversationHistory,
		currentCaseData,
		detailThreshold,
		session.currentSlot,
	);

	// Calculate next turn index
	const nextTurnIndex = existingTranscripts.length;

	// Save transcripts, update session, and update extracted case
	const data = result.extractedData;
	const missingFields = getMissingFields({
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
		emotions_during: data.psychology.emotions_during,
		emotions_after: data.psychology.emotions_after,
		non_monetary_harm: data.harmOutcome.non_monetary_harm,
		what_platform_design_might_have_helped:
			data.preventionSignal.what_platform_design_might_have_helped,
		what_public_warning_might_have_helped:
			data.preventionSignal.what_public_warning_might_have_helped,
		what_information_or_support_might_have_helped:
			data.preventionSignal.what_information_or_support_might_have_helped,
		what_should_be_improved_first: data.preventionSignal.what_should_be_improved_first,
	});

	const sessionUpdateData: Record<string, unknown> = {
		stage: result.stage,
		completionScore: result.completionScore,
		currentSlot: result.nextSlot,
	};
	if (result.shouldEnd) {
		sessionUpdateData.completedAt = new Date();
	}

	// Run DB writes in parallel
	await Promise.all([
		db.insert(transcripts).values({
			id: crypto.randomUUID(),
			sessionId: id,
			turnIndex: nextTurnIndex,
			speaker: "user",
			content: result.redactedMessage,
			createdAt: new Date(),
		}),
		db.insert(transcripts).values({
			id: crypto.randomUUID(),
			sessionId: id,
			turnIndex: nextTurnIndex + 1,
			speaker: "ai",
			content: result.question,
			createdAt: new Date(),
		}),
		db.update(interviewSessions).set(sessionUpdateData).where(eq(interviewSessions.id, id)),
		db
			.update(extractedCases)
			.set({
				caseType: data.caseType,
				severityLevel: data.severityLevel,
				incidentSummary: data.incidentSummary,
				entryPoint: data.entryPoint,
				actorProfile: data.actorProfile,
				interactionFlow: data.interactionFlow,
				harmOutcome: data.harmOutcome,
				psychology: data.psychology,
				evidence: data.evidence,
				preventionSignal: data.preventionSignal,
				skippedSlots: data.skippedSlots,
				followedUpSlots: data.followedUpSlots,
				confirmationState: data.confirmationState,
				safetyMeta: {
					pii_detected:
						result.safetyAssessment.pii_detected ||
						(result.forbiddenCategories ? result.forbiddenCategories.length > 0 : false),
					secret_detected: result.safetyAssessment.secret_detected,
					burden_level: result.safetyAssessment.burden_level,
					risk_level: result.safetyAssessment.risk_level,
				},
				detailScoresData: data.detailScores,
				qualityMeta: {
					completion_score: result.completionScore,
					missing_fields: missingFields,
					confidence_notes: [],
				},
				updatedAt: new Date(),
			})
			.where(eq(extractedCases.sessionId, id)),
	]);

	// Background: run detail scoring after response is sent (via waitUntil)
	const slots = caseDataToSlots(data);
	const slotsToScore = getSlotsNeedingScoring(slots, data.detailScores);
	if (slotsToScore.length > 0) {
		const bgTask = async () => {
			try {
				// Load rubrics and exemplars for scoring
				const [rubricRows, exemplarRows] = await Promise.all([
					db.select().from(detailRubrics).where(eq(detailRubrics.status, "active")).all(),
					db
						.select()
						.from(exemplarAnswers)
						.where(eq(exemplarAnswers.surveyId, session.surveyId))
						.all(),
				]);
				const rubricsMap = new Map(
					rubricRows.map((r) => [
						r.slotKey,
						r.criteria as {
							slot_key: string;
							version: number;
							dimensions: {
								name: string;
								description: string;
								weight: number;
								levels: Record<string, string>;
							}[];
						},
					]),
				);
				const samplesMap = new Map<string, { rawText: string }>();
				for (const ex of exemplarRows) {
					if (!samplesMap.has(ex.slotKey)) {
						samplesMap.set(ex.slotKey, { rawText: ex.rawText });
					}
				}

				// Only score slots that have a rubric or sample
				const scorable = slotsToScore.filter(
					({ slotKey }) => rubricsMap.has(slotKey) || samplesMap.has(slotKey),
				);
				if (scorable.length === 0) return;

				const newScores = await scoreDetailBatch(provider, scorable, rubricsMap, samplesMap);

				// Monotonic increase: keep the higher score
				const updatedScores = { ...data.detailScores };
				for (const [key, score] of Object.entries(newScores)) {
					const existing = updatedScores[key];
					if (existing === undefined || score > existing) {
						updatedScores[key] = score;
					}
				}

				// Recalculate completion score with new detail scores
				const newCompletionScore = calculateCompletionScore(slots, updatedScores);

				// Update DB with new scores
				await db
					.update(extractedCases)
					.set({
						detailScoresData: updatedScores,
						qualityMeta: {
							completion_score: newCompletionScore,
							missing_fields: missingFields,
							confidence_notes: [],
						},
						updatedAt: new Date(),
					})
					.where(eq(extractedCases.sessionId, id));

				await db
					.update(interviewSessions)
					.set({ completionScore: newCompletionScore })
					.where(eq(interviewSessions.id, id));
			} catch (e) {
				console.error("Background detail scoring failed:", e);
			}
		};
		c.executionCtx.waitUntil(bgTask());
	}

	return c.json(
		{
			message: result.question,
			stage: result.stage,
			completionScore: result.completionScore,
			shouldEnd: result.shouldEnd,
			safetyWarning: result.safetyWarning,
		},
		200,
	);
});

app.openapi(getMessagesRoute, async (c) => {
	const { id } = c.req.valid("param");
	const db = drizzle(c.env.DB);

	// Verify session exists
	const session = await db
		.select()
		.from(interviewSessions)
		.where(eq(interviewSessions.id, id))
		.get();

	if (!session) {
		return c.json({ error: "Session not found" }, 404);
	}

	const entries = await db
		.select()
		.from(transcripts)
		.where(eq(transcripts.sessionId, id))
		.orderBy(asc(transcripts.turnIndex))
		.all();

	const result = entries.map((entry) => ({
		id: entry.id,
		sessionId: entry.sessionId,
		turnIndex: entry.turnIndex,
		speaker: entry.speaker,
		content: entry.content,
		createdAt: entry.createdAt.toISOString(),
	}));

	return c.json(result, 200);
});

export default app;
