import type { Branch } from "./branch-context";

// WEB-001 ships the selector with the fixture Branches so the shell can be
// exercised before WEB-003 replaces this list with GET /administrator/branches.
export const placeholderBranches: readonly Branch[] = [
  { id: "centro", name: "Centro", address: "Calle Ayacucho 245" },
  { id: "equipetrol", name: "Equipetrol", address: "Av. San Martín 1120" },
  { id: "urubo", name: "Urubó", address: "Condominio Los Tajibos" },
];
