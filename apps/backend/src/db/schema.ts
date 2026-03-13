import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 調査テーマ
export const surveys = sqliteTable("surveys", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	theme: text("theme").notNull(), // e.g. "online_ad_scam"
	estimatedMinutes: integer("estimated_minutes").notNull().default(10),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

// インタビューセッション
export const interviewSessions = sqliteTable("interview_sessions", {
	id: text("id").primaryKey(),
	surveyId: text("survey_id")
		.notNull()
		.references(() => surveys.id),
	stage: text("stage").notNull().default("intro"),
	// intro | narrative | clarify_entry_point | clarify_flow | clarify_harm | clarify_psychology | clarify_prevention | wrap_up | stop
	completionScore: real("completion_score").notNull().default(0),
	consentGiven: integer("consent_given", { mode: "boolean" }).notNull().default(false),
	burdenLevel: integer("burden_level").notNull().default(0),
	riskLevel: text("risk_level").notNull().default("none"),
	currentSlot: text("current_slot"), // 現在聞いている項目
	startedAt: integer("started_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	completedAt: integer("completed_at", { mode: "timestamp" }),
});

// 会話ログ
export const transcripts = sqliteTable("transcripts", {
	id: text("id").primaryKey(),
	sessionId: text("session_id")
		.notNull()
		.references(() => interviewSessions.id),
	turnIndex: integer("turn_index").notNull(),
	speaker: text("speaker").notNull(), // "ai" | "user"
	content: text("content").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

// 構造化抽出データ (CaseRecord の JSON 保存)
export const extractedCases = sqliteTable("extracted_cases", {
	id: text("id").primaryKey(),
	sessionId: text("session_id")
		.notNull()
		.references(() => interviewSessions.id)
		.unique(),
	caseType: text("case_type"), // victim | near_miss | unclear
	severityLevel: text("severity_level"),
	incidentSummary: text("incident_summary"),
	// JSON fields for complex nested data
	entryPoint: text("entry_point", { mode: "json" }).$type<{
		first_touch_channel: string | null;
		first_touch_platform: string | null;
		was_ad: boolean | null;
		ad_format: string | null;
		ad_platform: string | null;
		ad_claim_type: string[];
	}>(),
	actorProfile: text("actor_profile", { mode: "json" }).$type<{
		claimed_role: string[];
		claimed_affiliation: string[];
		trust_signal: string[];
		identity_verification_claim: string[];
	}>(),
	interactionFlow: text("interaction_flow", { mode: "json" }).$type<{
		moved_to_external_channel: boolean | null;
		external_channels: string[];
		asked_for_payment: boolean | null;
		asked_for_registration: boolean | null;
		asked_for_id_submission: boolean | null;
		asked_for_app_install: boolean | null;
		asked_for_remote_control: boolean | null;
		asked_for_crypto_transfer: boolean | null;
		asked_for_bank_transfer: boolean | null;
	}>(),
	harmOutcome: text("harm_outcome", { mode: "json" }).$type<{
		money_sent: boolean | null;
		estimated_amount_jpy: number | null;
		non_monetary_harm: string[];
		attempt_stopped_before_payment: boolean | null;
		felt_in_danger: boolean | null;
	}>(),
	psychology: text("psychology", { mode: "json" }).$type<{
		why_it_felt_believable: string[];
		warning_signs_noticed: string[];
		why_warning_signs_did_not_stop_action: string[];
		emotions_during: string[];
		emotions_after: string[];
	}>(),
	evidence: text("evidence", { mode: "json" }).$type<{
		has_screenshot: boolean | null;
		has_chat_log: boolean | null;
		has_transfer_record: boolean | null;
		has_ad_image_or_url: boolean | null;
		has_account_identifier: boolean | null;
	}>(),
	preventionSignal: text("prevention_signal", { mode: "json" }).$type<{
		what_platform_design_might_have_helped: string[];
		what_public_warning_might_have_helped: string[];
		what_information_or_support_might_have_helped: string[];
		what_should_be_improved_first: string[];
	}>(),
	safetyMeta: text("safety_meta", { mode: "json" }).$type<{
		pii_detected: boolean;
		secret_detected: boolean;
		burden_level: number;
		risk_level: string;
	}>(),
	qualityMeta: text("quality_meta", { mode: "json" }).$type<{
		completion_score: number;
		missing_fields: string[];
		confidence_notes: string[];
	}>(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});
