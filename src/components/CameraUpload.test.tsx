// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CameraUpload } from "./CameraUpload";
vi.mock("../services/api", () => ({
  call: vi.fn().mockRejectedValue(new Error("Service unavailable")),
  errorMessage: (e: Error) => e.message,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("camera permission failure offers a file upload fallback", async () => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  const user = userEvent.setup();
  render(<CameraUpload onSaved={vi.fn()} />);
  await user.click(screen.getByText("Take a photo"));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.getByText("Choose file")).toBeTruthy();
});
test("a failed cloud upload never displays saved success", async () => {
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:test",
    revokeObjectURL: vi.fn(),
  });
  const user = userEvent.setup();
  const saved = vi.fn();
  const { container } = render(<CameraUpload onSaved={saved} />);
  await user.upload(
    container.querySelector("input[type=file]")!,
    new File(["test"], "test.png", { type: "image/png" }),
  );
  expect(screen.getByAltText("Captured registration document")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Submit for verification" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(saved).not.toHaveBeenCalled();
  expect(screen.queryByText("Saved for review")).toBeNull();
});
