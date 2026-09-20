import { demoHttp } from "./demo-http";
import { createEngine, type Identity } from "./engine";
import { store, Conflict } from "./store";
import { files } from "./files";
import { Denied } from "./policy";
import { ZodError } from "zod";
const execute = createEngine(store, files);
type Event = {
  info: { fieldName: string };
  arguments: { input?: unknown };
  identity?: { sub?: string; claims?: Record<string, unknown> };
};
export async function handler(event: Event | Parameters<typeof demoHttp>[0]) {
  if ("requestContext" in event) return demoHttp(event);
  try {
    const claims = event.identity?.claims ?? {};
    const sub = event.identity?.sub;
    if (!sub) throw new Denied("Sign in required");
    const identity: Identity = {
      sub,
      phone:
        typeof claims.phone_number === "string"
          ? claims.phone_number
          : undefined,
      phoneVerified:
        claims.phone_number_verified === true ||
        claims.phone_number_verified === "true",
      groups: Array.isArray(claims["cognito:groups"])
        ? (claims["cognito:groups"] as string[])
        : [],
    };
    const input =
      typeof event.arguments.input === "string"
        ? JSON.parse(event.arguments.input)
        : (event.arguments.input ?? {});
    return await execute(event.info.fieldName, input, identity);
  } catch (e) {
    if (e instanceof ZodError)
      return {
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      };
    if (e instanceof Denied || e instanceof Conflict)
      return { error: e.message };
    // Expected domain messages are safe; never return AWS credentials, stack traces or PHI.
    const safe = [
      "Incorrect code",
      "Unsupported operation",
      "Duplicate medicine item",
      "A decision must have a new item ID",
      "Review each medicine once",
      "Explain changed or stopped medicines",
      "Use Change to modify an existing medicine",
      "Original medicine not found",
      "Original medicine is no longer active. Reload this consultation.",
      "New medicines cannot replace an existing item",
    ];
    if (e instanceof Error && safe.includes(e.message))
      return { error: e.message };
    console.error(
      JSON.stringify({
        operation: event.info.fieldName,
        errorType: e instanceof Error ? e.name : "Unknown",
      }),
    );
    return {
      error: "The service could not complete this request. Please retry.",
    };
  }
}
