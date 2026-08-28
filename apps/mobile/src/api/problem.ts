export type ApiProblem = {
  code: string;
  status: number;
};

export function normalizeProblem(value: unknown): ApiProblem {
  if (typeof value !== "object" || value === null) {
    return { code: "unexpected_error", status: 0 };
  }

  const problem = value as Record<string, unknown>;

  return {
    code: typeof problem.code === "string" ? problem.code : "unexpected_error",
    status: typeof problem.status === "number" ? problem.status : 0,
  };
}
