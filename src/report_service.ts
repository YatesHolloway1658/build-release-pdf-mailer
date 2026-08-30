import express from "express";
import { ZodError } from "zod";
import { buildReportRequest } from "./build_event.js";
import { InfraiError } from "./infrai_email.js";
import { emailReleaseReport } from "./report_sender.js";

const service = express();
service.use(express.json({ limit: "256kb" }));

service.post("/reports/release", async (request, response) => {
  try {
    const input = buildReportRequest.parse(request.body);
    response.status(202).json(await emailReleaseReport(input));
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "invalid_request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.code, message: error.message });
      return;
    }
    response.status(500).json({ error: "report_delivery_failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
service.listen(port, () => console.log(`Report service listening on http://localhost:${port}`));
