import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { DeviceEventEmitter, ScrollView } from "react-native";

import { colors } from "../ui/tokens";
import { textVariants } from "../ui/type-scale";
import { FeedbackScreen } from "./feedback-screen";
import { readFeedbackMetadata } from "./feedback-metadata";

const metadata = {
  appVersion: "1.0.1",
  appBuild: "3",
  platform: "android",
  osVersion: "14",
} as const;
const comment = "No puedo ver mis reservas de mañana.";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

const sent = () => jsonResponse({ id: "feedback-id", createdAt: "2026-10-23T15:00:00.000Z" }, 201);

async function renderScreen(fetcher: jest.Mock, onBack = jest.fn()) {
  let next = 0;
  const screen = await render(
    <FeedbackScreen
      fetcher={fetcher}
      metadata={metadata}
      newIdempotencyKey={() => `key-${(next += 1)}`}
      onBack={onBack}
    />,
  );
  return screen;
}

const sendButton = (screen: Awaited<ReturnType<typeof render>>) =>
  screen.getByRole("button", { name: "Enviar comentario" });

describe("FeedbackScreen (REL-012)", () => {
  // Walkthrough n.º 15 (C25c): the button is always on; a tap with something
  // missing marks it and brings the form back to it, instead of a silent
  // disabled button.
  it("marks the missing type and text on tap, counting up to 2,000", async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(() => {});
    const fetcher = jest.fn().mockResolvedValue(sent());
    const screen = await renderScreen(fetcher);

    expect(screen.getByText("Enviar comentarios")).toBeOnTheScreen();
    expect(sendButton(screen)).toBeEnabled();
    await fireEvent.changeText(screen.getByLabelText("Comentario"), "  Muy mal  ");
    expect(screen.getByText("11 / 2000")).toBeOnTheScreen();
    await fireEvent.press(sendButton(screen));

    expect(screen.getByText("Elige el tipo de comentario")).toBeOnTheScreen();
    // C25c: the notice is titulo-fila with an alert icon, the three chips
    // share the width and take the 2 pt dark outline under the «TIPO» eyebrow.
    expect(screen.getByText("Elige el tipo de comentario")).toHaveStyle(
      textVariants["titulo-fila"],
    );
    expect(screen.getByTestId("feedback-type-error-icon")).toBeOnTheScreen();
    expect(screen.getByText("TIPO")).toBeOnTheScreen();
    for (const name of ["Problema", "Sugerencia", "Otro"]) {
      expect(screen.getByRole("button", { name })).toHaveStyle({
        borderColor: colors.primary,
        borderWidth: 2,
        flex: 1,
      });
    }
    expect(screen.getByText("Escribe al menos 10 caracteres.")).toBeOnTheScreen();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: 0 }));
    expect(fetcher).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Problema" }));
    await fireEvent.changeText(screen.getByLabelText("Comentario"), comment);
    expect(screen.getByRole("button", { name: "Problema" })).toBeSelected();
    expect(screen.queryByText("Elige el tipo de comentario")).toBeNull();
    expect(screen.queryByText("Escribe al menos 10 caracteres.")).toBeNull();
    await fireEvent.press(sendButton(screen));

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    scrollTo.mockRestore();
  });

  // Walkthrough n.º 6 and 15 (C25d): the button ends the form and scrolls
  // with it; no bar floats over the keyboard.
  it("keeps the button at the end of the form", async () => {
    const screen = await renderScreen(jest.fn());

    expect(
      within(screen.getByTestId("feedback-form")).getByRole("button", {
        name: "Enviar comentario",
      }),
    ).toBeOnTheScreen();
  });

  // Walkthrough finding 96: with the keyboard up, the counter row under the
  // field was cut in half. The field stops growing and scrolls inside, and
  // the form scrolls to the row once the keyboard is up.
  it("keeps the counter row in view above the keyboard", async () => {
    const scrollToEnd = jest
      .spyOn(ScrollView.prototype as { scrollToEnd: () => void }, "scrollToEnd")
      .mockImplementation(() => undefined);
    const screen = await renderScreen(jest.fn());

    expect(screen.getByLabelText("Comentario")).toHaveStyle({ maxHeight: 240 });
    await act(async () => {
      DeviceEventEmitter.emit("keyboardDidShow", {
        endCoordinates: { height: 300, screenX: 0, screenY: 500, width: 400 },
      });
    });
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
    scrollToEnd.mockRestore();
  });

  // Owner, 2026-11-03: the app version and device are technical; they travel
  // with the comment on their own and the screen never mentions them.
  it("never shows the app version or the device", async () => {
    const screen = await renderScreen(jest.fn());

    expect(screen.queryByText(/versión de la app|compilación|Android 14/)).toBeNull();
  });

  it("sends the type, text, and device details once, then thanks", async () => {
    const fetcher = jest.fn().mockResolvedValue(sent());
    const onBack = jest.fn();
    const screen = await renderScreen(fetcher, onBack);

    await fireEvent.press(screen.getByRole("button", { name: "Sugerencia" }));
    await fireEvent.changeText(screen.getByLabelText("Comentario"), `  ${comment} `);
    await fireEvent.press(sendButton(screen));

    await waitFor(() => {
      expect(screen.getByText("¡Gracias por tu comentario!")).toBeOnTheScreen();
    });
    // Follow-up 227: the brand is «Emma Pilates Studio»; the sent state is the v2 block.
    expect(
      screen.getByText("Lo recibió el equipo de Emma Pilates Studio y lo vamos a revisar."),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("state-screen-disc")).toBeOnTheScreen();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/feedback",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "idempotency-key": "key-1" }) as unknown,
        body: JSON.stringify({ type: "suggestion", text: comment, ...metadata }),
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Volver al perfil" }));
    expect(onBack).toHaveBeenCalled();
  });

  // Walkthrough n.º 76: the message sits above the pinned button, so the
  // keyboard never hides its second line, and the limit stops further sends.
  it("explains the daily limit above the button and stops sending", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: "feedback_limit_reached", status: 429 }, 429));
    const screen = await renderScreen(fetcher);

    await fireEvent.press(screen.getByRole("button", { name: "Otro" }));
    await fireEvent.changeText(screen.getByLabelText("Comentario"), comment);
    await fireEvent.press(sendButton(screen));

    await waitFor(() => {
      expect(
        within(screen.getByTestId("feedback-form")).getByText(
          "Ya enviaste 10 comentarios hoy. Puedes enviar otro mañana.",
        ),
      ).toBeOnTheScreen();
    });
    expect(sendButton(screen)).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("Comentario"), `${comment} Otra vez.`);
    expect(sendButton(screen)).toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps the key for a retry of the same comment and takes a new one after an edit", async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(jsonResponse({ code: "unexpected_error", status: 500 }, 500))
      .mockResolvedValueOnce(sent());
    const screen = await renderScreen(fetcher);

    await fireEvent.press(screen.getByRole("button", { name: "Problema" }));
    await fireEvent.changeText(screen.getByLabelText("Comentario"), comment);
    await fireEvent.press(sendButton(screen));
    await waitFor(() => {
      expect(
        screen.getByText("No pudimos enviar tu comentario. Inténtalo de nuevo."),
      ).toBeOnTheScreen();
    });
    await fireEvent.press(sendButton(screen));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    await fireEvent.changeText(screen.getByLabelText("Comentario"), `${comment} Otra vez.`);
    await fireEvent.press(sendButton(screen));

    await waitFor(() => {
      expect(screen.getByText("¡Gracias por tu comentario!")).toBeOnTheScreen();
    });
    const keys = fetcher.mock.calls.map(
      ([, init]: [string, { headers: Record<string, string> }]) => init.headers["idempotency-key"],
    );
    expect(keys).toEqual(["key-1", "key-1", "key-2"]);
  });

  it("refuses kindly while an Administrator sees the app as someone else", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: "impersonation_forbidden", status: 403 }, 403));
    const screen = await renderScreen(fetcher);

    await fireEvent.press(screen.getByRole("button", { name: "Problema" }));
    await fireEvent.changeText(screen.getByLabelText("Comentario"), comment);
    await fireEvent.press(sendButton(screen));

    await waitFor(() => {
      expect(
        screen.getByText("Mientras ves la app como otra persona no puedes enviar comentarios."),
      ).toBeOnTheScreen();
    });
  });
});

describe("feedback metadata", () => {
  it("reads the installed build's version and number, and the system", () => {
    expect(
      readFeedbackMetadata({
        platform: { OS: "ios", Version: "18.2", constants: {} },
        application: { nativeApplicationVersion: "1.0.1", nativeBuildVersion: "7" },
        runtimeVersion: "1.0.1",
      }),
    ).toEqual({ appVersion: "1.0.1", appBuild: "7", platform: "ios", osVersion: "18.2" });
    expect(
      readFeedbackMetadata({
        platform: { OS: "android", Version: 34, constants: { Release: "14" } },
        application: { nativeApplicationVersion: "1.0.1", nativeBuildVersion: "3" },
        runtimeVersion: null,
      }),
    ).toEqual({ appVersion: "1.0.1", appBuild: "3", platform: "android", osVersion: "14" });
  });

  it("falls back to the update's runtime version, then to «desconocida»", () => {
    expect(
      readFeedbackMetadata({
        platform: { OS: "android", Version: 34, constants: {} },
        application: null,
        runtimeVersion: "1.0.1",
      }),
    ).toEqual({
      appVersion: "1.0.1",
      appBuild: "desconocida",
      platform: "android",
      osVersion: "34",
    });
    expect(
      readFeedbackMetadata({
        platform: { OS: "ios", Version: "18.2", constants: {} },
        application: null,
        runtimeVersion: null,
      }).appVersion,
    ).toBe("desconocida");
  });
});
