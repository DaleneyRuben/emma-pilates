// Design follow-up 53 §4: one Éxito-tinted line above the content naming
// what a change did; the page clears it when the next panel opens.
export function PageNotice({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="rounded-control border border-exito/40 bg-exito/10 px-3 py-2 text-nota text-exito-texto"
    >
      {children}
    </p>
  );
}
