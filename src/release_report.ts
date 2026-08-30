import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BuildReportRequest } from "./build_event.js";

export type ReportModel = {
  title: string;
  outcome: string;
  lines: string[];
};

export function modelReleaseReport(input: BuildReportRequest): ReportModel {
  const released = input.release.status === "succeeded";
  const lines = [
    `Project: ${input.project}`,
    `Build: ${input.buildId} (${input.commit.slice(0, 8)} on ${input.branch})`,
    `Target: ${input.release.environment} / ${input.release.version}`,
    `Duration: ${input.durationSeconds}s`,
  ];

  if (!released) {
    lines.push("Developer diagnostics:");
    lines.push(...input.diagnostics.map((item) =>
      `[${item.severity.toUpperCase()}] ${item.tool}: ${item.message}`
    ));
  }

  return {
    title: `${input.project} release report`,
    outcome: released ? "Release completed" : "Release needs attention",
    lines,
  };
}

export async function renderReleasePdf(model: ReportModel): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  page.drawText(model.title, { x: 54, y: 730, size: 20, font: bold, color: rgb(0.08, 0.12, 0.18) });
  page.drawText(model.outcome, { x: 54, y: 696, size: 13, font: bold, color: rgb(0.08, 0.35, 0.24) });
  model.lines.forEach((line, index) => {
    page.drawText(line.slice(0, 92), { x: 54, y: 660 - index * 22, size: 10, font: regular });
  });
  return document.save();
}
