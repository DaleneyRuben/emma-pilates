// FIX-089 (palette B): the one chip and the one selected state. Unselected
// is Crema with a 1 px Arcilla border; selected is the solid Rosa profundo
// with a Crema weight-600 label. 44 px tall at phone width, 38 from md up.
export const chipClass =
  "inline-flex h-[44px] items-center justify-center gap-2 rounded-full border border-arcilla bg-crema px-3.5 text-celda text-rosa-profundo hover:bg-rubor focus-visible:shadow-foco has-focus-visible:shadow-foco md:h-[38px]";

export const selectedClass =
  "border-rosa-profundo bg-rosa-profundo font-semibold text-crema hover:bg-rosa-profundo";

export const unselectedClass = "border-arcilla bg-crema text-rosa-profundo";
