import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { type TurnExtraction, turnExtractionSchema } from "../schemas/extraction.js";

const POST_VALIDATION_PROMPT = `あなたはオンライン広告詐欺・詐欺未遂に関する市民調査インタビューの情報抽出エンジンです。

以下はインタビューの全会話ログと、既に抽出済みのデータです。
既存データに**不足している情報のみ**を抽出してください。既存データにある情報は再抽出しないでください。

重要なルール：
- 会話全体を通して読み、既存データに含まれていない事実を見つけること
- 既存データで既にnull以外の値があるスカラーフィールドはnullを返すこと（上書きしない）
- 配列フィールドは、既存データにまだ含まれていない新しい項目のみを返すこと
- 同じ意味の情報を別の表現で追加しないこと（重複排除）
- 回答者が述べていない事実を推測しないこと
- 曖昧な場合はnullにするか、uncertain_fieldsに追加すること
- 回答者が明示しない限り、誰かを犯罪者と断定しないこと
- 回答者が質問に答えられない・答えたくないと示した場合、該当するスロットをunanswerable_slotsに追加すること

このシステムの目的：
- 公益のための調査研究
- 政策設計
- 市民的議論の準備
- 詐欺パターンと防止策の理解

日本語で統一し、表記ゆれを正規化してください。`;

/**
 * Run a post-validation extraction over the entire transcript.
 * Only extracts data that is missing from existingData — additive only.
 */
export async function postValidateTranscript(
	provider: AnthropicProvider,
	conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
	existingData: Record<string, unknown>,
): Promise<TurnExtraction> {
	const system =
		POST_VALIDATION_PROMPT +
		`\n\n既に抽出済みのデータ（これらを上書きせず、不足分のみ抽出すること）：\n${JSON.stringify(existingData, null, 2)}`;

	const { object } = await generateObject({
		model: provider("claude-sonnet-4-20250514"),
		schema: turnExtractionSchema,
		system,
		messages: conversationHistory,
	});

	return object;
}
