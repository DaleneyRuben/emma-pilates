import { within } from "@testing-library/react";
import type { renderAdmin } from "./render-admin";
import { imageFile } from "./image-stubs";
import { uploadHandlers, type UploadSeen } from "./upload-fixtures";

// Finding 112: a Salary Payment saves or approves only with the transfer's
// photo, so specs about anything else attach one first.
export const salaryReceiptHandlers = () => {
  const seen: UploadSeen = { polls: 0 };
  return uploadHandlers(seen);
};

export const attachSalaryReceipt = async (
  user: ReturnType<typeof renderAdmin>["user"],
  scope: HTMLElement,
) => {
  await user.upload(
    within(scope).getByLabelText("Archivo del comprobante"),
    imageFile("transferencia.png"),
  );
  await within(scope).findByText("Comprobante adjunto");
};
