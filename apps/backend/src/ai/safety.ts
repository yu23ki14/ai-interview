import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { type SafetyAssessment, safetyAssessmentSchema } from "../schemas/safety.js";

const SAFETY_PROMPT = `You are a safety classifier for a sensitive interview system.

Classify the participant's latest message for:
1. psychological burden
2. stop intent
3. high-risk distress
4. personally identifying information
5. secrets or authentication-related information

Use conservative judgment.
Do not over-classify ordinary sadness as emergency risk.

High risk means signals such as:
- panic-like distress
- fear of immediate danger
- self-harm or harm-related ideation
- severe inability to continue
- strong coercion or immediate threat`;

export async function classifySafety(
	provider: AnthropicProvider,
	message: string,
): Promise<SafetyAssessment> {
	const { object } = await generateObject({
		model: provider("claude-haiku-4-5-20251001"),
		schema: safetyAssessmentSchema,
		system: SAFETY_PROMPT,
		messages: [{ role: "user", content: message }],
	});

	return object;
}
