import { cleanup, screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  activeBranchesHandler,
  centro,
  equipetrol,
} from "../../test/booking-handlers";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { emptyPageHandlers } from "../../test/page-handlers";
import { renderAdmin } from "../../test/render-admin";
import {
  carolinaPrincipal,
  currentSessionPath,
  signedInHandlers,
} from "../../test/session-handlers";

// Walkthrough finding 121: a reload or a typed URL starts the admin web
// again, so the chosen Branch is remembered in this browser, per account.
describe("the remembered Branch", () => {
  useMockServer();
  beforeEach(() => {
    window.localStorage.clear();
    server.use(...signedInHandlers(), ...emptyPageHandlers());
  });
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  const heading = (name: string) =>
    screen.findByRole("heading", { level: 1, name });

  const chooseBranch = async (
    user: ReturnType<typeof renderAdmin>["user"],
    from: string,
    to: RegExp,
  ) => {
    await user.click(
      await screen.findByRole("button", { name: `Sucursal ${from}` }),
    );
    const popover = await screen.findByRole("dialog", { name: "Sucursal" });
    await user.click(within(popover).getByRole("option", { name: to }));
  };

  // A full page reload: the whole app is drawn again from nothing.
  const reload = (path: string) => {
    cleanup();
    return renderAdmin(path);
  };

  it("keeps the chosen Branch after a reload or a typed URL", async () => {
    const { user } = renderAdmin("/horario");
    await heading("Horario");
    await chooseBranch(user, "Centro", /Norte/);
    expect(
      screen.getByRole("button", { name: "Sucursal Norte" }),
    ).toBeInTheDocument();

    reload("/dinero/gastos");
    await heading("Gastos");

    expect(
      await screen.findByRole("button", { name: "Sucursal Norte" }),
    ).toBeInTheDocument();
  });

  it("still shows «Todo el estudio» on a studio-wide page after a reload", async () => {
    const { user } = renderAdmin("/horario");
    await heading("Horario");
    await chooseBranch(user, "Centro", /Norte/);

    reload("/dinero/pagos");
    await heading("Pagos");

    const topBar = screen.getByRole("banner");
    expect(within(topBar).getByText("Todo el estudio")).toBeInTheDocument();
    expect(
      within(topBar).queryByRole("button", { name: /^Sucursal/ }),
    ).not.toBeInTheDocument();
  });

  it("falls back to the first Branch when the remembered one is no longer active", async () => {
    const { user } = renderAdmin("/horario");
    await heading("Horario");
    await chooseBranch(user, "Centro", /Norte/);

    server.use(activeBranchesHandler([centro, equipetrol]));
    reload("/horario");
    await heading("Horario");

    expect(
      await screen.findByRole("button", { name: "Sucursal Centro" }),
    ).toBeInTheDocument();
  });

  it("remembers the Branch for each account apart", async () => {
    const { user } = renderAdmin("/horario");
    await heading("Horario");
    await chooseBranch(user, "Centro", /Norte/);

    server.use(
      http.get(apiUrl(currentSessionPath), () =>
        jsonResponse(carolinaPrincipal),
      ),
    );
    reload("/horario");
    await heading("Horario");

    expect(
      await screen.findByRole("button", { name: "Sucursal Centro" }),
    ).toBeInTheDocument();
  });

  it("still lets her choose a Branch when the browser refuses storage", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "QuotaExceededError");
    });
    const { user } = renderAdmin("/horario");
    await heading("Horario");

    await chooseBranch(user, "Centro", /Equipetrol/);

    expect(
      screen.getByRole("button", { name: "Sucursal Equipetrol" }),
    ).toBeInTheDocument();
  });
});
