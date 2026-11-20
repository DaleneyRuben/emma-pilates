// Rosa Emma (rw.py chips): a filter chip is a white pill with a 1 px
// Arcilla ring; the chosen one is solid Rosa profundo with a white label
// of the same weight (follow-up 285, rule 4). 44 px tall at phone width, 36 from md up.
export const chipClass =
  "inline-flex h-[44px] items-center justify-center gap-2 rounded-full bg-superficie px-3.5 tipo-compacto text-texto inset-ring inset-ring-borde-fuerte hover:bg-superficie-hundida focus-visible:shadow-foco has-focus-visible:shadow-foco md:h-[36px]";

export const selectedClass =
  "bg-primario text-sobre-primario inset-ring-primario hover:bg-primario";

export const unselectedClass =
  "bg-superficie text-texto inset-ring inset-ring-borde-fuerte";
