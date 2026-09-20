import type { Plugin } from "vite";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  existsSync,
} from "node:fs";
import { resolve } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import {
  createEngine,
  type Identity,
  type Files,
} from "../amplify/functions/clinical/engine";
import {
  Conflict,
  type Store,
  type Model,
  type RecordData,
  type Write,
} from "../amplify/functions/clinical/store";
import {
  validateBytes,
  renderPrescription,
} from "../amplify/functions/clinical/files";
import { makeCode, matchesCode } from "../amplify/functions/clinical/policy";
import type { Prescription } from "../shared/domain";
class DiskStore implements Store {
  private path: string;
  constructor(path: string) { this.path = path; }
  read(): Record<string, RecordData> {
    return existsSync(this.path)
      ? JSON.parse(readFileSync(this.path, "utf8"))
      : {};
  }
  async get<T>(model: Model, id: string) {
    return (this.read()[`${model}:${id}`] as RecordData<T>) ?? null;
  }
  async list<T>(model: Model, _index: string, key: string, value: string) {
    return Object.entries(this.read())
      .filter(([k, v]) => k.startsWith(`${model}:`) && v.fields[key] === value)
      .map(([, v]) => v) as RecordData<T>[];
  }
  async commit(writes: Write[]) {
    const data = this.read();
    for (const w of writes) {
      const old = data[`${w.model}:${w.record.id}`];
      if (w.expected === null ? !!old : old?.revision !== w.expected)
        throw new Conflict();
    }
    for (const w of writes)
      if (!w.check) data[`${w.model}:${w.record.id}`] = w.record;
    writeFileSync(`${this.path}.tmp`, JSON.stringify(data), { mode: 0o600 });
    renameSync(`${this.path}.tmp`, this.path);
  }
}
export function demoServer(): Plugin {
  const directory = resolve(".medpal-demo");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DiskStore(resolve(directory, "records.json"));
  const sessions = new Map<string, { identity: Identity; expires: number }>();
  const challenges = new Map<
    string,
    { phone: string; secret: string; expires: number; attempts: number }
  >();
  const uploads = new Map<
    string,
    { actor: string; key: string; type: string; size: number; expires: number }
  >();
  const identitiesFile = resolve(directory, "identities.json");
  function identity(phone: string): Identity {
    const map: Record<string, string> = existsSync(identitiesFile)
      ? JSON.parse(readFileSync(identitiesFile, "utf8"))
      : {};
    if (!map[phone]) {
      map[phone] = randomUUID();
      writeFileSync(identitiesFile, JSON.stringify(map), { mode: 0o600 });
    }
    return { sub: map[phone], phone, phoneVerified: true, groups: [] };
  }
  const files: Files = {
    async prepare(actor, type, size) {
      const token = randomBytes(24).toString("hex");
      const key = `certificate-uploads/${actor}/${randomUUID()}`;
      uploads.set(token, {
        actor,
        key,
        type,
        size,
        expires: Date.now() + 300000,
      });
      return { key, url: `/api/demo/upload/${token}` };
    },
    async validate(key, type, size) {
      const path = resolve(directory, key.split("/").at(-1)!);
      const bytes = readFileSync(path);
      validateBytes(bytes, type, size);
      return key.replace("certificate-uploads", "doctor-certificates");
    },
    async document(rx) {
      return `/api/demo/pdf/${rx.id}`;
    },
    async reviewUrl() {
      return "";
    },
  };
  const execute = createEngine(db, files);
  return {
    name: "medpal-local-demo",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const route = (req.url ?? "").split("?")[0];
        if (!route.startsWith("/api/demo/")) return next();
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        const send = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };
        try {
          if (
            req.headers.origin &&
            req.headers.origin !== `http://${req.headers.host}`
          )
            return send(403, {
              error: "Cross-origin requests are not permitted",
            });
          let body = Buffer.alloc(0);
          for await (const chunk of req) {
            body = Buffer.concat([body, chunk]);
            if (body.length > 11 * 1024 * 1024)
              return send(413, { error: "File too large" });
          }
          if (route.startsWith("/api/demo/upload/")) {
            const token = route.split("/").at(-1)!;
            const upload = uploads.get(token);
            if (req.method !== "PUT" || !upload || upload.expires < Date.now())
              return send(403, { error: "Upload expired" });
            validateBytes(body, upload.type, upload.size);
            writeFileSync(
              resolve(directory, upload.key.split("/").at(-1)!),
              body,
              { mode: 0o600 },
            );
            uploads.delete(token);
            return send(200, { ok: true });
          }
          const input = body.length ? JSON.parse(body.toString()) : {};
          if (route === "/api/demo/auth/start") {
            if (req.method !== "POST" || !/^\+91\d{10}$/.test(input.phone))
              return send(400, {
                error: "Enter a 10-digit Indian mobile number",
              });
            const id = randomUUID(),
              { code, secret } = makeCode();
            challenges.set(id, {
              phone: input.phone,
              secret,
              attempts: 5,
              expires: Date.now() + 300000,
            });
            return send(200, { challenge: id, code });
          }
          if (route === "/api/demo/auth/verify") {
            const c = challenges.get(input.challenge);
            if (!c || c.expires < Date.now() || c.attempts <= 0)
              return send(400, {
                error: "Code expired. Request another code.",
              });
            c.attempts--;
            if (!matchesCode(c.secret, input.code))
              return send(400, { error: "Incorrect code" });
            challenges.delete(input.challenge);
            const token = randomBytes(32).toString("hex");
            sessions.set(token, {
              identity: identity(c.phone),
              expires: Date.now() + 12 * 3600000,
            });
            return send(200, { token });
          }
          const token =
            req.headers.authorization?.replace(/^Bearer /, "") ?? "";
          const session = sessions.get(token);
          if (!session || session.expires < Date.now())
            return send(401, { error: "Please sign in again" });
          if (route === "/api/demo/auth/session")
            return send(200, { ok: true });
          if (route === "/api/demo/auth/logout") {
            sessions.delete(token);
            return send(200, { ok: true });
          }
          if (route.startsWith("/api/demo/pdf/")) {
            const id = route.split("/").at(-1)!;
            const result = (await execute(
              "getPrescription",
              { id },
              session.identity,
            )) as { prescription: Prescription };
            const bytes = await renderPrescription(result.prescription);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `attachment; filename="MedPal-${id}.pdf"`,
            );
            res.end(Buffer.from(bytes));
            return;
          }
          if (req.method !== "POST")
            return send(405, { error: "Method not allowed" });
          const operation = route.split("/").at(-1)!;
          if (operation === "reviewDoctor")
            return send(403, {
              error: "Reviewer operation is not exposed by the demo",
            });
          const result = await execute(operation, input, session.identity);
          if (operation === "submitCertificate")
            await execute(
              "reviewDoctor",
              {
                doctorId: session.identity.sub,
                approve: true,
                reason: "Local demonstration only: simulated credential review",
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
            error: e instanceof Error ? e.message : "Request failed",
          });
        }
      });
    },
  };
}
