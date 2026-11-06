# Draw PDF invoice pages on the server

Status: accepted (2026-11-06); amends FIX-044's «the file is never rendered on the server» (`apps/backend/src/uploads/verify-pdf-bytes.ts`)

In the walkthrough verification (n.º 45) the owner saw that an invoice uploaded as a PDF shows only an icon and its file name in the Client app («cuando es un pdf no se ve bien»), and the Staff app sends the PDF to the admin web. She chose design follow-up 256 § 3: the first page as a thumbnail, and every page in a full-screen viewer inside the app, with Compartir and Descargar.

## Options

1. **A native PDF view in each app** (`react-native-pdf`, or a WebView). It needs a new native module, so a store build of both apps before anyone sees it, and Android's WebView does not draw PDFs at all.
2. **Draw the pages on the server as PNG images** (recommended). The apps show images they already know how to load (`loadPrivateImageWithRatio`), the change ships over the air, and the admin web keeps the browser's own PDF view.
3. **A thumbnail made at upload time and kept in storage.** It saves work per view but needs a new stored object per invoice and still needs option 2's renderer for the other pages.

## Decision

Option 2, under the blanket approval for technical decisions.

- The backend depends on Mozilla's **pdf.js** (`pdfjs-dist`, Apache-2.0, pinned) and **`@napi-rs/canvas`** (MIT, prebuilt binaries for the Debian image, no build step). `renderPdfPage(bytes, page)` draws one page 1400 px wide on white and reports the page count; pdf.js 6 never evaluates a document's scripts, and the 14 standard fonts come from the package.
- Two endpoints, beside the existing file downloads and with the same access rules: `GET /v1/clients/current/invoices/{paymentId}/file/pages/{page}` and `GET /v1/staff/payments/{paymentId}/invoice/file/pages/{page}`. They answer `image/png`, `Cache-Control: no-store`, and `X-Page-Count`; `409 invoice_not_pdf` for a photo, `404 invoice_page_not_found` past the last page, `400` for a page outside 1–100.
- Pages are drawn on each request, nothing is cached or stored: invoices are small, are viewed a few times, and only staff upload them. If drawing becomes slow, option 3's stored thumbnail is the next step.
- No migration.

## Consequences

- The API image grows by pdf.js and the canvas binary (about 30 MB).
- Unit tests cannot import pdf.js (an ES module); the renderer is tested in the e2e suite, which runs with `--experimental-vm-modules`.
