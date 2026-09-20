import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  profileInput,
  draftInput,
  emptyDraft,
  reconcile,
  validateDecisions,
  type Profile,
  type Medication,
  type Access,
  type Prescription,
} from "../../../shared/domain";
import {
  assert,
  authorized,
  doctor,
  digest,
  makeCode,
  matchesCode,
} from "./policy";
import type { Store, RecordData, Write, Model } from "./store";
export type Identity = {
  workspace?: string;
  sub: string;
  phone?: string;
  phoneVerified: boolean;
  groups: string[];
};
export type PatientState = { profile: Profile; medicines: Medication[] };
export interface Files {
  prepare(
    actor: string,
    type: string,
    size: number,
  ): Promise<{ key: string; url: string }>;
  validate(key: string, type: string, size: number): Promise<string>;
  document(rx: Prescription, seconds: number): Promise<string>;
  reviewUrl(key: string): Promise<string>;
}
const idInput = z.object({ id: z.string().uuid() }).strict();
const revisionInput = z
  .object({ id: z.string().uuid(), revision: z.number().int().nonnegative() })
  .strict();
function write<T>(
  model: Model,
  id: string,
  data: T,
  fields: Record<string, unknown>,
  old?: RecordData | null,
  secret?: string,
): Write {
  return {
    model,
    expected: old?.revision ?? null,
    record: {
      id,
      data,
      fields: { ...old?.fields, ...fields },
      revision: (old?.revision ?? 0) + 1,
      secret,
    },
  };
}
export function createEngine(
  db: Store,
  files: Files,
  clock = () => Date.now(),
) {
  return async function execute(
    operation: string,
    input: unknown,
    identity: Identity,
  ): Promise<unknown> {
    assert(identity.sub, "Sign in required");
    const actor = identity.sub,
      now = clock(),
      timestamp = new Date(now).toISOString();
    const user = await db.get<Profile>("User", actor);
    assert(!user || user.fields.status !== "SUSPENDED", "Account suspended");
    const profile = user?.data;
    function audit(
      event: string,
      patientOwner?: string,
      consultationId?: string,
    ) {
      return write(
        "AuditEvent",
        randomUUID(),
        { event, actor, at: timestamp },
        {
          actorOwner: actor,
          patientOwner,
          consultationId,
          eventType: event,
          occurredAt: timestamp,
        },
      );
    }
    async function rate(name: string, limit: number) {
      const id = `rate:${actor}:${name}:${Math.floor(now / 60000)}`;
      const old = await db.get<{ count: number }>("AuditEvent", id);
      assert(
        (old?.data.count ?? 0) < limit,
        "Too many requests. Please wait a minute.",
      );
      await db.commit([
        write(
          "AuditEvent",
          id,
          { count: (old?.data.count ?? 0) + 1 },
          {
            actorOwner: actor,
            eventType: "RATE_LIMIT",
            occurredAt: timestamp,
            expireAt: Math.floor(now / 1000) + 3600,
          },
          old,
        ),
      ]);
    }
    async function getAccess(id: string) {
      const access = await db.get<Access>("ConsultationAccess", id);
      assert(access, "Consultation not found");
      return access;
    }
    async function getPatient(id: string) {
      const patient = await db.get<PatientState>("PatientProfile", id);
      assert(patient, "Patient not found");
      return patient;
    }
    const checkUser = () => {
      assert(profile && user, "Complete your account profile");
      return { profile, user };
    };
    const checkDoctor = () => {
      const p = checkUser();
      doctor(p.profile);
      return p;
    };
    if (operation === "saveProfile") {
      await rate(operation, 20);
      const p = profileInput.parse(input);
      assert(
        identity.phoneVerified &&
          identity.phone &&
          /^\+\d{8,15}$/.test(identity.phone),
        "A verified phone number is required",
      );
      assert(
        !profile || profile.role === p.role,
        "Account role cannot be changed",
      );
      if (p.role === "doctor")
        for (const key of [
          "qualifications",
          "medicalCouncil",
          "registrationNumber",
          "clinicName",
          "clinicAddress",
        ] as const)
          assert(p[key]?.trim(), `${key} is required`);
      const credentialsChanged =
        profile?.role === "doctor" &&
        [
          "fullName",
          "qualifications",
          "specialty",
          "medicalCouncil",
          "registrationNumber",
        ].some((k) => profile[k as keyof Profile] !== p[k as keyof typeof p]);
      const updated: Profile = {
        ...p,
        id: actor,
        phone: identity.phone,
        verificationStatus: credentialsChanged
          ? "UNVERIFIED"
          : (profile?.verificationStatus ?? "UNVERIFIED"),
        revision: (user?.revision ?? 0) + 1,
        ...(profile?.certificateKey
          ? { certificateKey: profile.certificateKey }
          : {}),
      };
      const writes = [
        write(
          "User",
          actor,
          updated,
          {
            owner: actor,
            cognitoSub: actor,
            role: p.role.toUpperCase(),
            phoneE164: identity.phone,
            displayName: p.fullName,
            avatarId: p.avatarId,
            status: "ACTIVE",
            demoWorkspace: identity.workspace,
          },
          user,
        ),
        audit("PROFILE_SAVED"),
      ];
      if (p.role === "patient") {
        const old = await db.get<PatientState>("PatientProfile", actor);
        writes.push(
          write(
            "PatientProfile",
            actor,
            { profile: updated, medicines: old?.data.medicines ?? [] },
            {
              owner: actor,
              userId: actor,
              fullName: p.fullName,
              dateOfBirth: p.dateOfBirth,
              sex: p.sex,
              heightCm: p.heightCm,
              weightKg: p.weightKg,
              avatarId: p.avatarId,
              preferredLanguage: p.preferredLanguage,
            },
            old,
          ),
        );
      } else {
        const old = await db.get("DoctorProfile", actor),
          clinic = await db.get("Clinic", actor);
        writes.push(
          write(
            "DoctorProfile",
            actor,
            updated,
            {
              owner: actor,
              userId: actor,
              fullName: p.fullName,
              qualifications: [p.qualifications],
              specialty: p.specialty,
              medicalCouncil: p.medicalCouncil,
              registrationNumber: p.registrationNumber,
              verificationStatus: updated.verificationStatus,
              clinicId: actor,
            },
            old,
          ),
          write(
            "Clinic",
            actor,
            { name: p.clinicName, address: p.clinicAddress },
            { owner: actor, name: p.clinicName, addressLine: p.clinicAddress },
            clinic,
          ),
        );
      }
      await db.commit(writes);
      return updated;
    }
    if (operation === "getHome") {
      if (!profile)
        return {
          profile: null,
          requests: [],
          medicines: [],
          prescriptions: [],
        };
      const patient = profile.role === "patient";
      const all = await db.list<Access>(
        "ConsultationAccess",
        patient ? "byPatient" : "byDoctor",
        patient ? "patientId" : "doctorId",
        actor,
      );
      const requests = all
        .map((r) => r.data)
        .filter(
          (a) =>
            a.expiresAt > now && !["CLOSED", "DECLINED"].includes(a.status),
        )
        .map((a) => ({ ...a, draft: emptyDraft }));
      const records = await db.list<Prescription>(
        "Prescription",
        patient ? "byPatient" : "byDoctor",
        patient ? "patientId" : "doctorId",
        actor,
      );
      const prescriptions = records
        .filter(
          (r) =>
            patient ||
            requests.some(
              (a) =>
                a.id === r.data.consultationId && a.status === "AUTHORIZED",
            ),
        )
        .map((r) => r.data)
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
      return {
        profile,
        requests,
        prescriptions,
        medicines: patient ? (await getPatient(actor)).data.medicines : [],
      };
    }
    if (operation === "findPatient") {
      checkDoctor();
      await rate(operation, 10);
      const { phone } = z
        .object({ phone: z.string().regex(/^\+\d{8,15}$/) })
        .strict()
        .parse(input);
      const matches = await db.list<Profile>(
        "User",
        "byPhone",
        "phoneE164",
        phone,
      );
      const found = matches.find(
        (u) =>
          u.data.role === "patient" &&
          u.fields.status === "ACTIVE",
      );
      return {
        patient: found ? { id: found.id, fullName: found.data.fullName } : null,
      };
    }
    if (operation === "requestConsultation") {
      checkDoctor();
      await rate(operation, 5);
      const { patientId } = z
        .object({ patientId: z.string().uuid() })
        .strict()
        .parse(input);
      const p = await getPatient(patientId);
      const id = randomUUID();
      const access: Access = {
        id,
        doctorId: actor,
        patientId,
        doctorName: profile!.fullName,
        patientName: p.data.profile.fullName,
        status: "REQUESTED",
        expiresAt: now + 15 * 60000,
        revision: 1,
        draft: emptyDraft,
      };
      await db.commit([
        write("ConsultationAccess", id, access, {
          doctorId: actor,
          patientId,
          consultationId: id,
          doctorOwner: actor,
          patientOwner: patientId,
          status: "REQUESTED",
        }),
        write(
          "Consultation",
          id,
          { draft: emptyDraft, patientRevision: p.revision },
          {
            doctorId: actor,
            patientId,
            clinicId: actor,
            doctorOwner: actor,
            patientOwner: patientId,
            accessId: id,
            status: "AWAITING_AUTH",
          },
        ),
        write(
          "Notification",
          randomUUID(),
          { consultationId: id },
          {
            recipientOwner: patientId,
            type: "CONSULTATION_ACCESS_REQUEST",
            title: "Consultation request",
            body: `${profile!.fullName} requests consultation access`,
            consultationId: id,
          },
        ),
        audit("CONSULTATION_REQUESTED", patientId, id),
        { model: "User", record: user!, expected: user!.revision, check: true },
      ]);
      return access;
    }
    if (["approveConsultation", "declineConsultation"].includes(operation)) {
      checkUser();
      await rate(operation, 10);
      const { id } = idInput.parse(input);
      const old = await getAccess(id);
      const a = old.data;
      assert(
        a.patientId === actor && profile!.role === "patient",
        "Only this patient may respond",
      );
      assert(
        ["REQUESTED", "APPROVED"].includes(a.status) && a.expiresAt > now,
        "Request expired or already used",
      );
      const approved = operation === "approveConsultation";
      const generated = approved ? makeCode() : undefined;
      const expiresAt = approved ? Math.min(a.expiresAt, now + 5 * 60000) : now;
      const next = {
        ...a,
        status: approved ? ("APPROVED" as const) : ("DECLINED" as const),
        expiresAt,
        revision: old.revision + 1,
      };
      // Approval regeneration does not reset failed attempts.
      await db.commit([
        write(
          "ConsultationAccess",
          id,
          next,
          {
            status: next.status,
            attemptsRemaining: old.fields.attemptsRemaining ?? 5,
          },
          old,
          generated?.secret,
        ),
        audit(approved ? "ACCESS_APPROVED" : "ACCESS_DECLINED", actor, id),
      ]);
      return approved ? { code: generated!.code, expiresAt } : { ok: true };
    }
    if (operation === "verifyConsultation") {
      checkDoctor();
      await rate(operation, 10);
      const { id, code } = z
        .object({ id: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
        .strict()
        .parse(input);
      const old = await getAccess(id);
      const a = old.data;
      assert(
        a.doctorId === actor && a.status === "APPROVED" && a.expiresAt > now,
        "Code expired or authorization unavailable",
      );
      const remaining = Number(old.fields.attemptsRemaining ?? 0);
      assert(
        remaining > 0,
        "No attempts remaining. Request new authorization.",
      );
      if (!matchesCode(old.secret, code)) {
        await db.commit([
          write(
            "ConsultationAccess",
            id,
            { ...a, revision: old.revision + 1 },
            { attemptsRemaining: remaining - 1 },
            old,
            old.secret,
          ),
          audit("CODE_REJECTED", a.patientId, id),
        ]);
        throw new Error("Incorrect code");
      }
      const next = {
        ...a,
        status: "AUTHORIZED" as const,
        expiresAt: now + 30 * 60000,
        revision: old.revision + 1,
      };
      const c = await db.get("Consultation", id);
      assert(c, "Consultation unavailable");
      await db.commit([
        write(
          "ConsultationAccess",
          id,
          next,
          {
            status: "AUTHORIZED",
            authorizedAt: timestamp,
            attemptsRemaining: 0,
          },
          old,
        ),
        write(
          "Consultation",
          id,
          c.data,
          { status: "IN_PROGRESS", startedAt: timestamp },
          c,
        ),
        audit("ACCESS_AUTHORIZED", a.patientId, id),
      ]);
      return { ok: true };
    }
    if (
      [
        "getConsultation",
        "saveDraft",
        "closeConsultation",
        "issuePrescription",
      ].includes(operation)
    ) {
      const { id } = z
        .object({ id: z.string().uuid() })
        .passthrough()
        .parse(input);
      const old = await getAccess(id);
      const a = old.data;
      if (operation === "closeConsultation") {
        assert(
          actor === a.patientId || actor === a.doctorId,
          "Not your consultation",
        );
        assert(profile, "Complete your account");
        if (a.status === "CLOSED") return { ok: true };
        await db.commit([
          write(
            "ConsultationAccess",
            id,
            {
              ...a,
              status: "CLOSED",
              expiresAt: now,
              revision: old.revision + 1,
            },
            { status: "CLOSED", closedAt: timestamp },
            old,
          ),
          audit("CONSULTATION_CLOSED", a.patientId, id),
        ]);
        return { ok: true };
      }
      checkDoctor();
      authorized(a, actor, now);
      const patient = await getPatient(a.patientId);
      const c = await db.get<{
        draft: typeof emptyDraft;
        patientRevision: number;
      }>("Consultation", id);
      assert(c, "Consultation unavailable");
      if (operation === "getConsultation")
        return {
          access: {
            ...a,
            draft: c.data.draft,
            revision: c.revision,
            patientRevision: c.data.patientRevision,
          },
          patient: patient.data.profile,
          medicines: patient.data.medicines,
          prescriptions: (
            await db.list<Prescription>(
              "Prescription",
              "byPatient",
              "patientId",
              a.patientId,
            )
          ).map((r) => r.data),
        };
      if (operation === "saveDraft") {
        assert(
          !a.prescriptionId,
          "This prescription was issued. Start an authorized correction consultation.",
        );
        const value = z
          .object({
            id: z.string().uuid(),
            revision: z.number().int(),
            draft: draftInput,
          })
          .strict()
          .parse(input);
        assert(
          c.revision === value.revision,
          "Draft changed. Reload before saving.",
        );
        validateDecisions(patient.data.medicines, value.draft.items);
        await db.commit([
          write(
            "Consultation",
            id,
            { draft: value.draft, patientRevision: patient.revision },
            {},
            c,
          ),
          {
            model: "ConsultationAccess",
            record: old,
            expected: old.revision,
            check: true,
          },
          audit("DRAFT_SAVED", a.patientId, id),
        ]);
        return {
          ...a,
          draft: value.draft,
          revision: c.revision + 1,
          patientRevision: patient.revision,
        };
      }
      const value = revisionInput.parse(input);
      if (a.prescriptionId) return { id: a.prescriptionId };
      assert(
        c.revision === value.revision,
        "Draft changed. Reload before issuing.",
      );
      assert(
        patient.revision === c.data.patientRevision,
        "Patient records changed. Reload and review the draft again.",
      );
      const draft = draftInput.parse(c.data.draft);
      assert(draft.items.length, "Add at least one medicine decision");
      validateDecisions(patient.data.medicines, draft.items);
      if (draft.correctsPrescriptionId) {
        const previous = await db.get<Prescription>(
          "Prescription",
          draft.correctsPrescriptionId,
        );
        assert(
          previous?.data.patient.id === a.patientId &&
            previous.data.doctor.id === actor,
          "Only the issuing doctor can correct their prescription for this patient",
        );
      }
      const rxId = randomUUID();
      const unsigned = {
        id: rxId,
        consultationId: id,
        issuedAt: timestamp,
        doctor: profile!,
        patient: patient.data.profile,
        draft,
        before: patient.data.medicines,
        documentKey: `prescriptions/${a.patientId}/${rxId}.pdf`,
      };
      const rx: Prescription = { ...unsigned, digest: digest(unsigned) };
      const writes: Write[] = [
        write("Prescription", rxId, rx, {
          consultationId: id,
          patientId: a.patientId,
          doctorId: actor,
          clinicId: actor,
          patientOwner: a.patientId,
          doctorOwner: actor,
          status: "ISSUED",
          version: 1,
          issuedAt: timestamp,
          documentKey: rx.documentKey,
          immutableDigest: rx.digest,
          correctsPrescriptionId: draft.correctsPrescriptionId,
        }),
        write(
          "PatientProfile",
          a.patientId,
          {
            ...patient.data,
            medicines: reconcile(patient.data.medicines, draft.items),
          },
          {},
          patient,
        ),
        write(
          "ConsultationAccess",
          id,
          { ...a, prescriptionId: rxId, revision: old.revision + 1 },
          {},
          old,
        ),
        write("Consultation", id, c.data, { issuedAt: timestamp }, c),
        write(
          "Notification",
          randomUUID(),
          { prescriptionId: rxId },
          {
            recipientOwner: a.patientId,
            type: "PRESCRIPTION_ISSUED",
            title: "New prescription",
            body: "Your prescription is ready",
            consultationId: id,
          },
        ),
        audit("PRESCRIPTION_ISSUED", a.patientId, id),
        { model: "User", record: user!, expected: user!.revision, check: true },
      ];
      for (const item of draft.items) {
        writes.push(
          write("MedicationDecision", randomUUID(), item, {
            consultationId: id,
            prescriptionId: rxId,
            patientOwner: a.patientId,
            doctorOwner: actor,
            medicineName: item.name,
            decision: item.decision,
            reason: item.reason,
            decidedAt: timestamp,
          }),
        );
        if (!["STOP", "NOT_REVIEWED"].includes(item.decision))
          writes.push(
            write("PrescriptionItem", randomUUID(), item, {
              prescriptionId: rxId,
              patientOwner: a.patientId,
              doctorOwner: actor,
              medicineName: item.name,
              strength: item.strength,
              dosage: item.dose,
              timing: [item.timing],
              instructions: item.instructions,
              quantity: item.quantity,
              decision: item.decision,
            }),
          );
      }
      await db.commit(writes);
      return { id: rxId };
    }
    if (operation === "getPrescription") {
      checkUser();
      const { id } = idInput.parse(input);
      const record = await db.get<Prescription>("Prescription", id);
      assert(record, "Prescription unavailable");
      const rx = record.data;
      let seconds = 60;
      if (rx.patient.id !== actor) {
        checkDoctor();
        assert(rx.doctor.id === actor, "Not your prescription");
        const access = await getAccess(rx.consultationId);
        authorized(access.data, actor, now);
        seconds = Math.max(
          1,
          Math.min(60, Math.floor((access.data.expiresAt - now) / 1000)),
        );
      }
      const { digest: hash, ...unsigned } = rx;
      assert(hash === digest(unsigned), "Prescription integrity check failed");
      try {
        const url = await files.document(rx, seconds);
        return { prescription: rx, url };
      } catch {
        return {
          prescription: rx,
          url: "",
          documentError:
            "PDF generation is unavailable. You can view this record and use Print / Save as PDF.",
        };
      }
    }
    if (operation === "prepareCertificate") {
      checkUser();
      assert(profile!.role === "doctor", "Doctor account required");
      await rate(operation, 5);
      const { type, size } = z
        .object({
          type: z.enum(["image/jpeg", "image/png", "application/pdf"]),
          size: z
            .number()
            .int()
            .positive()
            .max(10 * 1024 * 1024),
        })
        .strict()
        .parse(input);
      const prepared = await files.prepare(actor, type, size);
      await db.commit([
        write(
          "VerificationRun",
          prepared.key,
          { type, size, expiresAt: now + 10 * 60000 },
          {
            owner: actor,
            doctorId: actor,
            certificateKey: prepared.key,
            status: "UPLOADED",
          },
        ),
        audit("CERTIFICATE_UPLOAD_REQUESTED"),
      ]);
      return prepared;
    }
    if (operation === "submitCertificate") {
      checkUser();
      assert(profile!.role === "doctor", "Doctor account required");
      const { key } = z
        .object({ key: z.string().max(500) })
        .strict()
        .parse(input);
      const run = await db.get<{
        type: string;
        size: number;
        expiresAt: number;
      }>("VerificationRun", key);
      assert(
        run &&
          run.fields.doctorId === actor &&
          run.fields.status === "UPLOADED" &&
          run.data.expiresAt > now,
        "Upload unavailable or expired",
      );
      const finalKey = await files.validate(key, run.data.type, run.data.size);
      const doc = await db.get<Profile>("DoctorProfile", actor);
      assert(doc, "Doctor profile unavailable");
      const next = {
        ...profile!,
        certificateKey: finalKey,
        verificationStatus: "PENDING" as const,
        revision: user!.revision + 1,
      };
      await db.commit([
        write("User", actor, next, {}, user),
        write(
          "DoctorProfile",
          actor,
          next,
          { verificationStatus: "PENDING" },
          doc,
        ),
        write(
          "VerificationRun",
          key,
          run.data,
          { status: "PENDING", certificateKey: finalKey },
          run,
        ),
        audit("CERTIFICATE_SUBMITTED"),
      ]);
      return { ok: true };
    }
    if (operation === "reviewDoctor") {
      assert(
        identity.groups.includes("VerificationReviewers"),
        "Reviewer access required",
      );
      const { doctorId, approve, reason } = z
        .object({
          doctorId: z.string().uuid(),
          approve: z.boolean(),
          reason: z.string().trim().min(10).max(1000),
        })
        .strict()
        .parse(input);
      assert(doctorId !== actor, "You cannot review your own credentials");
      const target = await db.get<Profile>("User", doctorId),
        doc = await db.get<Profile>("DoctorProfile", doctorId);
      assert(
        target &&
          doc &&
          target.data.verificationStatus === "PENDING" &&
          target.data.certificateKey,
        "No pending credential submission",
      );
      const next = {
        ...target.data,
        verificationStatus: approve
          ? ("VERIFIED" as const)
          : ("REJECTED" as const),
        revision: target.revision + 1,
      };
      await db.commit([
        write("User", doctorId, next, {}, target),
        write(
          "DoctorProfile",
          doctorId,
          next,
          {
            verificationStatus: next.verificationStatus,
            verifiedAt: approve ? timestamp : undefined,
          },
          doc,
        ),
        write(
          "AuditEvent",
          randomUUID(),
          { reason, doctorId, approve },
          {
            actorOwner: actor,
            eventType: "DOCTOR_REVIEWED",
            occurredAt: timestamp,
          },
        ),
      ]);
      return { ok: true };
    }
    throw new Error("Unsupported operation");
  };
}
