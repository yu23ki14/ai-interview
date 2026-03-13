import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { createAnthropicProvider } from "../ai/provider.js";
import { generateSummary } from "../ai/summary.js";
import { extractedCases, interviewSessions } from "../db/schema.js";
import { errorSchema, summaryApiResponseSchema } from "../schemas/api.js";

type Bindings = {
	DB: D1Database;
	ENVIRONMENT: string;
	ANTHROPIC_API_KEY: string;
};

const app = new OpenAPIHono<{ Bindings: Bindings }>();

const getSummaryRoute = createRoute({
	method: "get",
	path: "/api/sessions/{id}/summary",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: summaryApiResponseSchema,
				},
			},
			description: "Session summary",
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

app.openapi(getSummaryRoute, async (c) => {
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

	// Get extracted case data
	const caseRecord = await db
		.select()
		.from(extractedCases)
		.where(eq(extractedCases.sessionId, id))
		.get();

	if (!caseRecord) {
		return c.json({ error: "Session not found" }, 404);
	}

	// Build case data string for summary
	const parts: string[] = [];
	if (caseRecord.caseType) parts.push(`Case type: ${caseRecord.caseType}`);
	if (caseRecord.incidentSummary) parts.push(`Summary: ${caseRecord.incidentSummary}`);
	if (caseRecord.entryPoint) {
		const ep = caseRecord.entryPoint;
		if (ep.first_touch_channel) parts.push(`First contact: ${ep.first_touch_channel}`);
		if (ep.was_ad !== null) parts.push(`Was ad: ${ep.was_ad}`);
		if (ep.ad_platform) parts.push(`Ad platform: ${ep.ad_platform}`);
	}
	if (caseRecord.actorProfile) {
		const ap = caseRecord.actorProfile;
		if (ap.claimed_role.length > 0) parts.push(`Claimed role: ${ap.claimed_role.join(", ")}`);
	}
	if (caseRecord.interactionFlow) {
		const flow = caseRecord.interactionFlow;
		if (flow.moved_to_external_channel !== null)
			parts.push(`Moved to external: ${flow.moved_to_external_channel}`);
	}
	if (caseRecord.harmOutcome) {
		const harm = caseRecord.harmOutcome;
		if (harm.money_sent !== null) parts.push(`Money sent: ${harm.money_sent}`);
		if (harm.estimated_amount_jpy !== null) parts.push(`Amount: ${harm.estimated_amount_jpy} JPY`);
	}
	if (caseRecord.psychology) {
		const psy = caseRecord.psychology;
		if (psy.why_it_felt_believable.length > 0)
			parts.push(`Why believable: ${psy.why_it_felt_believable.join(", ")}`);
		if (psy.warning_signs_noticed.length > 0)
			parts.push(`Warning signs: ${psy.warning_signs_noticed.join(", ")}`);
	}

	const caseDataStr = parts.length > 0 ? parts.join("\n") : "No information gathered yet.";

	const provider = createAnthropicProvider(c.env.ANTHROPIC_API_KEY);
	const summary = await generateSummary(provider, caseDataStr);

	return c.json(
		{
			knownPoints: summary.known_points,
			remainingPoints: summary.remaining_points,
		},
		200,
	);
});

export default app;
