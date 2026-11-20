// Rosa Emma (rw.py chips): a filter chip is a white pill with a 1 px
// Arcilla ring; the chosen one is solid Rosa profundo with a bold white
// label. 44 px tall at phone width, 36 from md up.
export const chipClass =
  "inline-flex h-[44px] items-center justify-center gap-2 rounded-full bg-superficie px-3.5 text-celda text-texto inset-ring inset-ring-borde-fuerte hover:bg-superficie-hundida focus-visible:shadow-foco has-focus-visible:shadow-foco md:h-[36px]";

export const selectedClass =
  "bg-primario font-bold text-blanco inset-ring-primario hover:bg-primario";

export const unselectedClass =
  "bg-superficie text-texto inset-ring inset-ring-borde-fuerte";
