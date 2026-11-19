/** «Valeria Quispe» → «VQ»: how a Client sees who else is coming to a class. */
export const nameInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
