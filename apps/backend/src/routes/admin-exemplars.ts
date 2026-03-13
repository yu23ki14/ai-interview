import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { exemplarAnswers } from "../db/schema.js";
import {
	createExemplarBodySchema,
	errorSchema,
	exemplarAnswerSchema,
	exemplarListQuerySchema,
} from "../schemas/api.js";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ANTHROPIC_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

// POST /api/admin/exemplars
const createExemplarRoute = createRoute({
	method: "post",
	path: "/api/admin/exemplars",
	request: {
		body: {
			content: {
				"application/json": {
					schema: createExemplarBodySchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				"application/json": {
					schema: exemplarAnswerSchema,
				},
			},
			description: "Exemplar created",
		},
	},
});

// GET /api/admin/exemplars
const listExemplarsRoute = createRoute({
	method: "get",
	path: "/api/admin/exemplars",
	request: {
		query: exemplarListQuerySchema,
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.array(exemplarAnswerSchema),
				},
			},
			description: "List of exemplar answers",
		},
	},
});

// DELETE /api/admin/exemplars/{id}
const deleteExemplarRoute = createRoute({
	method: "delete",
	path: "/api/admin/exemplars/{id}",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({ success: z.boolean() }),
				},
			},
			description: "Exemplar deleted",
		},
		404: {
			content: {
				"application/json": {
					schema: errorSchema,
				},
			},
			description: "Exemplar not found",
		},
	},
});

app.openapi(createExemplarRoute, async (c) => {
	const body = c.req.valid("json");
	const db = drizzle(c.env.DB);

	const id = crypto.randomUUID();
	const now = new Date();

	await db.insert(exemplarAnswers).values({
		id,
		surveyId: body.surveyId,
		sessionId: body.sessionId,
		slotKey: body.slotKey,
		rawText: body.rawText,
		extractedValue: body.extractedValue,
		notes: body.notes ?? null,
		pickedBy: null,
		createdAt: now,
	});

	return c.json(
		{
			id,
			surveyId: body.surveyId,
			sessionId: body.sessionId,
			slotKey: body.slotKey,
			rawText: body.rawText,
			extractedValue: body.extractedValue,
			pickedBy: null,
			notes: body.notes ?? null,
			createdAt: now.toISOString(),
		},
		201,
	);
});

app.openapi(listExemplarsRoute, async (c) => {
	const { surveyId, slotKey } = c.req.valid("query");
	const db = drizzle(c.env.DB);

	const conditions = [eq(exemplarAnswers.surveyId, surveyId)];
	if (slotKey) {
		conditions.push(eq(exemplarAnswers.slotKey, slotKey));
	}

	const results = await db
		.select()
		.from(exemplarAnswers)
		.where(and(...conditions))
		.all();

	return c.json(
		results.map((r) => ({
			id: r.id,
			surveyId: r.surveyId,
			sessionId: r.sessionId,
			slotKey: r.slotKey,
			rawText: r.rawText,
			extractedValue: r.extractedValue,
			pickedBy: r.pickedBy,
			notes: r.notes,
			createdAt: r.createdAt.toISOString(),
		})),
		200,
	);
});

app.openapi(deleteExemplarRoute, async (c) => {
	const { id } = c.req.valid("param");
	const db = drizzle(c.env.DB);

	const existing = await db.select().from(exemplarAnswers).where(eq(exemplarAnswers.id, id)).get();

	if (!existing) {
		return c.json({ error: "Exemplar not found" }, 404);
	}

	await db.delete(exemplarAnswers).where(eq(exemplarAnswers.id, id));

	return c.json({ success: true }, 200);
});

export default app;
