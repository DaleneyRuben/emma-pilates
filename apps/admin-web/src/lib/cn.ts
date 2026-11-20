import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { typeScale } from "../components/ui/typography";

// tailwind-merge does not know the closed scale of index.css (follow-up
// 285): without it, it reads a size token as a colour and drops either it or
// the real text colour that follows; and the `tipo-*` classes form one group,
// so a later style replaces an earlier one (`cn(segmentClass, "tipo-compacto")`).
const twMerge = extendTailwindMerge<"tipo">({
  extend: {
    theme: { text: Object.keys(typeScale) },
    classGroups: { tipo: [{ tipo: Object.keys(typeScale) }] },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
