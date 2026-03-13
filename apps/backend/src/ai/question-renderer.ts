import type { AnthropicProvider } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const QUESTION_RENDERER_PROMPT = `あなたは市民調査のためのインタビュー質問を作成する専門家です。

回答者に対して、日本語で短い質問を1つだけ作成してください。

【絶対に守るルール】
- 質問は必ず1文のみ
- 60文字以内に収めること
- 質問の中に複数の例を列挙しない
- 回答者がすでに話した内容を繰り返さない
- 「スキップできます」等の案内は不要（UIにスキップボタンがあります）
- 良い質問の例：「送金するとき、少し不安はありましたか？」

【トーンのルール】
- 責めるような口調や、取り調べのような聞き方をしない
- 正確な記憶を強要しない
- 抽象的な制度論や仮定の話ではなく、回答者自身の気持ちや体験について聞く
- 誘導的な表現や法的な結論を含めない`;

const SLOT_DESCRIPTIONS: Record<string, string> = {
	case_type:
		"回答者とその出来事との関係。自分自身の体験か、危うく被害に遭いそうだったか、家族や知人の体験かを聞く。例：「ご自身が体験されたことですか？それともご家族やお知り合いのことですか？」",
	first_touch_channel: "その詐欺に最初にどうやって接触したか（例：SNS広告、メール、電話など）。",
	was_ad: "最初の接触が広告だったかどうか。",
	ad_platform: "その広告がどのプラットフォームに掲載されていたか。",
	claimed_role: "相手がどんな役割や身分を名乗っていたか。",
	moved_to_external_channel: "やりとりが別の連絡手段（例：LINE、WhatsApp）に移ったかどうか。",
	money_sent: "実際にお金を送ったかどうか。",
	attempt_stopped_before_payment: "送金する前に止めることができたかどうか。",
	estimated_amount_jpy:
		"関わった金額のおおよその規模。正確な金額ではなく、数万円・数十万円・それ以上のような範囲で優しく聞く。",
	why_it_felt_believable: "なぜその話が本当らしく感じられたか、信じてしまった理由。",
	warning_signs_noticed:
		"体験中や後に気づいた違和感や不審な点。無視してしまったものも含めて、少しでも引っかかったこと。",
	emotions_during:
		"体験中のある瞬間（文脈から1つ選ぶ：広告を見たとき、やりとり中、送金時など）に感じた気持ち。「不安はありましたか」「期待する気持ちはありましたか」のように、はい/いいえで答えやすい形で聞く。",
	emotions_after:
		"状況に気づいた後の気持ち。怒り、後悔、自分を責める気持ちなど、1つの感情について聞く。その気持ちは自然なことだと軽く添える。",
	non_monetary_harm:
		"お金以外で日常生活に影響があったかどうか（例：睡眠、人間関係、他人への信頼など）。はい/いいえで答えやすい形で聞く。",
	what_platform_design_might_have_helped:
		"途中で警告や確認ステップがあったら立ち止まれたかもしれない瞬間があったかどうか。回答者自身の体験として聞く（例：「途中で誰かに止めてほしかったと思う瞬間はありましたか」）。プラットフォームの機能設計を考えさせるような聞き方はしない。",
	what_public_warning_might_have_helped:
		"体験前にこの種の詐欺に関する注意喚起を見たことがあったか、もっと情報があれば助かったか。",
	what_information_or_support_might_have_helped:
		"体験の前や最中に、あったら助かったと思う情報やサポートがあるか。",
	what_should_be_improved_first:
		"他の人が同じ体験をしないために、1つだけ変えられるとしたら何を変えたいか。自由に、シンプルに聞く。",
};

export interface DetailContext {
	isFollowUp: boolean;
	currentScore?: number;
	existingValue?: unknown;
}

export async function renderQuestion(
	provider: AnthropicProvider,
	nextSlot: string,
	context: string,
	detailContext?: DetailContext,
	caseType?: string | null,
	recentHistory?: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
	const slotDescription = SLOT_DESCRIPTIONS[nextSlot] || nextSlot;

	let prompt = `これまでにわかっている情報：\n${context}\n\n次のトピックについて質問を作成してください：${slotDescription}\n\nスロット名：${nextSlot}`;

	if (caseType === "family") {
		prompt +=
			`\n\n重要：回答者はご家族やお知り合いの体験について話しています。本人の体験ではありません。` +
			`\n質問の作り方：` +
			`\n- 「ご家族は〜」と機械的に主語を置き換えるのではなく、文全体を自然な日本語に整えてください` +
			`\n- 事実関係の質問は「ご家族の場合」の視点で聞く（例：「ご家族はどういう経緯でそのサイトを知ったと聞いていますか？」）` +
			`\n- 気持ちや心理の質問は、回答者自身の視点で聞いてもよい（例：「そのとき、あなたから見てどう感じましたか？」）` +
			`\n- 不自然な文にならないよう、必ず声に出して読んでも違和感がないか確認してください`;
	}

	if (detailContext?.isFollowUp) {
		prompt +=
			`\n\n重要：このトピックについて回答者はすでに回答しています。` +
			`\n現在の回答内容：${JSON.stringify(detailContext.existingValue)}` +
			`\nまだ触れていない具体的な角度から掘り下げるフォローアップ質問を作ってください。` +
			`\n答えやすいように具体的な観点を提示する（例：「周りの人の反応はいかがでしたか？」「その前に何か違和感はありましたか？」）` +
			`\nすでに話した内容を繰り返さないこと。同じ質問を再度しないこと。` +
			`\n1つの具体的な角度を選び、それについて直接聞いてください。`;
	}

	// Include full conversation history to avoid repeating questions and to inform follow-ups
	if (recentHistory && recentHistory.length > 0) {
		const historyText = recentHistory
			.map((m) => `${m.role === "assistant" ? "AI" : "User"}: ${m.content}`)
			.join("\n");
		prompt += `\n\nこれまでの会話全文（以下の質問を繰り返したり言い換えたりしないこと）：\n${historyText}`;
	}

	const { text } = await generateText({
		model: provider("claude-haiku-4-5-20251001"),
		system: QUESTION_RENDERER_PROMPT,
		prompt,
	});

	return text;
}
