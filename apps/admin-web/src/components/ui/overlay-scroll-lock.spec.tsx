import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceiptViewer } from "../../payments/receipt-viewer";
import { SidePanel } from "../panel/side-panel";
import { scrollLockClass } from "./body-scroll-lock";
import { ConfirmDialog } from "./confirm-dialog";

// WEB-037: every overlay locks the page behind it through the body class and
// none of them injects a <style> element (Radix's scroll lock did, and the
// Content-Security-Policy of WEB-030 refused it).
describe("the overlays and the body scroll lock", () => {
  const noop = () => undefined;

  it("locks the page while a side panel is open", () => {
    const { rerender } = render(
      <SidePanel open onOpenChange={noop} title="Nueva sucursal">
        <p>Formulario</p>
      </SidePanel>,
    );
    expect(document.body).toHaveClass(scrollLockClass);
    expect(document.querySelectorAll("style")).toHaveLength(0);

    rerender(
      <SidePanel open={false} onOpenChange={noop} title="Nueva sucursal">
        <p>Formulario</p>
      </SidePanel>,
    );
    expect(document.body).not.toHaveClass(scrollLockClass);
  });

  it("keeps the page locked while a confirmation sits over a side panel", () => {
    const Panel = ({ confirming }: { confirming: boolean }) => (
      <SidePanel open onOpenChange={noop} title="Revisar pago">
        <ConfirmDialog
          open={confirming}
          onOpenChange={noop}
          title="¿Confirmar el pago?"
          confirmLabel="Confirmar pago"
          onConfirm={noop}
        >
          <p>Es definitivo.</p>
        </ConfirmDialog>
      </SidePanel>
    );
    const { rerender, unmount } = render(<Panel confirming />);
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(document.body).toHaveClass(scrollLockClass);
    expect(document.querySelectorAll("style")).toHaveLength(0);

    rerender(<Panel confirming={false} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.body).toHaveClass(scrollLockClass);

    unmount();
    expect(document.body).not.toHaveClass(scrollLockClass);
  });

  it("keeps the page locked while the enlarged receipt sits over the panel", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <SidePanel open onOpenChange={noop} title="Revisar pago">
        <ReceiptViewer
          receiptUrl="/api/v1/payments/p1/receipt"
          mediaType="image/png"
          clientName="Mariana Peña"
          onRetry={() => Promise.resolve()}
        />
      </SidePanel>,
    );
    await user.click(screen.getByRole("button", { name: "Ver en grande" }));
    const enlarged = screen.getByRole("dialog", {
      name: "Comprobante ampliado",
    });
    expect(document.body).toHaveClass(scrollLockClass);
    expect(document.querySelectorAll("style")).toHaveLength(0);

    await user.click(within(enlarged).getByRole("button", { name: "Cerrar" }));
    expect(
      screen.queryByRole("dialog", { name: "Comprobante ampliado" }),
    ).toBeNull();
    expect(document.body).toHaveClass(scrollLockClass);

    unmount();
    expect(document.body).not.toHaveClass(scrollLockClass);
  });
});
