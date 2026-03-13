import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { detailScores, exemplarAnswers, extractedCases, interviewSessions } from "../db/schema.js";
import { getValueByPath, isDetailScorableSlot, SLOT_TO_CASE_PATH } from "../engine/detail-slots.js";
import { getSlotLabel } from "../engine/slots.js";
import {
	adminSessionDetailSchema,
	adminSessionListItemSchema,
	errorSchema,
} from "../schemas/api.js";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ANTHROPIC_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

const listSessionsRoute = createRoute({
	method: "get",
	path: "/api/admin/sessions",
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.array(adminSessionListItemSchema),
				},
			},
			description: "List of all sessions",
		},
	},
});

const getSessionDetailRoute = createRoute({
	method: "get",
	path: "/api/admin/sessions/{id}",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: adminSessionDetailSchema,
				},
			},
			description: "Session detail with extracted case",
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

app.openapi(listSessionsRoute, async (c) => {
	const db = drizzle(c.env.DB);

	const sessions = await db.select().from(interviewSessions).all();

	const result = sessions.map((s) => ({
		id: s.id,
		surveyId: s.surveyId,
		stage: s.stage,
		completionScore: s.completionScore,
		startedAt: s.startedAt.toISOString(),
		completedAt: s.completedAt?.toISOString() ?? null,
	}));

	return c.json(result, 200);
});

app.openapi(getSessionDetailRoute, async (c) => {
	const { id } = c.req.valid("param");
	const db = drizzle(c.env.DB);

	const session = await db
		.select()
		.from(interviewSessions)
		.where(eq(interviewSessions.id, id))
		.get();

	if (!session) {
		return c.json({ error: "Session not found" }, 404);
	}

	const [caseRecord, exemplars, scores] = await Promise.all([
		db.select().from(extractedCases).where(eq(extractedCases.sessionId, id)).get(),
		db.select().from(exemplarAnswers).where(eq(exemplarAnswers.sessionId, id)).all(),
		db.select().from(detailScores).where(eq(detailScores.sessionId, id)).all(),
	]);

	const sessionData = {
		id: session.id,
		surveyId: session.surveyId,
		stage: session.stage,
		completionScore: session.completionScore,
		consentGiven: session.consentGiven,
		burdenLevel: session.burdenLevel,
		riskLevel: session.riskLevel,
		currentSlot: session.currentSlot,
		startedAt: session.startedAt.toISOString(),
		completedAt: session.completedAt?.toISOString() ?? null,
	};

	const extractedCase = caseRecord
		? {
				id: caseRecord.id,
				sessionId: caseRecord.sessionId,
				caseType: caseRecord.caseType,
				severityLevel: caseRecord.severityLevel,
				incidentSummary: caseRecord.incidentSummary,
				entryPoint: caseRecord.entryPoint,
				actorProfile: caseRecord.actorProfile,
				interactionFlow: caseRecord.interactionFlow,
				harmOutcome: caseRecord.harmOutcome,
				psychology: caseRecord.psychology,
				evidence: caseRecord.evidence,
				preventionSignal: caseRecord.preventionSignal,
				safetyMeta: caseRecord.safetyMeta,
				qualityMeta: caseRecord.qualityMeta,
			}
		: null;

	// Build slots array from SLOT_PRIORITY order
	const { SLOT_PRIORITY } = await import("../engine/slots.js");
	const pickedUpSlots = new Set(exemplars.map((e) => e.slotKey));
	const scoreMap = new Map(scores.map((s) => [s.slotKey, s.score]));
	const detailScoresData = caseRecord?.detailScoresData;

	const caseObj = (extractedCase ?? {}) as Record<string, unknown>;

	const isFilled = (value: unknown): boolean => {
		if (value === null || value === undefined) return false;
		if (Array.isArray(value)) return value.length > 0;
		return true;
	};

	const slots = SLOT_PRIORITY.map((slotKey) => {
		const isScorableSlot = isDetailScorableSlot(slotKey);
		let extractedValue: unknown = null;

		if (isScorableSlot) {
			const path = SLOT_TO_CASE_PATH[slotKey];
			extractedValue = getValueByPath(caseObj, path);
		} else {
			// For non-detail-scorable slots, try common nested paths
			const pathMap: Record<string, string> = {
				case_type: "caseType",
				first_touch_channel: "entryPoint.first_touch_channel",
				was_ad: "entryPoint.was_ad",
				ad_platform: "entryPoint.ad_platform",
				claimed_role: "actorProfile.claimed_role",
				moved_to_external_channel: "interactionFlow.moved_to_external_channel",
				money_sent: "harmOutcome.money_sent",
				estimated_amount_jpy: "harmOutcome.estimated_amount_jpy",
			};
			const path = pathMap[slotKey];
			if (path) {
				extractedValue = getValueByPath(caseObj, path);
			}
		}

		const detailScore = detailScoresData?.[slotKey] ?? scoreMap.get(slotKey) ?? null;

		return {
			slotKey,
			label: getSlotLabel(slotKey),
			extractedValue,
			isFilled: isFilled(extractedValue),
			isDetailScorable: isScorableSlot,
			detailScore: isScorableSlot ? detailScore : null,
			isPickedUp: pickedUpSlots.has(slotKey),
		};
	});

	return c.json(
		{
			session: sessionData,
			extractedCase: extractedCase as Record<string, unknown> | null,
			slots,
		},
		200,
	);
});

export default app;
