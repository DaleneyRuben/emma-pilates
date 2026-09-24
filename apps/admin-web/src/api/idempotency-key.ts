import { useCallback, useRef } from "react";

/**
 * ADR-0060: a retry-sensitive command carries an Idempotency-Key. Sending the
 * same body again (a lost answer, a second click) reuses the key so the
 * backend replays the first result; a changed body gets a new key, because
 * the backend refuses a key reused with different data.
 */
export function useIdempotencyKey(): (body: unknown) => string {
  const last = useRef<{ body: string; key: string } | null>(null);
  return useCallback((body: unknown) => {
    const text = JSON.stringify(body);
    if (last.current === null || last.current.body !== text) {
      last.current = { body: text, key: crypto.randomUUID() };
    }
    return last.current.key;
  }, []);
}

export const idempotencyHeaders = (key: string): RequestInit => ({
  headers: { "Idempotency-Key": key },
});
