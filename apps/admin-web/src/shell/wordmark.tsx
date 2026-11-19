import { cn } from "../lib/cn";

// Follow-up 232: «Emma Pilates Studio», «Pilates Studio» in Rosa profundo;
// never the tagline.
export function Wordmark({
  className,
  small = false,
}: {
  className?: string;
  small?: boolean;
}) {
  return (
    <span className={cn("flex items-baseline gap-2 font-serif", className)}>
      <span
        className={cn("text-texto", small ? "text-[20px]" : "text-titulo-2")}
      >
        Emma
      </span>
      <span
        className={cn("text-rosa-profundo", small ? "text-celda" : "text-fila")}
      >
        Pilates Studio
      </span>
    </span>
  );
}
