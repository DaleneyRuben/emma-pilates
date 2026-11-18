// FIX-088 (Tablas en celular A): what a row's phone card shows, part by part.
export function compactCard(row: HTMLElement) {
  const part = (name: string) =>
    row.querySelector(`[data-part="${name}"]`)?.textContent ?? null;
  return {
    compact: row.hasAttribute("data-compact"),
    title: part("title"),
    detail: part("detail"),
    status: part("status"),
    labels: [...row.querySelectorAll("td[data-label]")].length,
  };
}
