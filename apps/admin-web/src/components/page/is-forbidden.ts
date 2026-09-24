import { isApiError } from "../../api/problem";

// A 403 means this Administrator can no longer act here (ADR-0054 decides
// on current data); the page hides its actions instead of offering them.
export const isForbidden = (error: unknown): boolean =>
  isApiError(error) && error.status === 403;
