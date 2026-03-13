import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { extractedCases, interviewSessions, surveys, transcripts } from "../db/schema.js";
import { createDefaultCaseData } from "../engine/orchestrator.js";
import {
	createSessionBodySchema,
	createSessionResponseSchema,
	errorSchema,
	sessionSchema,
} from "../schemas/api.js";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ANTHROPIC_API_KEY: string;
};

const INTRO_MESSAGE =
	"こんにちは。本日はネット広告をきっかけとした詐欺やトラブルの体験についてお聞きします。" +
	"あなたのお話は調査研究の目的でのみ使用され、個人が特定されることはありません。" +
	"答えたくない質問はスキップできますので、ご安心ください。" +
	"\n\nまず、そのきっかけとなる広告や情報を最初に見かけたのは、どこでしたか？（例：Instagram、YouTube、LINE、ウェブサイト など）";

const app = new OpenAPIHono<{ Bindings: Bindings }>();

const createSessionRoute = createRoute({
	method: "post",
	path: "/api/sessions",
	request: {
		body: {
			content: {
				"application/json": {
					schema: createSessionBodySchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				"application/json": {
					schema: createSessionResponseSchema,
				},
			},
			description: "Session created",
		},
		404: {
			content: {
				"application/json": {
					schema: errorSchema,
				},
			},
			description: "Survey not found",
		},
	},
});

const getSessionRoute = createRoute({
	method: "get",
	path: "/api/sessions/{id}",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: sessionSchema,
				},
			},
			description: "Session details",
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

app.openapi(createSessionRoute, async (c) => {
	const { surveyId } = c.req.valid("json");
	const db = drizzle(c.env.DB);

	// Verify survey exists
	const survey = await db.select().from(surveys).where(eq(surveys.id, surveyId)).get();
	if (!survey) {
		return c.json({ error: "Survey not found" }, 404);
	}

	const sessionId = crypto.randomUUID();
	const caseId = crypto.randomUUID();
	const now = new Date();

	const defaultCase = createDefaultCaseData();

	// Create session
	await db.insert(interviewSessions).values({
		id: sessionId,
		surveyId,
		stage: "intro",
		completionScore: 0,
		consentGiven: false,
		burdenLevel: 0,
		riskLevel: "none",
		currentSlot: null,
		startedAt: now,
	});

	// Create extracted case record
	await db.insert(extractedCases).values({
		id: caseId,
		sessionId,
		caseType: defaultCase.caseType,
		entryPoint: defaultCase.entryPoint,
		actorProfile: defaultCase.actorProfile,
		interactionFlow: defaultCase.interactionFlow,
		harmOutcome: defaultCase.harmOutcome,
		psychology: defaultCase.psychology,
		evidence: defaultCase.evidence,
		preventionSignal: defaultCase.preventionSignal,
		safetyMeta: {
			pii_detected: false,
			secret_detected: false,
			burden_level: 0,
			risk_level: "none",
		},
		qualityMeta: {
			completion_score: 0,
			missing_fields: [],
			confidence_notes: [],
		},
		createdAt: now,
		updatedAt: now,
	});

	// Save intro message as transcript
	const transcriptId = crypto.randomUUID();
	await db.insert(transcripts).values({
		id: transcriptId,
		sessionId,
		turnIndex: 0,
		speaker: "ai",
		content: INTRO_MESSAGE,
		createdAt: now,
	});

	const session = {
		id: sessionId,
		surveyId,
		stage: "intro",
		completionScore: 0,
		consentGiven: false,
		burdenLevel: 0,
		riskLevel: "none",
		currentSlot: null,
		startedAt: now.toISOString(),
		completedAt: null,
	};

	return c.json(
		{
			session,
			message: INTRO_MESSAGE,
		},
		201,
	);
});

app.openapi(getSessionRoute, async (c) => {
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

	return c.json(
		{
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
		},
		200,
	);
});

export default app;
