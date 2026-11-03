// The receipt modules are native: importing them from the navigation graph
// crashes every Staff role at startup, so S10 loads them only when the
// Assistant photographs a receipt (PAY-006). Jest mocks this seam, as it
// cannot run a dynamic import.
export const loadReceiptUpload = () => import("./front-desk-receipt-upload");
