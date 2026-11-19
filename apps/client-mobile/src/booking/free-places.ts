/**
 * The Client reads a class's places as the free ones (owner 2026-11-19):
 * «5 de 8 libres», «Último lugar» or «Clase llena».
 */
export function freePlacesLabel(bookedCount: number, capacity: number): string {
  const free = Math.max(0, capacity - bookedCount);
  if (free === 0) return "Clase llena";
  if (free === 1) return "Último lugar";
  return `${free} de ${capacity} libres`;
}
