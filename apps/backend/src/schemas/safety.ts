import { z } from "zod";

export const safetyAssessmentSchema = z.object({
	burden_level: z.number().min(0).max(3),
	stop_intent: z.boolean(),
	risk_level: z.enum(["none", "low", "medium", "high"]),
	pii_detected: z.boolean(),
	secret_detected: z.boolean(),
	reasoning: z.string().optional(),
});

export type SafetyAssessment = z.infer<typeof safetyAssessmentSchema>;
