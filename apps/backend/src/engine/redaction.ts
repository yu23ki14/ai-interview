const REDACTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
	{
		pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
		label: "[REDACTED:email]",
	},
	{
		pattern: /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}|\+81[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/g,
		label: "[REDACTED:phone]",
	},
	{
		pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
		label: "[REDACTED:card]",
	},
	{
		pattern: /(?:口座番号|口座)[\s:：]*\d{6,8}/g,
		label: "[REDACTED:bank_account]",
	},
	{
		pattern: /(?:パスワード|password|暗証番号)[\s:：]*\S+/gi,
		label: "[REDACTED:password]",
	},
	{
		pattern: /(?:OTP|認証コード|ワンタイム|確認コード)[\s:：]*\d{4,8}/gi,
		label: "[REDACTED:otp]",
	},
];

export function redactPII(text: string): string {
	let result = text;
	for (const { pattern, label } of REDACTION_PATTERNS) {
		result = result.replace(pattern, label);
	}
	return result;
}
