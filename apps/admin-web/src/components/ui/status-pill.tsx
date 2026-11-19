type Tone = "advertencia" | "error" | "exito" | "neutral";

// FIX-088 (design audit, round 2): a pill only for an exception (Advertencia,
// Error); a normal state («Activo», «Confirmado», «Revisado») is plain text.
// FIX-089 (palette B): every exception pill is the same Rubor pill with a
// bold 12 px Rosa profundo word; the word carries the state, not a colour.
export function StatusPill({
  tone,
  children,
}: {
  tone: Tone;
  children: string;
}) {
  if (tone === "exito" || tone === "neutral") {
    return (
      <span className="text-pie whitespace-nowrap text-rosa-profundo">
        {children}
      </span>
    );
  }
  return (
    <span
      data-status-pill=""
      className="inline-flex h-[24px] items-center rounded-full bg-rubor px-2.5 text-pie font-bold whitespace-nowrap text-rosa-profundo"
    >
      {children}
    </span>
  );
}
