// Design follow-up 53 §4 on v2 (follow-up 225 §7): one Lino line with a
// Palo de rosa bar, above the content, naming what a change did; the page
// clears it when the next panel opens. Green stays for status pills.
export function PageNotice({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="rounded-tarjeta border-l-4 border-primario bg-lino px-4 py-3 text-celda text-texto"
    >
      {children}
    </p>
  );
}
