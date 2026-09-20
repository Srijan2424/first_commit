import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createEngine, type Identity } from "./engine";
import { store, type RecordData } from "./store";
import { files } from "./files";
import { makeCode, matchesCode } from "./policy";
import type { Profile } from "../../../shared/domain";
const execute = createEngine(store, files);
type HttpEvent = {
  rawPath: string;
  body?: string;
  headers: Record<string, string | undefined>;
  requestContext: { http: { method: string; sourceIp: string } };
};
function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function subject(phone: string) {
  const h = hash(phone);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
async function save(id: string, data: unknown, old?: RecordData | null) {
  await store.commit([
    {
      model: "AuditEvent",
      expected: old?.revision ?? null,
      record: {
        id,
        revision: (old?.revision ?? 0) + 1,
        data,
        fields: {
          actorOwner: "demo-system",
          eventType: "DEMO_AUTH",
          occurredAt: new Date().toISOString(),
          expireAt: Math.floor(Date.now() / 1000) + 86400,
        },
      },
    },
  ]);
}
export async function demoHttp(event: HttpEvent) {
  const send = (statusCode: number, data: unknown) => ({
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
    body: JSON.stringify(data),
  });
  if (process.env.DEMO_ENABLED !== "true")
    return send(404, { error: "Demo mode is disabled" });
  if (event.requestContext.http.method === "OPTIONS")
    return { statusCode: 204, body: "" };
  try {
    const path = event.rawPath.replace(/^\/api\/demo\//, "");
    const input = event.body ? JSON.parse(event.body) : {};
    const now = Date.now();
    if (path === "auth/start") {
      if (
        !/^\+91\d{10}$/.test(input.phone) ||
        !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(input.workspace)
      )
        return send(400, {
          error: "Enter a valid phone number and demo workspace",
        });
      const rateId = `demo-rate:${hash(event.requestContext.http.sourceIp)}:${Math.floor(now / 60000)}`;
      const rate = await store.get<{ count: number }>("AuditEvent", rateId);
      if ((rate?.data.count ?? 0) >= 20)
        return send(429, {
          error: "Please wait a minute before requesting another code",
        });
      await save(rateId, { count: (rate?.data.count ?? 0) + 1 }, rate);
      const challenge = randomUUID(),
        { code, secret } = makeCode();
      await save(`demo-code:${challenge}`, {
        phone: input.phone,
        workspace: input.workspace,
        secret,
        expires: now + 300000,
        attempts: 5,
      });
      return send(200, { challenge, code });
    }
    if (path === "auth/verify") {
      const id = `demo-code:${input.challenge}`;
      const challenge = await store.get<{
        phone: string;
        workspace: string;
        secret: string;
        expires: number;
        attempts: number;
      }>("AuditEvent", id);
      if (
        !challenge ||
        challenge.data.expires < now ||
        challenge.data.attempts <= 0
      )
        return send(400, { error: "Code expired. Request another code." });
      if (!matchesCode(challenge.data.secret, input.code)) {
        await save(
          id,
          { ...challenge.data, attempts: challenge.data.attempts - 1 },
          challenge,
        );
        return send(400, { error: "Incorrect code" });
      }
      const token = randomBytes(32).toString("hex");
      const accounts = await store.list<Profile>(
        "User",
        "byPhone",
        "phoneE164",
        challenge.data.phone,
      );
      const existing = accounts
        .filter((account) => account.fields.status === "ACTIVE")
        .sort((a, b) =>
          String(b.fields.updatedAt ?? "").localeCompare(
            String(a.fields.updatedAt ?? ""),
          ),
        )[0];
      const identity: Identity = {
        // Demo login is global by fictional phone, like the production account.
        // This lets the doctor and patient use different browsers or devices.
        sub: existing?.id ?? subject(challenge.data.phone),
        phone: challenge.data.phone,
        phoneVerified: true,
        groups: [],
        workspace: challenge.data.workspace,
      };
      await store.commit([
        {
          model: "AuditEvent",
          expected: challenge.revision,
          record: {
            ...challenge,
            revision: challenge.revision + 1,
            data: { ...challenge.data, attempts: 0, expires: 0 },
          },
        },
        {
          model: "AuditEvent",
          expected: null,
          record: {
            id: `demo-session:${hash(token)}`,
            revision: 1,
            data: { identity, expires: now + 12 * 3600000 },
            fields: {
              actorOwner: "demo-system",
              eventType: "DEMO_SESSION",
              occurredAt: new Date().toISOString(),
              expireAt: Math.floor(now / 1000) + 86400,
            },
          },
        },
      ]);
      return send(200, { token });
    }
    const token = event.headers.authorization?.replace(/^Bearer /, "") ?? "";
    const session = token
      ? await store.get<{ identity: Identity; expires: number }>(
          "AuditEvent",
          `demo-session:${hash(token)}`,
        )
      : null;
    if (!session || session.data.expires < now)
      return send(401, { error: "Please sign in again" });
    if (path === "auth/session") return send(200, { ok: true });
    if (path === "auth/logout") {
      await save(session.id, { ...session.data, expires: 0 }, session);
      return send(200, { ok: true });
    }
    const allowed = [
      "getHome",
      "saveProfile",
      "findPatient",
      "requestConsultation",
      "approveConsultation",
      "declineConsultation",
      "verifyConsultation",
      "getConsultation",
      "saveDraft",
      "closeConsultation",
      "issuePrescription",
      "getPrescription",
      "prepareCertificate",
      "submitCertificate",
    ];
    if (event.requestContext.http.method !== "POST" || !allowed.includes(path))
      return send(404, { error: "Operation unavailable" });
    const result = await execute(path, input, session.data.identity);
    if (path === "submitCertificate")
      await execute(
        "reviewDoctor",
        {
          doctorId: session.data.identity.sub,
          approve: true,
          reason:
            "Public demonstration workspace: simulated credential verification only",
        },
        {
          sub: "00000000-0000-4000-8000-000000000001",
          phoneVerified: true,
          groups: ["VerificationReviewers"],
        },
      );
    return send(200, result);
  } catch (e) {
    return send(400, {
      error:
        e instanceof Error ? e.message : "Unable to complete demo operation",
    });
  }
}
