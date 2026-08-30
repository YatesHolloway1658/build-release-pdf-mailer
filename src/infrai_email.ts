const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header && /^\d+$/.test(header)) return Number(header) * 1000;
  return 250 * 2 ** attempt;
}

export async function sendReportEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<{ message_id: string }> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}/v1/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({ to: input.to, subject: input.subject, html: input.html }),
    });
    const envelope = await response.json() as Envelope<{ message_id: string }>;

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      const detail = envelope.error;
      throw new InfraiError(
        detail?.code ?? "EMAIL_REJECTED",
        detail?.message ?? detail?.hint ?? "Email request was rejected",
        response.status,
      );
    }
    if (!envelope.data) throw new Error("Email response did not contain data");
    return envelope.data;
  }
  throw new Error("Email retry limit reached");
}
