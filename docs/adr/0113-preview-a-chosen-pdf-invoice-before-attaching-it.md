# Preview a chosen PDF invoice before attaching it

Status: accepted (2026-11-26); extends [ADR-0110](./0110-draw-pdf-invoice-pages-on-the-server.md), which named two page endpoints, with a third for an invoice that is uploaded but not yet attached

In the owner's walkthrough (n.º 24) board E-D29 asks the Staff app to show a chosen PDF invoice page by page, full screen, before «Subir factura» attaches it to the payment. ADR-0110 draws pages only for an invoice already attached, through the payment, so a file that is only chosen had no pages to show.

## Options

1. **A native PDF view in the Staff app.** Rejected for the same reasons as in ADR-0110: a new native module and a store build, and Android's WebView does not draw PDFs.
2. **Upload the chosen PDF at once and draw its pages from the uploaded file** (chosen). The upload already happens before the attach (`uploadImage(…, "invoice")` returns an image asset that `attach` takes); doing it on pick lets the same renderer draw the asset's pages.
3. **Attach first and preview afterwards.** It contradicts the board, which previews before sending, and an attach marks the payment as invoiced for the Client at once.

## Decision

Option 2, under the owner's blanket approval for backlog decisions.

- A third endpoint beside ADR-0110's two: `GET /v1/staff/invoice-uploads/{imageAssetId}/pages/{page}`. It reuses `renderPdfPage` and the in-memory page cache, and answers exactly as the other two (`image/png`, `Cache-Control: no-store`, `X-Page-Count`, `409 invoice_not_pdf`, `404 invoice_page_not_found`, `422 invoice_page_unreadable`, `400` for a page outside 1–100).
- Access: the Roles that attach invoices (Administrator, Coordinator, Assistant), and only for an asset the caller uploaded herself, with the invoice purpose, ready and not attached nor deleted. Anything else answers `404 invoice_not_found`, so another person's upload is indistinguishable from a missing one.
- The Staff app uploads a chosen PDF on pick, shows its progress, and «Subir factura» waits for that upload and attaches the same asset; a photo keeps its local preview and uploads on «Subir factura».
- A chosen PDF that is never attached is swept like any unattached upload after three days (ADR-0089). Nothing new is stored; no migration.

## Consequences

- A PDF is uploaded even when the Staff Member then changes her mind; the sweep removes it.
- The ADR-0110 renderer now also serves files that no Client can see yet, still only to the uploader.
