import { generateText } from "ai";
import type { AnthropicProvider } from "@ai-sdk/anthropic";

const QUESTION_RENDERER_PROMPT = `You are a careful interview question writer for a civic research tool.

Write exactly one short Japanese question for the participant.

CRITICAL — keep it short:
- the question MUST be exactly 1 sentence
- the total length MUST be under 60 characters
- do NOT list multiple examples in the question itself
- do NOT repeat context the participant already shared
- do NOT add any skip/pass notes — the UI provides a skip button separately
- a good question is 1 simple sentence like: "送金するとき、少し不安はありましたか？"

Tone rules:
- do not sound blaming or like law enforcement
- do not force exact recall
- ask about the participant's own feelings and experiences, not about abstract systems or hypotheticals
- avoid leading language and legal conclusions`;

const SLOT_DESCRIPTIONS: Record<string, string> = {
	case_type:
		"The participant's relationship to the incident. Ask whether they experienced it themselves (victim), almost fell for it (near-miss), or heard about it from a family member or friend (family). Keep it simple like: ご自身が体験されたことですか？それともご家族やお知り合いのことですか？",
	first_touch_channel:
		"How the participant first encountered the scam (e.g., social media ad, email, phone call).",
	was_ad: "Whether the initial contact was through an advertisement.",
	ad_platform: "Which platform the advertisement appeared on.",
	claimed_role: "What role or identity the scammer claimed to have.",
	moved_to_external_channel:
		"Whether the interaction moved to a different communication channel (e.g., LINE, WhatsApp).",
	money_sent: "Whether the participant actually sent money.",
	attempt_stopped_before_payment: "Whether the participant stopped before making any payment.",
	estimated_amount_jpy:
		"The approximate amount of money involved. Ask gently using ranges like 数万円/数十万円/それ以上 rather than exact numbers.",
	why_it_felt_believable: "Why the scam seemed believable or trustworthy at the time.",
	warning_signs_noticed:
		"Any warning signs the participant noticed during or after — something that felt a bit off, even if they ignored it.",
	emotions_during:
		"What the participant felt during a specific moment (pick one from context: seeing the ad, chatting, sending money). Ask as a yes/no-able feeling question like 不安はありましたか or 期待する気持ちはありましたか.",
	emotions_after:
		"What the participant felt after realizing the situation. Ask about one feeling, e.g., 怒り、後悔、自分を責める気持ち. Normalize it briefly.",
	non_monetary_harm:
		"Whether the experience affected their daily life beyond money — e.g., sleep, relationships, trust in others. Ask as a simple yes/no-able question.",
	what_platform_design_might_have_helped:
		"Whether there was a moment where a warning or confirmation step could have made them pause. Ask about THEIR experience: e.g., 途中で誰かに止めてほしかったと思う瞬間はありましたか. Do NOT ask them to design platform features.",
	what_public_warning_might_have_helped:
		"Whether they had seen any warnings about this type of scam before the experience, or whether more information would have helped.",
	what_information_or_support_might_have_helped:
		"Whether there is any information or support they wish they had before or during the experience.",
	what_should_be_improved_first:
		"If they could change one thing to prevent others from having the same experience, what would it be. Keep it open and simple.",
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
