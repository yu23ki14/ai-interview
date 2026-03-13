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
		detailThreshold: z.number(),
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

export const slotCardSchema = z
	.object({
		slotKey: z.string(),
		label: z.string(),
		extractedValue: z.unknown().nullable(),
		isFilled: z.boolean(),
		isDetailScorable: z.boolean(),
		detailScore: z.number().nullable(),
		isPickedUp: z.boolean(),
	})
	.openapi("SlotCard");

export const adminSessionDetailSchema = z
	.object({
		session: sessionSchema,
		extractedCase: z.record(z.string(), z.unknown()).nullable(),
		slots: z.array(slotCardSchema),
	})
	.openapi("AdminSessionDetail");

// Exemplar schemas
export const exemplarAnswerSchema = z
	.object({
		id: z.string(),
		surveyId: z.string(),
		sessionId: z.string(),
		slotKey: z.string(),
		rawText: z.string(),
		extractedValue: z.unknown(),
		pickedBy: z.string().nullable(),
		notes: z.string().nullable(),
		createdAt: z.string(),
	})
	.openapi("ExemplarAnswer");

export const createExemplarBodySchema = z
	.object({
		surveyId: z.string(),
		sessionId: z.string(),
		slotKey: z.string(),
		rawText: z.string(),
		extractedValue: z.unknown(),
		notes: z.string().optional(),
	})
	.openapi("CreateExemplarBody");

export const exemplarListQuerySchema = z
	.object({
		surveyId: z.string(),
		slotKey: z.string().optional(),
	})
	.openapi("ExemplarListQuery");

// Rubric schemas
export const rubricDimensionSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		weight: z.number(),
		levels: z.record(z.string(), z.string()),
	})
	.openapi("RubricDimension");

export const rubricCriteriaSchema = z
	.object({
		slot_key: z.string(),
		version: z.number(),
		dimensions: z.array(rubricDimensionSchema),
	})
	.openapi("RubricCriteria");

export const detailRubricSchema = z
	.object({
		id: z.string(),
		surveyId: z.string(),
		slotKey: z.string(),
		status: z.string(),
		criteria: rubricCriteriaSchema,
		generatedFrom: z.array(z.string()),
		createdAt: z.string(),
		activatedAt: z.string().nullable(),
	})
	.openapi("DetailRubric");

export const generateRubricBodySchema = z
	.object({
		surveyId: z.string(),
		slotKey: z.string(),
	})
	.openapi("GenerateRubricBody");

export const rubricListQuerySchema = z
	.object({
		surveyId: z.string(),
		slotKey: z.string().optional(),
	})
	.openapi("RubricListQuery");

// Error schema
export const errorSchema = z
	.object({
		error: z.string(),
	})
	.openapi("Error");
