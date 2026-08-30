import type { BuildReportRequest } from "./build_event.js";
import { sendReportEmail } from "./infrai_email.js";
import { modelReleaseReport, renderReleasePdf } from "./release_report.js";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export async function emailReleaseReport(input: BuildReportRequest) {
  const report = modelReleaseReport(input);
  const pdf = await renderReleasePdf(report);
  const encodedPdf = Buffer.from(pdf).toString("base64");
  const filename = `${input.project}-${input.buildId}-report.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-");
  const html = [
    `<h1>${escapeHtml(report.outcome)}</h1>`,
    `<p>Build <strong>${escapeHtml(input.buildId)}</strong> targeted ${escapeHtml(input.release.environment)}.</p>`,
    `<p><a download="${escapeHtml(filename)}" href="data:application/pdf;base64,${encodedPdf}">Download the PDF release report</a></p>`,
  ].join("");

  const delivery = await sendReportEmail({
    to: input.recipient,
    subject: `[${input.release.status}] ${input.project} ${input.release.version}`,
    html,
    idempotencyKey: `release-report:${input.project}:${input.buildId}:${input.recipient}`,
  });
  return { messageId: delivery.message_id, outcome: report.outcome, filename };
}
