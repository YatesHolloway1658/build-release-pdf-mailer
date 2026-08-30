import { buildReportRequest } from "../src/build_event.js";
import { emailReleaseReport } from "../src/report_sender.js";

const recipient = process.env.REPORT_RECIPIENT;
if (!recipient) throw new Error("REPORT_RECIPIENT is required");

const sample = buildReportRequest.parse({
  recipient,
  project: "creator-studio",
  buildId: "build-1842",
  commit: "7bd13f9c2e8a",
  branch: "release/video-captions",
  durationSeconds: 94,
  release: { environment: "production", status: "failed", version: "2026.08.29" },
  diagnostics: [
    { tool: "caption-validator", severity: "error", message: "Cue 41 overlaps cue 42 by 180ms" },
  ],
});

console.log(await emailReleaseReport(sample));
