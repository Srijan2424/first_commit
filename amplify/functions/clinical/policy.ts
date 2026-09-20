import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import type { Access, Profile } from "../../../shared/domain";
export class Denied extends Error {}
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Denied(message);
}
export function doctor(profile: Profile) {
  assert(
    profile.role === "doctor" && profile.verificationStatus === "VERIFIED",
    "A verified doctor account is required",
  );
}
export function authorized(access: Access, actor: string, now: number) {
  assert(
    access.doctorId === actor &&
      access.status === "AUTHORIZED" &&
      access.expiresAt > now,
    "Active patient authorization is required",
  );
}
export function makeCode() {
  const code = String(randomInt(100000, 1000000));
  const salt = randomBytes(24).toString("hex");
  return {
    code,
    secret: `${salt}:${createHash("sha256").update(`${salt}:${code}`).digest("hex")}`,
  };
}
export function matchesCode(secret: string | undefined, code: string) {
  if (!secret || !/^\d{6}$/.test(code)) return false;
  const [salt, expected] = secret.split(":");
  if (!expected || expected.length !== 64) return false;
  const actual = createHash("sha256").update(`${salt}:${code}`).digest();
  return timingSafeEqual(Buffer.from(expected, "hex"), actual);
}
export function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
