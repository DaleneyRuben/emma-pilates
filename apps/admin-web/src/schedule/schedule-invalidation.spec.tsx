import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { centro, equipetrol } from "../test/booking-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  nextMonday,
  saturdayEmpty,
  sessionFormHandlers,
  sessionsPath,
  weekSessions,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";

const equipetrolSession = {
  ...saturdayEmpty,
  id: "1e000000-0000-5000-8000-000000000009",
  branchId: equipetrol.id,
  branchName: equipetrol.name,
};

// ADR-0042: a change refetches the queries whose key names the Branch it
// happened in, never another Branch's cached week.
describe("Horario cache after a change", () => {
  useMockServer();

  it("refetches only the selected Branch's weeks", async () => {
    const reads: Record<string, number> = {};
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), ({ request }) => {
        const branchId =
          new URL(request.url).searchParams.get("branchId") ?? "";
        reads[branchId] = (reads[branchId] ?? 0) + 1;
        return jsonResponse(
          branchId === centro.id ? weekSessions : [equipetrolSession],
        );
      }),
      http.patch(apiUrl(`${sessionsPath}/${equipetrolSession.id}`), () =>
        jsonResponse({}),
      ),
    );
    const { user } = renderAdmin(`/?week=${nextMonday}`);
    await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );
    await user.click(
      await screen.findByRole("button", { name: /Reformer Pilates, 09:00/ }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
    await user.clear(within(panel).getByLabelText("Capacidad"));
    await user.type(within(panel).getByLabelText("Capacidad"), "8");
    const centroReads = reads[centro.id];
    const equipetrolReads = reads[equipetrol.id] ?? 0;
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(reads[equipetrol.id]).toBeGreaterThan(equipetrolReads),
    );
    await user.click(
      screen.getByRole("button", { name: "Sucursal Equipetrol" }),
    );
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Centro/ },
      ),
    );
    await screen.findByRole("button", { name: /Reformer Pilates, 07:00/ });
    expect(reads[centro.id]).toBe(centroReads);
  });
});
