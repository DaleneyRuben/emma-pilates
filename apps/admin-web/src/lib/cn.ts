import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's default font sizes; without the Emma
// scale from index.css it reads `text-cuerpo` as a color and drops either
// it or the real text color (`text-blanco`) that follows.
const emmaFontSizes = [
  "display",
  "titulo-1",
  "titulo-2",
  "precio",
  "cuerpo-grande",
  "cuerpo",
  "etiqueta",
  "nota",
  "titulo-pagina",
  "titulo-panel",
  "celda",
  "cabecera-tabla",
  "etiqueta-campo",
  "ayuda",
  "fila-menu",
];

const twMerge = extendTailwindMerge({
  extend: { theme: { text: emmaFontSizes } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
