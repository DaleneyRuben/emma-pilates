const pad = (value: number) => String(value).padStart(2, "0");

/** `dd/mm/aaaa`, the design system's date format. */
export const fullCivilDate = (date: string) =>
  `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;

// The API refuses a last day that is not after today or is more than five
// years away (FIX-072); the calendar offers the same span.
export function validUntilSpan(today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const latest = `${year + 5}-${pad(month)}-${pad(day)}`;
  return {
    firstMonth: today.slice(0, 7),
    lastMonth: latest.slice(0, 7),
    isOff: (candidate: string) => candidate <= today || candidate > latest,
  };
}
