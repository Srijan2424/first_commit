import { expect, test } from "vitest";
import {
  medicationInput,
  profileInput,
  reconcile,
  validateDecisions,
  type Medication,
} from "../../shared/domain";
const old: Medication = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
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
const change: Medication = {
  ...old,
  id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  sourceId: old.id,
  strength: "2 mg",
  decision: "CHANGE",
  reason: "Test reason",
};
test("new account data does not contain a treatment record", () => {
  expect(reconcile([], [])).toEqual([]);
});
test("changed medicines replace only their source and preserve unrelated treatment", () => {
  const other = { ...old, id: "cccccccc-cccc-4ccc-cccc-cccccccccccc" };
  const result = reconcile([old, other], [change]);
  expect(result).toEqual([other, change]);
});
test("a duplicate decision for one medicine is rejected", () => {
  expect(() =>
    validateDecisions(
      [old],
      [change, { ...change, id: "dddddddd-dddd-4ddd-dddd-dddddddddddd" }],
    ),
  ).toThrow("Review each medicine once");
});
test("continuing a medicine cannot silently change the dose", () => {
  expect(() =>
    validateDecisions([old], [{ ...change, decision: "CONTINUE" }]),
  ).toThrow("Use Change");
});
test("stopping a medicine requires an explanation", () => {
  expect(() =>
    validateDecisions(
      [old],
      [{ ...old, id: change.id, sourceId: old.id, decision: "STOP" }],
    ),
  ).toThrow("Explain");
});
test("profiles cannot include a verification status or change ownership", () => {
  expect(
    profileInput.safeParse({
      role: "doctor",
      fullName: "Test Doctor",
      avatarId: "01",
      verificationStatus: "VERIFIED",
    }).success,
  ).toBe(false);
});
test("medicine inputs must have a complete dose and duration", () => {
  expect(
    medicationInput.safeParse({ ...old, dose: "", duration: "" }).success,
  ).toBe(false);
});
