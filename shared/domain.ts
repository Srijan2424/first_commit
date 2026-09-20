import { z } from "zod";
export const profileInput = z
  .object({
    role: z.enum(["doctor", "patient"]),
    fullName: z.string().trim().min(2).max(120),
    avatarId: z.enum([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
      "mp",
      "leaf",
      "sunrise",
      "orbit",
    ]),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    sex: z.string().max(30).optional(),
    heightCm: z.number().positive().max(300).optional(),
    weightKg: z.number().positive().max(700).optional(),
    preferredLanguage: z.string().max(60).optional(),
    qualifications: z.string().max(300).optional(),
    specialty: z.string().max(120).optional(),
    medicalCouncil: z.string().max(120).optional(),
    registrationNumber: z.string().max(100).optional(),
    clinicName: z.string().max(160).optional(),
    clinicAddress: z.string().max(500).optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.role === "patient" && !p.dateOfBirth)
      ctx.addIssue({
        code: "custom",
        message: "Date of birth is required",
        path: ["dateOfBirth"],
      });
    if (
      p.dateOfBirth &&
      (!Number.isFinite(Date.parse(p.dateOfBirth)) ||
        new Date(p.dateOfBirth).toISOString().slice(0, 10) !== p.dateOfBirth ||
        p.dateOfBirth > new Date().toISOString().slice(0, 10))
    )
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid date of birth",
        path: ["dateOfBirth"],
      });
  });
export type ProfileInput = z.infer<typeof profileInput>;
export type Profile = ProfileInput & {
  id: string;
  phone: string;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  certificateKey?: string;
  revision: number;
};
export const medicationInput = z
  .object({
    id: z.string().uuid(),
    sourceId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200),
    catalogueId: z.string().max(40).optional(),
    strength: z.string().trim().min(1).max(80),
    formulation: z.string().trim().min(1).max(80),
    dose: z.string().trim().min(1).max(120),
    route: z.string().trim().min(1).max(80),
    frequency: z.string().trim().min(1).max(120),
    timing: z.string().max(150),
    duration: z.string().trim().min(1).max(100),
    quantity: z.number().int().positive().max(10000).optional(),
    instructions: z.string().max(1000),
    reason: z.string().max(1000),
    decision: z.enum(["ADD", "CONTINUE", "CHANGE", "STOP", "NOT_REVIEWED"]),
  })
  .strict();
export type Medication = z.infer<typeof medicationInput>;
export const draftInput = z
  .object({
    items: z.array(medicationInput).max(40),
    complaint: z.string().max(2000),
    observations: z.string().max(2000),
    diagnosis: z.string().max(2000),
    advice: z.string().max(2000),
    followUp: z.string().max(100),
    correctsPrescriptionId: z.string().uuid().optional(),
  })
  .strict();
export type Draft = z.infer<typeof draftInput>;
export const emptyDraft: Draft = {
  items: [],
  complaint: "",
  observations: "",
  diagnosis: "",
  advice: "",
  followUp: "",
};
export type Access = {
  id: string;
  doctorId: string;
  patientId: string;
  doctorName: string;
  patientName: string;
  status: "REQUESTED" | "APPROVED" | "AUTHORIZED" | "CLOSED" | "DECLINED";
  expiresAt: number;
  revision: number;
  draft: Draft;
  patientRevision?: number;
  prescriptionId?: string;
};
export type Prescription = {
  id: string;
  consultationId: string;
  issuedAt: string;
  doctor: Profile;
  patient: Profile;
  draft: Draft;
  before: Medication[];
  digest: string;
  documentKey: string;
};
export type Home = {
  profile: Profile | null;
  requests: Access[];
  medicines: Medication[];
  prescriptions: Prescription[];
};
export function reconcile(existing: Medication[], decisions: Medication[]) {
  const next = new Map(existing.map((m) => [m.id, m]));
  for (const item of decisions) {
    if (item.decision === "ADD") {
      if (item.sourceId)
        throw new Error("New medicines cannot replace an existing item");
      next.set(item.id, item);
      continue;
    }
    if (!item.sourceId || !next.has(item.sourceId))
      throw new Error(
        "Original medicine is no longer active. Reload this consultation.",
      );
    if (item.decision === "STOP") next.delete(item.sourceId);
    if (item.decision === "CHANGE") {
      next.delete(item.sourceId);
      next.set(item.id, item);
    }
  }
  return [...next.values()];
}
export function validateDecisions(existing: Medication[], items: Medication[]) {
  const sources = new Set<string>();
  const ids = new Set<string>();
  for (const item of items) {
    if (existing.some((m) => m.id === item.id))
      throw new Error("A decision must have a new item ID");
    if (ids.has(item.id)) throw new Error("Duplicate medicine item");
    ids.add(item.id);
    if (item.sourceId) {
      if (sources.has(item.sourceId))
        throw new Error("Review each medicine once");
      sources.add(item.sourceId);
    }
    if (["CHANGE", "STOP"].includes(item.decision) && !item.reason.trim())
      throw new Error("Explain changed or stopped medicines");
    if (["CONTINUE", "NOT_REVIEWED", "STOP"].includes(item.decision)) {
      const original = existing.find((m) => m.id === item.sourceId);
      if (!original) throw new Error("Original medicine not found");
      for (const key of [
        "name",
        "strength",
        "formulation",
        "dose",
        "route",
        "frequency",
        "timing",
        "duration",
        "quantity",
        "instructions",
      ] as const)
        if (item[key] !== original[key])
          throw new Error("Use Change to modify an existing medicine");
    }
  }
  reconcile(existing, items);
}
