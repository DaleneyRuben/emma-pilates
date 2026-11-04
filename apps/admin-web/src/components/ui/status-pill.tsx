import { cn } from "../../lib/cn";

const tones = {
  exito: "bg-exito/15 text-exito-texto [&>span]:bg-exito",
  advertencia:
    "bg-advertencia/15 text-advertencia-texto [&>span]:bg-advertencia",
  error: "bg-error/15 text-error-texto [&>span]:bg-error",
  neutral: "bg-borde-fuerte/50 text-texto-tenue [&>span]:bg-texto-muy-tenue",
} as const;

// Design system → Status pills: a tint of the semantic color, its darker
// text tone, and a 6 px dot so the state never rests on color alone.
export function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof tones;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-pie font-semibold whitespace-nowrap",
        tones[tone],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" />
      {children}
    </span>
  );
}
