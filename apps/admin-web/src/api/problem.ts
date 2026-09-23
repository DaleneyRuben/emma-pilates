/**
 * The admin web branches on the backend's stable problem `code`, never on
 * human-readable text (ADR-0021). Anything the backend did not shape as an
 * RFC 9457 problem collapses to `unexpected_error`; a request that never
 * reached the backend is `network_error` with status 0.
 */
export type ApiProblem = {
  status: number;
  code: string;
  title?: string;
  detail?: string;
  retryAfterSeconds?: number;
};

type ProblemSource = {
  status: number;
  body: unknown;
  headers?: Headers;
};

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const retryAfterSeconds = (headers?: Headers): number | undefined => {
  const raw = headers?.get("Retry-After");
  if (raw === null || raw === undefined || !/^\d+$/.test(raw.trim())) {
    return undefined;
  }
  return Number.parseInt(raw, 10);
};

export function normalizeProblem(source: ProblemSource): ApiProblem {
  if (source.status === 0) {
    return { status: 0, code: "network_error" };
  }

  const body =
    typeof source.body === "object" && source.body !== null
      ? (source.body as Record<string, unknown>)
      : {};
  const problem: ApiProblem = {
    status: source.status,
    code: optionalString(body.code) ?? "unexpected_error",
  };
  const title = optionalString(body.title);
  const detail = optionalString(body.detail);
  const retryAfter = retryAfterSeconds(source.headers);

  if (title !== undefined) problem.title = title;
  if (detail !== undefined) problem.detail = detail;
  if (retryAfter !== undefined) problem.retryAfterSeconds = retryAfter;

  return problem;
}

export class ApiError extends Error {
  readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(`${problem.code} (${problem.status})`);
    this.name = "ApiError";
    this.problem = problem;
  }

  get status(): number {
    return this.problem.status;
  }

  get code(): string {
    return this.problem.code;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;
