import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import type { z } from "zod";
import { FIELD_LABELS, getFocusFields } from "../engine/slot-fields.js";
import {
	buildFocusedFactsSchema,
	type TurnExtraction,
	turnExtractionSchema,
} from "../schemas/extraction.js";

const EXTRACTOR_PROMPT = `あなたはオンライン広告詐欺・詐欺未遂に関する市民調査インタビューの情報抽出エンジンです。

あなたの仕事は、回答者の最新メッセージから構造化されたシグナルを抽出することです。

このシステムの目的：
- 公益のための調査研究
- 政策設計
- 市民的議論の準備
- 詐欺パターンと防止策の理解

このシステムの目的ではないもの：
- 法執行
- 法的判断
- 当局への通報
- 加害者の特定

重要なルール：
- 回答者が述べていない事実を推測しないこと
- 曖昧な場合はnullにするか、uncertain_fieldsに追加すること
- 回答者が明示しない限り、誰かを犯罪者と断定しないこと
- 個人識別情報や秘密情報の存在を検出すること
- 苦痛や中断の意思を検出すること
- 回答者が質問に答えられない・答えたくないと示した場合、該当するスロットをunanswerable_slotsに追加すること：
  - 覚えていない：覚えていません、わかりません、思い出せません
  - 答えたくない：答えたくない、言いたくない、パスしたい、スキップ、次の質問へ、飛ばして
  - 一般的な拒否：いいです、大丈夫です（拒否として使われた場合）
  スロットのフィールド名を使うこと（例："warning_signs_noticed", "estimated_amount_jpy"）

case_type "family" に関する重要事項：
- 回答者がご家族やお知り合いの体験を報告している場合、心理や防止策のスロットを自動的にunanswerableとしないこと
- ご家族でも、なぜ信じてしまったか、違和感、感情、防止策のアイデアなどについて第三者の視点から貴重な情報を提供できる
- 回答者がその特定の質問に対して明確に答えられない・答えたくないと述べた場合のみunanswerableとすること

【最も重要】既存データとの重複を避けること：
- 下記に「既に抽出済みのデータ」が提示される場合、同じ意味の情報を別の表現で再抽出しないこと
- 配列フィールドには、既存データにまだ含まれていない「新しい情報」のみを返すこと
- 既存データと意味が同じで表現だけが違うものは追加しないこと（例：「投資経験30年」が既にあれば「30年の投資経験」は追加しない）
- 最新のメッセージに新しい情報がなければ、配列フィールドは空配列を返すこと`;

/**
 * Build a focus instruction block for the extractor prompt.
 * When currentSlot is provided, the LLM is told to prioritise specific fields.
 */
function buildFocusInstruction(currentSlot: string): string {
	const fields = getFocusFields(currentSlot);
	if (!fields) return "";

	const labels = fields
		.map((f) => FIELD_LABELS[f] ?? f)
		.map((l) => `  - ${l}`)
		.join("\n");

	return (
		`\n\n【今回のフォーカスフィールド】\n` +
		`現在のインタビューでは以下の項目について質問しています。これらのフィールドを優先的に抽出してください：\n` +
		`${labels}\n\n` +
		`上記以外のフィールドは、回答者が自発的に新しい情報を述べた場合のみ抽出してください。` +
		`新しい情報がなければnullまたは空配列を返してください。`
	);
}

/**
 * Build a narrowed extraction schema when a focus slot is active.
 * The facts sub-object only contains the focused fields + always-present fields,
 * reducing output tokens and latency.
 */
function buildFocusedSchema(
	focusFields: readonly string[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
	const factsSchema = buildFocusedFactsSchema(focusFields);
	return turnExtractionSchema.extend({ facts: factsSchema.optional() }) as z.ZodObject<
		Record<string, z.ZodTypeAny>
	>;
}

export async function extractFromMessage(
	provider: AnthropicProvider,
	conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
	currentMessage: string,
	existingData?: Record<string, unknown>,
	currentSlot?: string | null,
): Promise<TurnExtraction> {
	let system = EXTRACTOR_PROMPT;
	if (existingData) {
		system += `\n\n既に抽出済みのデータ（同じ意味の情報を再抽出しないこと）：\n${JSON.stringify(existingData, null, 2)}`;
	}

	const focusFields = currentSlot ? getFocusFields(currentSlot) : undefined;
	if (currentSlot) {
		system += buildFocusInstruction(currentSlot);
	}

	const messages = [
		...conversationHistory.map((m) => ({
			role: m.role as "user" | "assistant",
			content: m.content,
		})),
		{ role: "user" as const, content: currentMessage },
	];

	// Use narrowed schema when a focus slot is active to reduce output tokens
	const schema = focusFields ? buildFocusedSchema(focusFields) : turnExtractionSchema;

	const { object } = await generateObject({
		model: provider("claude-sonnet-4-20250514"),
		schema,
		system,
		messages,
	});

	return object as TurnExtraction;
}
