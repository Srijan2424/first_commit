// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import type { Access } from "../../../shared/domain";
import { api } from "../../services/api";
import { RequestCard } from "./HomePage";

vi.mock("../../services/api", () => ({
  api: { approve: vi.fn(), decline: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));

const request: Access = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  doctorId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  patientId: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
  doctorName: "Dr Test",
  patientName: "Patient Test",
  status: "REQUESTED",
  expiresAt: Date.now() + 10 * 60_000,
  revision: 1,
  draft: {
    items: [],
    complaint: "",
    observations: "",
    diagnosis: "",
    advice: "",
    followUp: "",
  },
};

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

test("patient authorization code survives a card remount", async () => {
  vi.mocked(api.approve).mockResolvedValue({
    code: "123456",
    expiresAt: Date.now() + 5 * 60_000,
  });
  const update = vi.fn();
  const view = render(<RequestCard request={request} onUpdate={update} />);
  expect(
    screen.getByRole("dialog", { name: "New consultation request" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Approve and generate code" }));
  expect(await screen.findByText("123456")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Minimize code" })).toBeTruthy();
  expect(update).not.toHaveBeenCalled();
  view.unmount();
  render(<RequestCard request={{ ...request, status: "APPROVED" }} onUpdate={update} />);
  await waitFor(() => expect(screen.getByText("123456")).toBeTruthy());
});
