import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  nextMonday,
  sessionFormHandlers,
  sessionsPath,
  weekSessions,
} from "../test/schedule-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { studioRules, studioRulesPath } from "../test/studio-settings-fixtures";

const openConfirmation = async () => {
  const { user } = renderAdmin(`/?week=${nextMonday}`);
  await user.click(
    await screen.findByRole("button", { name: /Mat Pilates, 16:00/ }),
  );
  const panel = await screen.findByRole("dialog", { name: "Editar sesión" });
  await user.click(
    within(panel).getByRole("button", { name: "Cancelar sesión" }),
  );
  return screen.findByRole("alertdialog", { name: "¿Cancelar esta sesión?" });
};

// BKM-004: AW03's last-resort cancellation names the Cancellation Window
// from the Studio Settings, not a fixed 2 h 30.
describe("AW03 cancellation copy and the Studio Settings", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), ...sessionFormHandlers());
    server.use(
      http.get(apiUrl(sessionsPath), () => jsonResponse(weekSessions)),
    );
  });

  it("names the configured window", async () => {
    server.use(
      http.get(apiUrl(studioRulesPath), () =>
        jsonResponse({ ...studioRules, cancellationWindowMinutes: 180 }),
      ),
    );

    const confirm = await openConfirmation();

    expect(
      await within(confirm).findByText(
        "Se cancelan las 10 reservas y cada clienta recupera su clase, aunque falten menos de 3 h. Avisamos a cada clienta y a las 3 personas en lista de espera. No se puede deshacer.",
      ),
    ).toBeInTheDocument();
  });

  it("leaves the window out while the rules cannot be read", async () => {
    server.use(http.get(apiUrl(studioRulesPath), () => jsonResponse({}, 503)));

    const confirm = await openConfirmation();

    expect(
      await within(confirm).findByText(
        "Se cancelan las 10 reservas y cada clienta recupera su clase. Avisamos a cada clienta y a las 3 personas en lista de espera. No se puede deshacer.",
      ),
    ).toBeInTheDocument();
  });
});
