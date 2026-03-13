import { generateObject } from "ai";
import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { turnExtractionSchema, type TurnExtraction } from "../schemas/extraction.js";

const EXTRACTOR_PROMPT = `You are an extraction engine for a civic research interview about online advertisement scams and scam-related near-miss experiences.

Your task is to extract structured signals from the participant's latest message.

This system is for:
- public-interest research
- policy design
- civic deliberation preparation
- understanding scam patterns and prevention opportunities

This system is NOT for:
- law enforcement
- legal judgment
- reporting to authorities
- identifying perpetrators

Important rules:
- Do not infer facts the participant did not state.
- If something is ambiguous, leave it null or add it to uncertain_fields.
- Do not classify anyone as definitively criminal unless explicitly stated by the participant.
- Detect possible personal identifiers and secrets if present.
- Detect possible distress or stop intent.
- If the participant indicates they cannot or do not want to answer a question, identify the relevant slot and add it to unanswerable_slots. This includes:
  - Cannot remember: 覚えていません, わかりません, 思い出せません
  - Does not want to answer: 答えたくない, 言いたくない, パスしたい, スキップ, 次の質問へ, 飛ばして
  - General decline: いいです, 大丈夫です (when used as refusal)
  Use the slot field names (e.g., "warning_signs_noticed", "estimated_amount_jpy").`;

export async function extractFromMessage(
	provider: AnthropicProvider,
	conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
	currentMessage: string,
): Promise<TurnExtraction> {
	const messages = [
		...conversationHistory.map((m) => ({
			role: m.role as "user" | "assistant",
			content: m.content,
		})),
		{ role: "user" as const, content: currentMessage },
	];

	const { object } = await generateObject({
		model: provider("claude-sonnet-4-20250514"),
		schema: turnExtractionSchema,
		system: EXTRACTOR_PROMPT,
		messages,
	});

	return object;
}
