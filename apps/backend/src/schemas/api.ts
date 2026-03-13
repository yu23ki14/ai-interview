import { z } from "@hono/zod-openapi";

// Survey schemas
export const surveySchema = z
	.object({
		id: z.string(),
		title: z.string(),
		description: z.string(),
		theme: z.string(),
		estimatedMinutes: z.number(),
		isActive: z.boolean(),
		createdAt: z.string(),
	})
	.openapi("Survey");

// Session schemas
export const sessionSchema = z
	.object({
		id: z.string(),
		surveyId: z.string(),
		stage: z.string(),
		completionScore: z.number(),
		consentGiven: z.boolean(),
		burdenLevel: z.number(),
		riskLevel: z.string(),
		currentSlot: z.string().nullable(),
		startedAt: z.string(),
		completedAt: z.string().nullable(),
	})
	.openapi("Session");

export const createSessionBodySchema = z
	.object({
		surveyId: z.string(),
	})
	.openapi("CreateSessionBody");

export const createSessionResponseSchema = z
	.object({
		session: sessionSchema,
		message: z.string(),
	})
	.openapi("CreateSessionResponse");

// Message schemas
export const transcriptEntrySchema = z
	.object({
		id: z.string(),
		sessionId: z.string(),
		turnIndex: z.number(),
		speaker: z.string(),
		content: z.string(),
		createdAt: z.string(),
	})
	.openapi("TranscriptEntry");

export const sendMessageBodySchema = z
	.object({
		content: z.string().min(1),
	})
	.openapi("SendMessageBody");

export const sendMessageResponseSchema = z
	.object({
		message: z.string(),
		stage: z.string(),
		completionScore: z.number(),
		shouldEnd: z.boolean(),
		safetyWarning: z.string().optional(),
	})
	.openapi("SendMessageResponse");

// Summary schemas
export const summaryApiResponseSchema = z
	.object({
		knownPoints: z.array(z.string()),
		remainingPoints: z.array(z.string()),
	})
	.openapi("SummaryResponse");

// Admin schemas
export const adminSessionListItemSchema = z
	.object({
		id: z.string(),
		surveyId: z.string(),
		stage: z.string(),
		completionScore: z.number(),
		startedAt: z.string(),
		completedAt: z.string().nullable(),
	})
	.openapi("AdminSessionListItem");

export const adminSessionDetailSchema = z
	.object({
		session: sessionSchema,
		extractedCase: z.record(z.string(), z.unknown()).nullable(),
	})
	.openapi("AdminSessionDetail");

// Error schema
export const errorSchema = z
	.object({
		error: z.string(),
	})
	.openapi("Error");
