import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { type SummaryResponse, summaryResponseSchema } from "../schemas/summary.js";

const SUMMARY_PROMPT = `You are a summarization engine for a sensitive interview.

Based on the redacted case summary and filled fields, generate:
1. known_points: what is already understood
2. remaining_points: what is still useful to confirm next

Constraints:
- do not include personal identifiers
- do not add unconfirmed facts
- do not sound accusatory
- keep remaining_points to at most 3 items
- write in plain Japanese for general citizens`;

export async function generateSummary(
	provider: AnthropicProvider,
	caseData: string,
): Promise<SummaryResponse> {
	const { object } = await generateObject({
		model: provider("claude-sonnet-4-20250514"),
		schema: summaryResponseSchema,
		system: SUMMARY_PROMPT,
		messages: [{ role: "user", content: caseData }],
	});

	return object;
}
