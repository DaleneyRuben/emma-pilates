import { normalizeProblem } from "./problem";

describe("normalizeProblem", () => {
  it("preserves the stable API problem code", () => {
    expect(
      normalizeProblem({
        code: "authentication_failed",
        status: 401,
        title: "Unauthorized",
      }),
    ).toEqual({
      code: "authentication_failed",
      status: 401,
    });
  });

  it("uses a generic code for an unrecognized response", () => {
    expect(normalizeProblem({ status: "unknown" })).toEqual({
      code: "unexpected_error",
      status: 0,
    });
  });
});
