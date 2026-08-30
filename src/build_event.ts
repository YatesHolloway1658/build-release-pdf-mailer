import { z } from "zod";

export const buildReportRequest = z.object({
  recipient: z.string().email(),
  project: z.string().min(1).max(80),
  buildId: z.string().min(1).max(80),
  commit: z.string().min(7).max(64),
  branch: z.string().min(1).max(120),
  durationSeconds: z.number().int().nonnegative(),
  release: z.object({
    environment: z.enum(["preview", "staging", "production"]),
    status: z.enum(["succeeded", "failed"]),
    version: z.string().min(1).max(80)
  }),
  diagnostics: z.array(z.object({
    tool: z.string().min(1).max(60),
    severity: z.enum(["info", "warning", "error"]),
    message: z.string().min(1).max(500)
  })).max(30)
});

export type BuildReportRequest = z.infer<typeof buildReportRequest>;
