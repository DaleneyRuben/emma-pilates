/**
 * The Client reads a class's places as the free ones (owner 2026-11-19):
 * «5 de 8 libres», «Último lugar» or «Clase llena».
 */
export function freePlacesLabel(availableSeats: number, capacity: number): string {
  if (availableSeats <= 0) return "Clase llena";
  if (availableSeats === 1) return "Último lugar";
  return `${availableSeats} de ${capacity} libres`;
}
