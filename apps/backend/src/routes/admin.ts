import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { interviewSessions, extractedCases } from "../db/schema.js";
import {
	adminSessionListItemSchema,
	adminSessionDetailSchema,
	sessionSchema,
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

	const caseRecord = await db
		.select()
		.from(extractedCases)
		.where(eq(extractedCases.sessionId, id))
		.get();

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

	return c.json(
		{
			session: sessionData,
			extractedCase: extractedCase as Record<string, unknown> | null,
		},
		200,
	);
});

export default app;
