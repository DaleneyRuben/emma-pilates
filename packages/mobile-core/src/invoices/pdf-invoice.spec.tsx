import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { loadPdfPage } from "./load-pdf-page";
import { PdfInvoice } from "./pdf-invoice";

// FIX-051 (verification n.º 45, design follow-up 256 § 3, ADR-0110): a PDF
// invoice shows its first page like a photo and opens every page in a dark
// full-screen viewer; the API draws each page as a PNG.

/** A PNG header for a page 1400 × 1980 (only the IHDR size is read). */
const pngPage = () => {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, 1400);
  new DataView(bytes.buffer).setUint32(20, 1980);
  return bytes;
};

const pageFetcher = (pageCount: number) =>
  jest.fn((input: RequestInfo | URL) =>
    Promise.resolve(
      String(input).endsWith(`/pages/${pageCount + 1}`)
        ? new Response(null, { status: 404 })
        : new Response(pngPage(), {
            headers: { "Content-Type": "image/png", "X-Page-Count": String(pageCount) },
          }),
    ),
  ) as unknown as typeof globalThis.fetch;

// The viewer's own provider starts from its parent's metrics, as in the app.
const metrics = {
  frame: { height: 874, width: 402, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 62 },
};

const renderInvoice = (fetcher: typeof globalThis.fetch) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={new QueryClient()}>
        <PdfInvoice
          cacheKey={["invoice", "payment-1"]}
          fetcher={fetcher}
          footer={<Text>Descargar</Text>}
          pageUrl={(page) => `/invoices/payment-1/file/pages/${page}`}
        />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );

describe("loadPdfPage", () => {
  it("reads the page image, its proportions and the page count", async () => {
    const page = await loadPdfPage(pageFetcher(2), "/pages/1");

    expect(page.pageCount).toBe(2);
    expect(page.aspectRatio).toBeCloseTo(1400 / 1980);
    expect(page.uri.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("throws when the page cannot be drawn, so the query retries", async () => {
    await expect(loadPdfPage(pageFetcher(1), "/pages/2")).rejects.toThrow();
  });
});

describe("PdfInvoice", () => {
  it("shows the first page with how many pages there are", async () => {
    const screen = await renderInvoice(pageFetcher(2));

    expect(
      await screen.findByRole("button", { name: "Ver la factura, 2 páginas" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Ver · 2 páginas")).toBeOnTheScreen();
    expect(screen.getByLabelText("Primera página de la factura")).toBeOnTheScreen();
  });

  it("says «1 página» for a one-page invoice", async () => {
    const screen = await renderInvoice(pageFetcher(1));

    expect(await screen.findByText("Ver · 1 página")).toBeOnTheScreen();
  });

  it("opens every page in the viewer, with the footer, and closes it", async () => {
    const fetcher = pageFetcher(2);
    const screen = await renderInvoice(fetcher);

    await fireEvent.press(await screen.findByRole("button", { name: "Ver la factura, 2 páginas" }));

    expect(await screen.findByText("Factura · 1 de 2")).toBeOnTheScreen();
    await waitFor(() => {
      expect(screen.getByLabelText("Página 2 de 2")).toBeOnTheScreen();
    });
    expect(screen.getByLabelText("Página 1 de 2")).toBeOnTheScreen();
    expect(screen.getAllByText("Descargar")).toHaveLength(1);

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));

    await waitFor(() => {
      expect(screen.queryByText("Factura · 1 de 2")).toBeNull();
    });
  });
});
