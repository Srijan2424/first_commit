// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MedicationEditor } from "./MedicationEditor";
import type { Medication } from "../../shared/domain";
vi.mock("../services/medicines", () => ({
  searchMedicines: vi.fn().mockResolvedValue([]),
}));
afterEach(cleanup);
const item: Medication = {
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
test("editing a field saves its entered value rather than the previous fixed default", async () => {
  const user = userEvent.setup();
  const save = vi.fn();
  render(<MedicationEditor item={item} onSave={save} onCancel={() => {}} />);
  await user.clear(screen.getByLabelText("Strength"));
  await user.type(screen.getByLabelText("Strength"), "3 mg");
  await user.click(screen.getByText("Save to draft"));
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ strength: "3 mg" }),
  );
});
test("an empty new medicine does not save", async () => {
  const user = userEvent.setup();
  const save = vi.fn();
  render(<MedicationEditor onSave={save} onCancel={() => {}} />);
  await user.click(screen.getByText("Save to draft"));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeTruthy();
});
