import assert from "node:assert/strict";
import test from "node:test";
import { buildReportRequest } from "../src/build_event.js";
import { modelReleaseReport } from "../src/release_report.js";

test("a failed release promotes developer diagnostics into the PDF model", () => {
  const input = buildReportRequest.parse({
    recipient: "developer@example.com",
    project: "media-pipeline",
    buildId: "build-73",
    commit: "abcdef123456",
    branch: "main",
    durationSeconds: 51,
    release: { environment: "production", status: "failed", version: "4.8.0" },
    diagnostics: [{ tool: "asset-check", severity: "error", message: "Poster frame is missing" }],
  });

  const report = modelReleaseReport(input);
  assert.equal(report.outcome, "Release needs attention");
  assert.ok(report.lines.includes("Developer diagnostics:"));
  assert.ok(report.lines.includes("[ERROR] asset-check: Poster frame is missing"));
});
