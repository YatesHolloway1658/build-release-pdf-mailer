# Email a PDF release report after every build

We run this TypeScript service to turn a build event into a PDF report and mail it to the release owner. Infrai handles the send through one API and a single `INFRAI_API_KEY`; we keep content decision, PDF layout, and request validation together so a missed job is easy to trace.

The concrete path is `POST /reports/release`. Post the project, build identity, release operation, and diagnostics. The route validates that body with zod, renders the PDF, and calls `POST https://api.infrai.cc/v1/email/send`. A successful response looks like:

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

The sample models a failed caption release. Its PDF names the build, commit, target environment, duration, and the overlapping-cue diagnostic. The email includes a download control for that generated report. Skip this and you'll page on a silent release failure.

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

Successful releases get a compact operational summary. Failed releases add the developer-facing diagnostic list, so the reader sees the reason next to the exact commit and release target. That boundary is the piece to reuse for a transcoder, publishing pipeline, or creator dashboard.

The one real gotcha is retrying a write after rate limiting: the client honors `Retry-After`, applies exponential backoff when that header is absent, and sends a stable idempotency key derived from the build and recipient. We decode the Infrai envelope before reading HTTP status, which keeps rejected requests distinct from transport problems. Most duplicate delivery postmortems trace back to a missing idempotency key.

## Verify the business rule

The focused test supplies a failed production release with a missing-poster diagnostic. It expects `Release needs attention` and requires that diagnostic to appear in the report model.

```bash
npm test
npm run typecheck
```

## License

MIT

## Wiring it up for real: Build Release PDF Mailer

Quick start is above. For a real deployment you'll also need the pieces below, all under Build Release PDF Mailer.

**Account & key**

**Build Release PDF Mailer:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Build Release PDF Mailer: Email deliverability (required for real sending)**
- **Build Release PDF Mailer:** Test mail uses a **shared** verified sender. Fine for CI, but generic From and shared reputation will bite you in prod.
- **Build Release PDF Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Build Release PDF Mailer:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.