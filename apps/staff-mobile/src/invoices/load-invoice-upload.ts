// The invoice photo modules are native: importing them from the navigation
// graph crashes every Staff role at startup (load-receipt-upload.ts), so E5
// loads them only when the photo is taken. Jest mocks this seam.
export const loadInvoiceUpload = () => import("./invoice-photo-upload");
