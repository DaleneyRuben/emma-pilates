import { useGetStudioRules, type StudioRulesDto } from "@pilates/api-contracts";

// The Cancellation Window as the apps write it: «2 h 30», «3 h», «45 min».
export function formatCancellationWindow(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

// BKM-004 (ADR-0101): the studio's client-facing rules come from the API, so
// a change on the admin web reaches installed apps without a build. Unknown
// (undefined) while loading or when the request fails; screens then leave the
// rule out rather than guess it.
export function useStudioRules(fetcher: typeof globalThis.fetch): StudioRulesDto | undefined {
  const rules = useGetStudioRules({ fetcher, query: { staleTime: 60_000 } });
  return rules.data?.status === 200 ? rules.data.data : undefined;
}

// FIX-026: how many days a booking strip offers. The Studio Rule's booking
// window counts today, as the backend enforces it; the backend's default
// until the rules are read. At most seven, because the chips share the width:
// a wider window needs S13's «Otra» on the booking screens first.
const defaultBookingWindowDays = 7;
const stripMaxDays = 7;

export function bookingStripDays(rules: StudioRulesDto | undefined): number {
  return Math.min(rules?.bookingWindowDays ?? defaultBookingWindowDays, stripMaxDays);
}
