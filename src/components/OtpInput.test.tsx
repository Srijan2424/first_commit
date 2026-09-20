// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { OtpInput } from "./OtpInput";
afterEach(cleanup);
function Form() {
  const [value, setValue] = useState("");
  return (
    <>
      <OtpInput value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}
test("entering a digit moves focus to the next field", async () => {
  const user = userEvent.setup();
  render(<Form />);
  await user.type(screen.getByLabelText("Digit 1"), "4");
  expect(document.activeElement).toBe(screen.getByLabelText("Digit 2"));
  expect(screen.getByTestId("value").textContent).toBe("4");
});
test("pasting fills all six fields and ignores non-digits", async () => {
  const user = userEvent.setup();
  render(<Form />);
  await user.click(screen.getByLabelText("Digit 1"));
  await user.paste("12 34-56");
  expect(screen.getByTestId("value").textContent).toBe("123456");
  expect(document.activeElement).toBe(screen.getByLabelText("Digit 6"));
});
test("backspace on an empty field clears and focuses the previous field", async () => {
  const user = userEvent.setup();
  render(<Form />);
  await user.type(screen.getByLabelText("Digit 1"), "4");
  await user.keyboard("{Backspace}");
  expect(screen.getByTestId("value").textContent).toBe("");
  expect(document.activeElement).toBe(screen.getByLabelText("Digit 1"));
});
