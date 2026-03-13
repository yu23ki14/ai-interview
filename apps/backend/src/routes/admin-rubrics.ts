import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { createAnthropicProvider } from "../ai/provider.js";
import { generateRubric } from "../ai/rubric-generator.js";
import { detailRubrics, exemplarAnswers } from "../db/schema.js";
import {
	detailRubricSchema,
	errorSchema,
	generateRubricBodySchema,
	rubricListQuerySchema,
} from "../schemas/api.js";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ANTHROPIC_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// POST /api/admin/rubrics/generate
const generateRubricRoute = createRoute({
	method: "post",
	path: "/api/admin/rubrics/generate",
	request: {
		body: {
			content: {
				"application/json": {
					schema: generateRubricBodySchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				"application/json": {
					schema: detailRubricSchema,
				},
			},
			description: "Rubric generated",
		},
		400: {
			content: {
				"application/json": {
					schema: errorSchema,
				},
			},
			description: "Not enough exemplars",
		},
	},
});

// POST /api/admin/rubrics/{id}/activate
const activateRubricRoute = createRoute({
	method: "post",
	path: "/api/admin/rubrics/{id}/activate",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: detailRubricSchema,
				},
			},
			description: "Rubric activated",
		},
		404: {
			content: {
				"application/json": {
					schema: errorSchema,
				},
			},
			description: "Rubric not found",
		},
	},
});

// GET /api/admin/rubrics
const listRubricsRoute = createRoute({
	method: "get",
	path: "/api/admin/rubrics",
	request: {
		query: rubricListQuerySchema,
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.array(detailRubricSchema),
				},
			},
			description: "List of rubrics",
		},
	},
});

app.openapi(generateRubricRoute, async (c) => {
	const { surveyId, slotKey } = c.req.valid("json");
	const db = drizzle(c.env.DB);

	// Fetch exemplars for this survey + slot
	const exemplars = await db
		.select()
		.from(exemplarAnswers)
		.where(and(eq(exemplarAnswers.surveyId, surveyId), eq(exemplarAnswers.slotKey, slotKey)))
		.all();

	if (exemplars.length < 3) {
		return c.json(
			{
				error: `ルーブリック生成には3件以上のピックアップが必要です（現在: ${exemplars.length}件）`,
			},
			400,
		);
	}

	// Generate rubric via LLM
	const provider = createAnthropicProvider(c.env.ANTHROPIC_API_KEY);
	const criteria = await generateRubric(
		provider,
		slotKey,
		exemplars.map((e) => ({
			rawText: e.rawText,
			extractedValue: e.extractedValue,
			notes: e.notes,
		})),
	);

	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(detailRubrics).values({
		id,
		surveyId,
		slotKey,
		status: "draft",
		criteria,
		generatedFrom: exemplars.map((e) => e.id),
		createdAt: now,
	});

	return c.json(
		{
			id,
			surveyId,
			slotKey,
			status: "draft",
			criteria,
			generatedFrom: exemplars.map((e) => e.id),
			createdAt: now.toISOString(),
			activatedAt: null,
		},
		201,
	);
});

app.openapi(activateRubricRoute, async (c) => {
	const { id } = c.req.valid("param");
	const db = drizzle(c.env.DB);

	const rubric = await db.select().from(detailRubrics).where(eq(detailRubrics.id, id)).get();

	if (!rubric) {
		return c.json({ error: "Rubric not found" }, 404);
	}

	// Archive any existing active rubric for the same survey+slot
	await db
		.update(detailRubrics)
		.set({ status: "archived" })
		.where(
			and(
				eq(detailRubrics.surveyId, rubric.surveyId),
				eq(detailRubrics.slotKey, rubric.slotKey),
				eq(detailRubrics.status, "active"),
			),
		);

	// Activate this rubric
	const now = new Date();
	await db
		.update(detailRubrics)
		.set({ status: "active", activatedAt: now })
		.where(eq(detailRubrics.id, id));

	return c.json(
		{
			id: rubric.id,
			surveyId: rubric.surveyId,
			slotKey: rubric.slotKey,
			status: "active",
			criteria: rubric.criteria,
			generatedFrom: rubric.generatedFrom,
			createdAt: rubric.createdAt.toISOString(),
			activatedAt: now.toISOString(),
		},
		200,
	);
});

app.openapi(listRubricsRoute, async (c) => {
	const { surveyId, slotKey } = c.req.valid("query");
	const db = drizzle(c.env.DB);

	const conditions = [eq(detailRubrics.surveyId, surveyId)];
	if (slotKey) {
		conditions.push(eq(detailRubrics.slotKey, slotKey));
	}

	const results = await db
		.select()
		.from(detailRubrics)
		.where(and(...conditions))
		.all();

	return c.json(
		results.map((r) => ({
			id: r.id,
			surveyId: r.surveyId,
			slotKey: r.slotKey,
			status: r.status,
			criteria: r.criteria,
			generatedFrom: r.generatedFrom,
			createdAt: r.createdAt.toISOString(),
			activatedAt: r.activatedAt?.toISOString() ?? null,
		})),
		200,
	);
});

export default app;
