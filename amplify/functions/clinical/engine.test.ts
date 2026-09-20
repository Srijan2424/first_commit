import { describe, expect, test } from "vitest";
import { createEngine, type Identity, type Files } from "./engine";
import {
  Conflict,
  type Store,
  type Model,
  type RecordData,
  type Write,
} from "./store";
import type { Access, Profile, Home, Medication } from "../../../shared/domain";
class MemoryStore implements Store {
  data = new Map<string, RecordData>();
  async get<T>(model: Model, id: string) {
    return structuredClone(
      this.data.get(`${model}:${id}`) ?? null,
    ) as RecordData<T> | null;
  }
  async list<T>(model: Model, _index: string, key: string, value: string) {
    return [...this.data]
      .filter(([k, v]) => k.startsWith(`${model}:`) && v.fields[key] === value)
      .map(([, v]) => structuredClone(v)) as RecordData<T>[];
  }
  async commit(writes: Write[]) {
    for (const w of writes) {
      const old = this.data.get(`${w.model}:${w.record.id}`);
      if (w.expected === null ? !!old : old?.revision !== w.expected)
        throw new Conflict();
    }
    for (const w of writes)
      if (!w.check)
        this.data.set(`${w.model}:${w.record.id}`, structuredClone(w.record));
  }
}
const d = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  p = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  r = "cccccccc-cccc-4ccc-cccc-cccccccccccc",
  other = "dddddddd-dddd-4ddd-dddd-dddddddddddd";
const doctor: Identity = {
    sub: d,
    phone: "+919876543210",
    phoneVerified: true,
    groups: [],
  },
  patient: Identity = {
    sub: p,
    phone: "+919876543211",
    phoneVerified: true,
    groups: [],
  },
  reviewer: Identity = {
    sub: r,
    phoneVerified: true,
    groups: ["VerificationReviewers"],
  };
const files: Files = {
  prepare: async (actor) => ({
    key: `certificate-uploads/${actor}/test`,
    url: "https://upload.test",
  }),
  validate: async () => "doctor-certificates/test",
  document: async () => "https://private.test/document",
  reviewUrl: async () => "https://private.test/certificate",
};
const med: Medication = {
  id: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee",
  name: "Test medicine",
  strength: "1 mg",
  formulation: "Tablet",
  dose: "One tablet",
  route: "Oral",
  frequency: "Once daily",
  timing: "Morning",
  duration: "7 days",
  instructions: "Test only",
  reason: "",
  decision: "ADD",
};
async function fixture() {
  const db = new MemoryStore();
  let now = Date.now();
  const run = createEngine(db, files, () => now);
  await run(
    "saveProfile",
    {
      role: "doctor",
      fullName: "Test Doctor",
      avatarId: "01",
      qualifications: "Test qualification",
      medicalCouncil: "Test council",
      registrationNumber: "TEST-1",
      clinicName: "Test clinic",
      clinicAddress: "Test address",
    },
    doctor,
  );
  await run(
    "saveProfile",
    {
      role: "patient",
      fullName: "Test Patient",
      avatarId: "02",
      dateOfBirth: "2000-01-01",
    },
    patient,
  );
  const upload = (await run(
    "prepareCertificate",
    { type: "image/png", size: 8 },
    doctor,
  )) as { key: string };
  await run("submitCertificate", { key: upload.key }, doctor);
  await run(
    "reviewDoctor",
    {
      doctorId: d,
      approve: true,
      reason: "Synthetic fixture: checked for automated test",
    },
    reviewer,
  );
  const access = (await run(
    "requestConsultation",
    { patientId: p },
    doctor,
  )) as Access;
  return {
    db,
    run,
    access,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
async function authorizedFixture() {
  const f = await fixture();
  const approval = (await f.run(
    "approveConsultation",
    { id: f.access.id },
    patient,
  )) as { code: string };
  await f.run(
    "verifyConsultation",
    { id: f.access.id, code: approval.code },
    doctor,
  );
  return { ...f, code: approval.code };
}
describe("clinical authorization and persistence", () => {
  test("fresh accounts have empty clinical records", async () => {
    const { run } = await fixture();
    const home = (await run("getHome", {}, patient)) as Home;
    expect(home.medicines).toEqual([]);
    expect(home.prescriptions).toEqual([]);
    expect(home.profile?.fullName).toBe("Test Patient");
  });
  test("profile changes persist, but self-verification is rejected", async () => {
    const { run } = await fixture();
    await run(
      "saveProfile",
      {
        role: "patient",
        fullName: "Changed Name",
        avatarId: "03",
        dateOfBirth: "2000-01-01",
      },
      patient,
    );
    expect(
      ((await run("getHome", {}, patient)) as Home).profile?.fullName,
    ).toBe("Changed Name");
    await expect(
      run(
        "saveProfile",
        {
          role: "doctor",
          fullName: "Test Doctor",
          avatarId: "01",
          verificationStatus: "VERIFIED",
        },
        doctor,
      ),
    ).rejects.toThrow();
  });
  test("history is hidden before authorization", async () => {
    const { run, access } = await fixture();
    await expect(
      run("getConsultation", { id: access.id }, doctor),
    ).rejects.toThrow("authorization");
  });
  test("doctor and patient can use different demo browser workspaces", async () => {
    const { run } = await fixture();
    const result = (await run(
      "findPatient",
      { phone: patient.phone },
      { ...doctor, workspace: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
    )) as { patient: { id: string } | null };
    expect(result.patient?.id).toBe(p);
    await expect(
      run(
        "requestConsultation",
        { patientId: p },
        { ...doctor, workspace: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
      ),
    ).resolves.toMatchObject({ patientId: p });
  });
  test("another patient cannot approve an access request", async () => {
    const { run, access } = await fixture();
    await expect(
      run("approveConsultation", { id: access.id }, { ...patient, sub: other }),
    ).rejects.toThrow();
  });
  test("a successful code is single-use", async () => {
    const { run, access, code } = await authorizedFixture();
    await expect(
      run("verifyConsultation", { id: access.id, code }, doctor),
    ).rejects.toThrow("unavailable");
  });
  test("hash is not present in patient or doctor home responses", async () => {
    const { run, access, db } = await fixture();
    await run("approveConsultation", { id: access.id }, patient);
    const record = await db.get("ConsultationAccess", access.id);
    expect(record?.secret).toBeTruthy();
    expect(JSON.stringify(await run("getHome", {}, patient))).not.toContain(
      record!.secret!,
    );
  });
  test("expired codes are rejected", async () => {
    const { run, access, advance } = await fixture();
    const { code } = (await run(
      "approveConsultation",
      { id: access.id },
      patient,
    )) as { code: string };
    advance(6 * 60000);
    await expect(
      run("verifyConsultation", { id: access.id, code }, doctor),
    ).rejects.toThrow("expired");
  });
  test("wrong codes consume the attempt budget", async () => {
    const { run, access } = await fixture();
    await run("approveConsultation", { id: access.id }, patient);
    for (let i = 0; i < 5; i++)
      await expect(
        run("verifyConsultation", { id: access.id, code: "000000" }, doctor),
      ).rejects.toThrow("Incorrect");
    await expect(
      run("verifyConsultation", { id: access.id, code: "000000" }, doctor),
    ).rejects.toThrow("No attempts");
  });
  test("closing consultation revokes history access", async () => {
    const { run, access } = await authorizedFixture();
    await run("closeConsultation", { id: access.id }, patient);
    await expect(
      run("getConsultation", { id: access.id }, doctor),
    ).rejects.toThrow("authorization");
  });
  test("draft survives a second request and prevents stale overwrites", async () => {
    const { run, access } = await authorizedFixture();
    const context = (await run(
      "getConsultation",
      { id: access.id },
      doctor,
    )) as { access: Access };
    const draft = { ...context.access.draft, items: [med] };
    await run(
      "saveDraft",
      { id: access.id, revision: context.access.revision, draft },
      doctor,
    );
    expect(
      (
        (await run("getConsultation", { id: access.id }, doctor)) as {
          access: Access;
        }
      ).access.draft.items,
    ).toEqual([med]);
    await expect(
      run(
        "saveDraft",
        { id: access.id, revision: context.access.revision, draft },
        doctor,
      ),
    ).rejects.toThrow("Draft changed");
  });
  test("issuance persists records once and cannot be edited", async () => {
    const { run, access } = await authorizedFixture();
    const c = (await run("getConsultation", { id: access.id }, doctor)) as {
      access: Access;
    };
    const saved = (await run(
      "saveDraft",
      {
        id: access.id,
        revision: c.access.revision,
        draft: { ...c.access.draft, items: [med] },
      },
      doctor,
    )) as Access;
    const rx = await run(
      "issuePrescription",
      { id: access.id, revision: saved.revision },
      doctor,
    );
    expect(
      await run(
        "issuePrescription",
        { id: access.id, revision: saved.revision },
        doctor,
      ),
    ).toEqual(rx);
    const home = (await run("getHome", {}, patient)) as Home;
    expect(home.prescriptions).toHaveLength(1);
    expect(home.medicines).toEqual([med]);
    await expect(
      run(
        "saveDraft",
        { id: access.id, revision: saved.revision, draft: saved.draft },
        doctor,
      ),
    ).rejects.toThrow("issued");
  });
  test("non-reviewers cannot approve credentials", async () => {
    const { run } = await fixture();
    await expect(
      run(
        "reviewDoctor",
        { doctorId: other, approve: true, reason: "An unauthorized review" },
        doctor,
      ),
    ).rejects.toThrow("Reviewer");
  });
  test("credential changes revoke doctor verification", async () => {
    const { run } = await fixture();
    const home = (await run("getHome", {}, doctor)) as Home;
    const {
      id,
      phone,
      verificationStatus,
      certificateKey,
      revision,
      ...editable
    } = home.profile as Profile;
    void id;
    void phone;
    void verificationStatus;
    void certificateKey;
    void revision;
    await run(
      "saveProfile",
      { ...editable, registrationNumber: "NEW" },
      doctor,
    );
    await expect(
      run("findPatient", { phone: patient.phone }, doctor),
    ).rejects.toThrow("verified doctor");
  });
});
