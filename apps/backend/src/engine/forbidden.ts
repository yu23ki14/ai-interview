export interface ForbiddenDetection {
	categories: string[];
	hasViolation: boolean;
}

const FORBIDDEN_PATTERNS: Array<{ category: string; pattern: RegExp }> = [
	{ category: "password", pattern: /(?:パスワード|password|暗証番号)[\s:：]*\S+/i },
	{ category: "otp", pattern: /(?:OTP|認証コード|ワンタイム|確認コード)[\s:：]*\d{4,8}/i },
	{
		category: "bank_account",
		pattern: /(?:口座番号|口座)[\s:：]*\d{6,8}/,
	},
	{
		category: "card_number",
		pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
	},
	{
		category: "private_key",
		pattern: /(?:秘密鍵|private\s*key|seed\s*phrase)[\s:：]*\S+/i,
	},
	{
		category: "detailed_address",
		pattern:
			/(?:東京都|大阪府|北海道|(?:京都|神奈川|埼玉|千葉|愛知|福岡)県?)(?:[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー\d]+){3,}/u,
	},
	{
		category: "phone_number",
		pattern: /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}|\+81[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/,
	},
	{
		category: "email",
		pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
	},
	{
		category: "full_name",
		pattern: /(?:名前は|氏名[\s:：]*)[\p{Script=Han}]{1,4}\s?[\p{Script=Han}]{1,4}/u,
	},
];

export function detectForbiddenData(text: string): ForbiddenDetection {
	const categories: string[] = [];

	for (const { category, pattern } of FORBIDDEN_PATTERNS) {
		if (pattern.test(text)) {
			categories.push(category);
		}
	}

	return {
		categories,
		hasViolation: categories.length > 0,
	};
}
