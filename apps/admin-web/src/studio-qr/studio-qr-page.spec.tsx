import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { imageFile } from "../test/image-stubs";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { signedInHandlers } from "../test/session-handlers";

const statusPath = "/api/v1/administrator/transfer-qr";
const imagePath = "/api/v1/transfer-instructions/qr";

type Upload = { contentType: string | null; byteSize: number };

let updatedAt: string | null;
let imageReads: number;
let uploads: Upload[];

const qrHandlers = (
  answer: () => Response = () => {
    updatedAt = "2026-11-04T14:00:00.000Z";
    return jsonResponse({ updatedAt });
  },
) => [
  http.get(apiUrl(statusPath), () => jsonResponse({ updatedAt })),
  http.get(apiUrl(imagePath), () => {
    imageReads += 1;
    return new HttpResponse(new Uint8Array([137, 80, 78, 71]), {
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  }),
  http.put(apiUrl(statusPath), async ({ request }) => {
    uploads.push({
      contentType: request.headers.get("content-type"),
      byteSize: (await request.arrayBuffer()).byteLength,
    });
    return answer();
  }),
];

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "QR del estudio" });
const fileInput = () => screen.getByLabelText("Subir un QR nuevo");

describe("Ajustes › QR del estudio", () => {
  useMockServer();
  beforeEach(() => {
    updatedAt = "2026-10-15T13:00:00.000Z";
    imageReads = 0;
    uploads = [];
    server.use(...signedInHandlers());
  });

  it("opens from the global search, as an Ajustes tab", async () => {
    server.use(...qrHandlers());
    const { user } = renderAdmin("/");

    await user.type(
      await screen.findByRole("combobox", { name: "Buscar en todo" }),
      "qr",
    );
    await user.click(
      screen.getByRole("option", { name: "Ajustes · QR del estudio" }),
    );

    await heading();
    expect(document.title).toBe("Ajustes · QR del estudio · Emma");
  });

  it("shows the QR the clients see and when it was uploaded", async () => {
    server.use(...qrHandlers());
    renderAdmin("/ajustes/qr-del-estudio");
    await heading();

    const image = await screen.findByRole("img", {
      name: "QR de transferencia del estudio",
    });
    expect(image.getAttribute("src")).toBe("data:image/png;base64,iVBORw==");
    expect(
      await screen.findByText("Actualizado el 15/10/2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Es el QR que ven las clientas al pagar desde la app. Al subir uno nuevo, la app lo usa al instante.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the server's test QR is still in use", async () => {
    updatedAt = null;
    server.use(...qrHandlers());
    renderAdmin("/ajustes/qr-del-estudio");

    expect(
      await screen.findByText("Es el QR de prueba del servidor"),
    ).toBeInTheDocument();
  });

  it("uploads a new QR, confirms it and shows it again", async () => {
    server.use(...qrHandlers());
    const { user } = renderAdmin("/ajustes/qr-del-estudio");
    await screen.findByText("Actualizado el 15/10/2026");
    await waitFor(() => expect(imageReads).toBe(1));

    await user.upload(fileInput(), imageFile("qr-banco.png"));

    expect(
      await screen.findByText("Subimos el QR nuevo. La app ya lo muestra."),
    ).toBeInTheDocument();
    expect(uploads).toEqual([{ contentType: "image/png", byteSize: 8 }]);
    expect(
      await screen.findByText("Actualizado el 04/11/2026"),
    ).toBeInTheDocument();
    await waitFor(() => expect(imageReads).toBe(2));
  });

  it("explains a file that is not a usable image", async () => {
    server.use(
      ...qrHandlers(() => problemResponse(400, "transfer_qr_invalid_image")),
    );
    const { user } = renderAdmin("/ajustes/qr-del-estudio");
    await screen.findByText("Actualizado el 15/10/2026");

    await user.upload(fileInput(), imageFile("qr.png"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese archivo no es una imagen que podamos usar. Elige un JPG, PNG o WEBP.",
    );
    expect(screen.getByText("Actualizado el 15/10/2026")).toBeInTheDocument();
  });

  it.each([
    ["the API refuses its size", 413],
    ["the API refuses its dimensions", 400],
  ])("explains an image too large when %s", async (_name, status) => {
    server.use(
      ...qrHandlers(() => problemResponse(status, "transfer_qr_too_large")),
    );
    const { user } = renderAdmin("/ajustes/qr-del-estudio");
    await screen.findByText("Actualizado el 15/10/2026");

    await user.upload(fileInput(), imageFile("qr.png"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La imagen es muy grande. Elige una de hasta 5 MB y 4096 píxeles por lado.",
    );
  });

  it("refuses more than 5 MB before uploading", async () => {
    server.use(...qrHandlers());
    const { user } = renderAdmin("/ajustes/qr-del-estudio");
    await screen.findByText("Actualizado el 15/10/2026");

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "qr.png", {
      type: "image/png",
    });
    await user.upload(fileInput(), big);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La imagen es muy grande. Elige una de hasta 5 MB y 4096 píxeles por lado.",
    );
    expect(uploads).toEqual([]);
  });

  it("accepts only JPEG, PNG and WebP files", async () => {
    server.use(...qrHandlers());
    renderAdmin("/ajustes/qr-del-estudio");
    await heading();

    expect(fileInput()).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
  });
});
