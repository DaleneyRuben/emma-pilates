// FIX-049: expo-document-picker is native and only in builds made after
// FIX-049, so the PDF picker loads on demand, apart from the photo picker:
// an older build still uploads photos and is asked to update for a PDF.
// Jest mocks this seam, as it cannot run a dynamic import.
export const loadDocumentUpload = () => import("./document-upload");
