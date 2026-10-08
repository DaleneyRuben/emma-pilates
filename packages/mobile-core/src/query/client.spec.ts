import { createMobileQueryClient } from "./client";

describe("createMobileQueryClient", () => {
  it("does not retry failed client requests by default", () => {
    expect(createMobileQueryClient().getDefaultOptions().queries?.retry).toBe(false);
  });
});
