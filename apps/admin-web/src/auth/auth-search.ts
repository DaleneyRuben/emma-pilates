import { z } from "zod";

export const loginNotices = [
  "session-ended",
  "activated",
  "password-updated",
] as const;
export type LoginNotice = (typeof loginNotices)[number];

// Only a path inside this app may be a post-Login destination; anything
// else (another origin, a protocol-relative URL) is dropped, never followed.
export const safeRedirect = (value: unknown): string | undefined =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.startsWith("/\\")
    ? value
    : undefined;

export const loginSearchSchema = z.object({
  redirect: z.unknown().transform(safeRedirect).optional(),
  notice: z.enum(loginNotices).optional().catch(undefined),
});

export type LoginSearch = z.infer<typeof loginSearchSchema>;
