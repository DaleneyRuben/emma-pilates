import type { RecommendationDto } from "@pilates/api-contracts";
import { recommendationGroups } from "./recommendation-groups";

const weak = (
  id: string,
  trainer: string,
  weekday: number,
  state: RecommendationDto["state"] = "new",
): RecommendationDto => ({
  id,
  rule: "weak_schedule",
  subject: `${trainer}-id:${weekday}`,
  period: "2026-11",
  detail: "Revisa el horario del lunes: promedia 1 alumna en 4 clases.",
  state,
  trainerName: trainer,
  weekday,
});

const inactive = (
  id: string,
  name: string,
  state: RecommendationDto["state"] = "new",
): RecommendationDto => ({
  id,
  rule: "inactive_client",
  subject: `${id}-client`,
  period: "2026-11",
  detail: "Contacta a la clienta: tiene un plan vigente y no reservó este mes.",
  state,
  clientId: `${id}-client`,
  clientName: name,
});

// FIX-084 (Inicio A): Inicio groups the month's findings by person or type,
// hides those already settled, and counts what «Ver las N» opens.
describe("the Inicio recommendation groups", () => {
  it("joins a trainer's weekdays into one row, in weekday order", () => {
    const { groups, open } = recommendationGroups([
      weak("a", "Daniela Ortiz", 4),
      weak("b", "Daniela Ortiz", 1),
      weak("c", "Daniela Ortiz", 2),
      weak("d", "Valeria Peña", 6),
    ]);
    expect(open).toBe(4);
    expect(groups.map((group) => [group.title, group.note, group.ids])).toEqual(
      [
        [
          "Revisa el horario de Daniela Ortiz",
          "3 días de la semana: lunes, martes y jueves",
          ["a", "b", "c"],
        ],
        [
          "Revisa el horario de Valeria Peña",
          "1 día de la semana: sábado",
          ["d"],
        ],
      ],
    );
  });

  it("joins every client into one row that names the first three", () => {
    const { groups } = recommendationGroups([
      inactive("a", "Carla Prueba"),
      inactive("b", "Rocío Vargas"),
      inactive("c", "Sofía Paredes"),
      inactive("d", "Lucía Rojas"),
      inactive("e", "Mariana Soto"),
    ]);
    expect(groups.map((group) => [group.title, group.note])).toEqual([
      [
        "Contacta a 5 clientas con plan vigente que no reservaron",
        "Carla Prueba, Rocío Vargas, Sofía Paredes y 2 más",
      ],
    ]);
  });

  it("names a single client in the singular and opens her file", () => {
    const { groups } = recommendationGroups([inactive("a", "Carla Prueba")]);
    expect(groups[0]).toMatchObject({
      title: "Contacta a 1 clienta con plan vigente que no reservó",
      note: "Carla Prueba",
      link: {
        to: "/clientas",
        search: { q: "Carla Prueba", cliente: "a-client" },
      },
    });
  });

  it("leaves out what is already resolved or discarded", () => {
    const { groups, open } = recommendationGroups([
      weak("a", "Daniela Ortiz", 1, "resolved"),
      weak("b", "Daniela Ortiz", 2, "dismissed"),
      inactive("c", "Carla Prueba", "seen"),
      inactive("d", "Rocío Vargas", "resolved"),
    ]);
    expect(open).toBe(1);
    expect(groups.map((group) => group.ids)).toEqual([["c"]]);
  });

  it("puts the schedule rows before the clients row", () => {
    const { groups } = recommendationGroups([
      inactive("a", "Carla Prueba"),
      weak("b", "Daniela Ortiz", 1),
    ]);
    expect(groups.map((group) => group.kind)).toEqual(["schedule", "clients"]);
  });
});
