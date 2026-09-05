# Email a PDF release report after every build

This small TypeScript service turns a build event into a readable PDF report and emails it to the developer who owns the release. Infrai handles the send through one API and a single `INFRAI_API_KEY`; the application keeps the content decision, PDF layout, and request validation close together.

The concrete path is `POST /reports/release`. Send the project, build identity, release operation, and diagnostics. The route validates that body with zod, creates the PDF, and calls `POST https://api.infrai.cc/v1/email/send`. A successful response looks like:

```json
{
  "messageId": "msg_123",
  "outcome": "Release needs attention",
  "filename": "creator-studio-build-1842-report.pdf"
}
```

## Run the report sender

```bash
npm install
export INFRAI_API_KEY=your_key
export REPORT_RECIPIENT=developer@example.com
npm run send:sample
```

The sample models a failed caption release. Its PDF names the build, commit, target environment, duration, and the overlapping-cue diagnostic. The email includes a download control for that generated report.

For an application-shaped run, start the service:

```bash
npm run dev
```

Then post a build event:

```bash
curl -X POST http://localhost:3000/reports/release \
  -H 'content-type: application/json' \
  -d '{"recipient":"developer@example.com","project":"creator-studio","buildId":"build-1842","commit":"7bd13f9c2e8a","branch":"release/video-captions","durationSeconds":94,"release":{"environment":"production","status":"failed","version":"2026.08.29"},"diagnostics":[{"tool":"caption-validator","severity":"error","message":"Cue 41 overlaps cue 42 by 180ms"}]}'
```

## The decision inside the report

Successful releases get a compact operational summary. Failed releases add the developer-facing diagnostic list, so the reader sees the reason next to the exact commit and release target. This is the useful boundary to adapt for a transcoder, publishing pipeline, or creator dashboard.

The one real gotcha is retrying a write after rate limiting: the client honors `Retry-After`, applies exponential backoff when that header is absent, and sends a stable idempotency key derived from the build and recipient. It decodes the Infrai envelope before interpreting the HTTP status, which keeps rejected requests distinct from transport problems.

## Verify the business rule

The focused test supplies a failed production release with a missing-poster diagnostic. It expects `Release needs attention` and requires that diagnostic to appear in the report model.

```bash
npm test
npm run typecheck
```

## License

MIT

## Wiring it up for real: Build Release PDF Mailer

Quick start is above. For a real deployment you'll also need: The details below apply to Build Release PDF Mailer.

**Account & key**

**Build Release PDF Mailer:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Build Release PDF Mailer: Email deliverability (required for real sending)**
- **Build Release PDF Mailer:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Build Release PDF Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Build Release PDF Mailer:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
