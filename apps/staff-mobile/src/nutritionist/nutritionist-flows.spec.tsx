import { cleanup, fireEvent, waitFor, within } from "@testing-library/react-native";
import { clearMobileQueryCache } from "@pilates/mobile-core";

import { jsonResponse, routeFetcher } from "../test-support";
import {
  block,
  centro,
  day,
  entry,
  inDays,
  openApp,
  openAvailability,
  page,
  profile,
  routes,
  today,
  urubo,
} from "./nutritionist-test-support";

jest.setTimeout(30_000);

describe("Nutritionist agenda and availability", () => {
  afterEach(() => {
    cleanup();
    clearMobileQueryCache();
  });

  it("groups upcoming Evaluations by day and cancels a selected one after confirming", async () => {
    let cancelled = false;
    const fetcher = routeFetcher(
      routes({
        "/api/v1/nutritionist/evaluations": () =>
          jsonResponse(
            page([
              ...(cancelled
                ? []
                : [entry("evaluation-1", today, "23:00", "Valeria Áñez", "first")]),
              entry("evaluation-2", inDays(1), "09:45", "Lucía Justiniano", "follow_up"),
            ]),
          ),
        "DELETE /api/v1/nutritionist/evaluations/evaluation-1": () => {
          cancelled = true;
          return new Response(null, { status: 204 });
        },
      }),
    );
    const screen = await openApp(fetcher);

    await waitFor(() => {
      expect(screen.getByText("Valeria Áñez")).toBeOnTheScreen();
    });
    expect(screen.getByText("Hola, Gabriela")).toBeOnTheScreen();
    expect(screen.getByText(/^Hoy · /)).toBeOnTheScreen();
    expect(screen.getByText(/^Mañana · /)).toBeOnTheScreen();
    expect(screen.getByText("Primera evaluación")).toBeOnTheScreen();
    expect(screen.getByText("Seguimiento")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancelar evaluación" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "23:00 Valeria Áñez" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar evaluación" }));
    const sheet = within(screen.getByTestId("cancel-evaluation-sheet"));
    expect(
      sheet.getByText("Le avisaremos a Valeria Áñez y el horario quedará libre."),
    ).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Sí, cancelar evaluación" }));

    await waitFor(() => {
      expect(screen.getByText("Evaluación cancelada")).toBeOnTheScreen();
    });
    expect(screen.queryByText("Valeria Áñez")).toBeNull();
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/nutritionist/evaluations/evaluation-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("shows the calm empty agenda", async () => {
    const screen = await openApp(routeFetcher(routes()));

    await waitFor(() => {
      expect(screen.getByText("No tienes evaluaciones agendadas.")).toBeOnTheScreen();
    });
    expect(
      screen.getByText("Revisa tu disponibilidad para que las clientas puedan reservar."),
    ).toBeOnTheScreen();
  });

  it("lists blocks from Monday to Sunday with their turnos and future start dates", async () => {
    const fetcher = routeFetcher(
      routes({
        "/api/v1/nutritionist/availability-blocks": () =>
          jsonResponse([
            block({
              id: "block-saturday",
              weekday: 6,
              endsAtLocal: "12:00",
              slotsPerWeek: 4,
              upcomingBookedCount: 0,
            }),
            block(),
            block({
              id: "block-thursday",
              weekday: 4,
              startsAtLocal: "15:00",
              endsAtLocal: "18:00",
              effectiveFrom: "2099-10-01",
              slotsPerWeek: 4,
              upcomingBookedCount: 1,
            }),
          ]),
      }),
    );
    const screen = await openAvailability(fetcher);

    await waitFor(() => {
      expect(screen.getByText("3 horarios")).toBeOnTheScreen();
    });
    const cards = screen.getAllByRole("button", { name: /^Editar horario/ });
    expect(cards.map((card) => card.props.accessibilityLabel)).toEqual([
      "Editar horario Lunes, 9:00 – 13:00",
      "Editar horario Jueves, 15:00 – 18:00",
      "Editar horario Sábado, 9:00 – 12:00",
    ]);
    expect(screen.getByText("5 cupos de 45 min · 2 reservados")).toBeOnTheScreen();
    expect(screen.getByText("4 cupos de 45 min · 1 reservado")).toBeOnTheScreen();
    expect(screen.getByText("4 cupos de 45 min · sin reservas")).toBeOnTheScreen();
    expect(screen.getByText("Desde el jueves 1 de octubre")).toBeOnTheScreen();
    // MOB-041: S16 ends each block row in the 19 pt Palo de rosa chevron.
    const chevrons = screen.getAllByTestId("chevron", { includeHiddenElements: true });
    expect(chevrons).toHaveLength(3);
    expect(chevrons[0]).toHaveProp("stroke", "#B78380");
    expect(screen.queryByText("›")).toBeNull();
  });

  it("shows the empty availability state", async () => {
    const screen = await openAvailability(routeFetcher(routes()));

    await waitFor(() => {
      expect(
        screen.getByText("Aún no publicaste horarios de disponibilidad."),
      ).toBeOnTheScreen();
    });
  });

  it("publishes a new block from today at the only Branch", async () => {
    let created = false;
    const fetcher = routeFetcher(
      routes({
        "/api/v1/nutritionist/availability-blocks": () =>
          jsonResponse(
            created
              ? [block({ weekday: 2, startsAtLocal: "10:00", endsAtLocal: "12:15" })]
              : [],
          ),
        "POST /api/v1/nutritionist/availability-blocks": () => {
          created = true;
          return jsonResponse(
            block({ weekday: 2, startsAtLocal: "10:00", endsAtLocal: "12:15" }),
            201,
          );
        },
      }),
    );
    const screen = await openAvailability(fetcher);
    await fireEvent.press(screen.getAllByRole("button", { name: "Nuevo horario" })[0]!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Martes" })).toBeOnTheScreen();
    });
    expect(screen.queryByRole("button", { name: "Sucursal Centro" })).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Martes" }));
    await fireEvent.press(screen.getByRole("button", { name: "Hora de inicio: Elegir" }));
    await fireEvent.press(screen.getByRole("button", { name: "10:00" }));
    await fireEvent.press(screen.getByRole("button", { name: "Hora de fin: Elegir" }));
    await fireEvent.press(screen.getByRole("button", { name: "12:15" }));
    expect(screen.getByText("3 turnos de 45 min")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(screen.getByText("Martes, 10:00 – 12:15")).toBeOnTheScreen();
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/nutritionist/availability-blocks",
      expect.objectContaining({
        body: JSON.stringify({
          branchId: centro.id,
          weekday: 2,
          startsAtLocal: "10:00",
          endsAtLocal: "12:15",
          effectiveFrom: today,
        }),
        headers: expect.objectContaining({ "idempotency-key": expect.any(String) }),
        method: "POST",
      }),
    );
  });

  it("asks for the Branch when the Nutritionist works at more than one", async () => {
    const fetcher = routeFetcher(
      routes({
        "/api/v1/staff-members/current": () => jsonResponse(profile([centro, urubo])),
        "POST /api/v1/nutritionist/availability-blocks": () =>
          jsonResponse({ code: "availability_block_overlap", status: 409 }, 409),
      }),
    );
    const screen = await openAvailability(fetcher);
    await fireEvent.press(screen.getAllByRole("button", { name: "Nuevo horario" })[0]!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sucursal Urubó" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Lunes" }));
    await fireEvent.press(screen.getByRole("button", { name: "Hora de inicio: Elegir" }));
    await fireEvent.press(screen.getByRole("button", { name: "10:00" }));
    await fireEvent.press(screen.getByRole("button", { name: "Hora de fin: Elegir" }));
    await fireEvent.press(screen.getByRole("button", { name: "11:00" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Sucursal Urubó" }));
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(screen.getByText("Se superpone con otro de tus horarios.")).toBeOnTheScreen();
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/nutritionist/availability-blocks",
      expect.objectContaining({
        body: expect.stringContaining(`"branchId":"${urubo.id}"`),
      }),
    );
  });

  it("replaces a block with booked Evaluations after confirming they stay", async () => {
    const fetcher = routeFetcher(
      routes({
        "/api/v1/nutritionist/availability-blocks": () => jsonResponse([block()]),
        "POST /api/v1/nutritionist/availability-blocks/block-monday/replacement": () =>
          jsonResponse(
            {
              ended: block({ effectiveUntil: today }),
              replacement: block({ id: "block-new", endsAtLocal: "12:00" }),
              withdrawnSlots: 3,
              keptEvaluations: 2,
            },
            201,
          ),
      }),
    );
    const screen = await openAvailability(fetcher);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Editar horario Lunes, 9:00 – 13:00" }),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Editar horario Lunes, 9:00 – 13:00" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Aplicar cambios desde")).toBeOnTheScreen();
    });
    expect(screen.getByText("5 turnos de 45 min · 2 ya reservados")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Hora de fin: 13:00" }));
    await fireEvent.press(screen.getByRole("button", { name: "12:00" }));
    await fireEvent.press(screen.getByRole("button", { name: "Guardar" }));

    const sheet = within(screen.getByTestId("block-change-sheet"));
    expect(sheet.getByText("¿Aplicar el cambio?")).toBeOnTheScreen();
    expect(
      sheet.getByText("Las 2 evaluaciones ya reservadas se mantienen."),
    ).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Aplicar cambio" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Nuevo horario" })).toBeOnTheScreen();
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/nutritionist/availability-blocks/block-monday/replacement",
      expect.objectContaining({
        body: JSON.stringify({
          branchId: centro.id,
          weekday: 1,
          startsAtLocal: "09:00",
          endsAtLocal: "12:00",
          effectiveFrom: today,
        }),
        method: "POST",
      }),
    );
  });

  it("removes a block from the chosen date after confirming", async () => {
    const fetcher = routeFetcher(
      routes({
        "/api/v1/nutritionist/availability-blocks": () => jsonResponse([block()]),
        "POST /api/v1/nutritionist/availability-blocks/block-monday/end": () =>
          jsonResponse({
            block: block({ effectiveUntil: today }),
            withdrawnSlots: 3,
            keptEvaluations: 2,
          }),
      }),
    );
    const screen = await openAvailability(fetcher);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Editar horario Lunes, 9:00 – 13:00" }),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Editar horario Lunes, 9:00 – 13:00" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Eliminar horario" })).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByRole("button", { name: "Eliminar horario" }));

    const sheet = within(screen.getByTestId("block-change-sheet"));
    expect(sheet.getByText("¿Quitar este horario?")).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: "Quitar horario" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Nuevo horario" })).toBeOnTheScreen();
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/nutritionist/availability-blocks/block-monday/end",
      expect.objectContaining({
        body: JSON.stringify({ effectiveFrom: today }),
        method: "POST",
      }),
    );
  });
});
