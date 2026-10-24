import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { FeedbackScreen } from "./feedback-screen";
import { describeFeedbackDevice, readFeedbackMetadata } from "./feedback-metadata";

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
  it("waits for a type and at least 10 characters, counting up to 2,000", async () => {
    const screen = await renderScreen(jest.fn());

    expect(screen.getByText("Enviar comentarios")).toBeOnTheScreen();
    expect(sendButton(screen)).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Comentario"), "  Muy mal  ");
    await fireEvent.press(screen.getByRole("button", { name: "Problema" }));
    expect(screen.getByText("11 / 2000")).toBeOnTheScreen();
    expect(sendButton(screen)).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("Comentario"), comment);
    expect(screen.getByRole("button", { name: "Problema" })).toBeSelected();
    expect(sendButton(screen)).toBeEnabled();
  });

  it("says what is attached and that no screenshot is sent", async () => {
    const screen = await renderScreen(jest.fn());

    expect(
      screen.getByText(
        "Junto con tu comentario enviamos la versión de la app (1.0.1, compilación 3), el sistema (Android 14) y tu rol. No enviamos capturas de pantalla.",
      ),
    ).toBeOnTheScreen();
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

  it("explains the daily limit", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(jsonResponse({ code: "feedback_limit_reached", status: 429 }, 429));
    const screen = await renderScreen(fetcher);

    await fireEvent.press(screen.getByRole("button", { name: "Otro" }));
    await fireEvent.changeText(screen.getByLabelText("Comentario"), comment);
    await fireEvent.press(sendButton(screen));

    await waitFor(() => {
      expect(
        screen.getByText("Ya enviaste 10 comentarios hoy. Puedes enviar otro mañana."),
      ).toBeOnTheScreen();
    });
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

  it("describes the device for the note under the form", () => {
    expect(describeFeedbackDevice(metadata)).toBe(
      "la versión de la app (1.0.1, compilación 3), el sistema (Android 14)",
    );
    expect(describeFeedbackDevice({ ...metadata, platform: "ios", osVersion: "18.2" })).toBe(
      "la versión de la app (1.0.1, compilación 3), el sistema (iOS 18.2)",
    );
  });
});
