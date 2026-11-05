// The picker and image modules are native: importing them from the
// navigation graph crashes every Staff role at startup (PAY-006), so Perfil
// loads them only when she changes her photo. Jest mocks this seam, as it
// cannot run a dynamic import.
export const loadImageUpload = () => import("./image-upload");
