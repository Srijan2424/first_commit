import { describe, expect, it, vi } from "vitest";
import { scrollToTop } from "./scrollToTop";

describe("scrollToTop", () => {
  it("does not expose a Promise returned by an instrumented browser", () => {
    const scroll = vi.fn(() => Promise.resolve());

    expect(scrollToTop(scroll)).toBeUndefined();
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0 });
  });
});
