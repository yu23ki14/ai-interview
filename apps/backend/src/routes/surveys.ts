import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { surveys } from "../db/schema.js";
import { errorSchema, surveySchema } from "../schemas/api.js";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ANTHROPIC_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

const getSurveyRoute = createRoute({
	method: "get",
	path: "/api/surveys/{id}",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: surveySchema,
				},
			},
			description: "Survey details",
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

const createSurveyRoute = createRoute({
	method: "post",
	path: "/api/surveys",
	request: {
		body: {
			content: {
				"application/json": {
					schema: z.object({
						id: z.string(),
						title: z.string(),
						description: z.string(),
						theme: z.string(),
						estimatedMinutes: z.number().optional().default(10),
					}),
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				"application/json": {
					schema: surveySchema,
				},
			},
			description: "Survey created",
		},
	},
});

app.openapi(createSurveyRoute, async (c) => {
	const body = c.req.valid("json");
	const db = drizzle(c.env.DB);
	const now = new Date();

	await db.insert(surveys).values({
		id: body.id,
		title: body.title,
		description: body.description,
		theme: body.theme,
		estimatedMinutes: body.estimatedMinutes,
		isActive: true,
		createdAt: now,
	});

	return c.json(
		{
			id: body.id,
			title: body.title,
			description: body.description,
			theme: body.theme,
			estimatedMinutes: body.estimatedMinutes,
			isActive: true,
			createdAt: now.toISOString(),
		},
		201,
	);
});

app.openapi(getSurveyRoute, async (c) => {
	const { id } = c.req.valid("param");
	const db = drizzle(c.env.DB);

	const survey = await db.select().from(surveys).where(eq(surveys.id, id)).get();

	if (!survey) {
		return c.json({ error: "Survey not found" }, 404);
	}

	return c.json(
		{
			id: survey.id,
			title: survey.title,
			description: survey.description,
			theme: survey.theme,
			estimatedMinutes: survey.estimatedMinutes,
			isActive: survey.isActive,
			createdAt: survey.createdAt.toISOString(),
		},
		200,
	);
});

export default app;
