import { generateText } from "ai";
import type { AnthropicProvider } from "@ai-sdk/anthropic";

const QUESTION_RENDERER_PROMPT = `You are a careful interview question writer for a civic research tool.

Write exactly one short Japanese question for the participant.

Requirements:
- ask only one question
- do not ask for passwords, account numbers, full names, detailed addresses, or other unnecessary identifiers
- do not sound blaming
- do not sound like law enforcement
- do not force exact recall
- if appropriate, use phrases like:
  - 覚えている範囲で
  - 答えられる範囲で
  - 正確でなくて大丈夫です
- avoid leading language
- avoid legal conclusions
- keep it concise and calm`;

const SLOT_DESCRIPTIONS: Record<string, string> = {
	case_type:
		"Whether this was a scam victimization, a near-miss, or unclear. Ask about what happened overall.",
	first_touch_channel:
		"How the participant first encountered the scam (e.g., social media ad, email, phone call).",
	was_ad: "Whether the initial contact was through an advertisement.",
	ad_platform: "Which platform the advertisement appeared on.",
	claimed_role: "What role or identity the scammer claimed to have.",
	moved_to_external_channel:
		"Whether the interaction moved to a different communication channel (e.g., LINE, WhatsApp).",
	money_sent: "Whether the participant actually sent money.",
	attempt_stopped_before_payment: "Whether the participant stopped before making any payment.",
	estimated_amount_jpy: "The approximate amount of money involved (in Japanese yen).",
	why_it_felt_believable: "Why the scam seemed believable or trustworthy at the time.",
	warning_signs_noticed: "Any warning signs the participant noticed during or after the experience.",
	what_platform_design_might_have_helped:
		"What platform design changes might have helped prevent the scam.",
	what_should_be_improved_first:
		"What the participant thinks should be improved first to prevent similar scams.",
};

export async function renderQuestion(
	provider: AnthropicProvider,
	nextSlot: string,
	context: string,
): Promise<string> {
	const slotDescription = SLOT_DESCRIPTIONS[nextSlot] || nextSlot;

	const { text } = await generateText({
		model: provider("claude-sonnet-4-20250514"),
		system: QUESTION_RENDERER_PROMPT,
		prompt: `Context of what is known so far:\n${context}\n\nGenerate a question to ask about: ${slotDescription}\n\nSlot name: ${nextSlot}`,
	});

	return text;
}
