import { z } from "zod";

export const summaryResponseSchema = z.object({
	known_points: z.array(z.string()),
	remaining_points: z.array(z.string()),
});

export type SummaryResponse = z.infer<typeof summaryResponseSchema>;
