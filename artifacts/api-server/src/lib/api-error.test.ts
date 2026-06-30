import { describe, it, expect, vi } from "vitest";
import { sendError } from "./api-error";

describe("sendError", () => {
  it("calls res.status(status).json({ error: message })", () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as any;

    sendError(res, 404, "not found");

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: "not found" });
  });
});
