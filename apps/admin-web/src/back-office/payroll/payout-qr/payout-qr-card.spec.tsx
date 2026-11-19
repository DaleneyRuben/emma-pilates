import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PayoutQrCard } from "./payout-qr-card";

const imageUrl = "/api/v1/administrator/payout-qrs/qr-1/image";

// FIX-072, follow-up 276: what Administration sees of a person's payout QR
// when it approves or registers her salary.
describe("PayoutQrCard", () => {
  it("draws a valid QR whole with Ampliar, Guardar QR and its last day", async () => {
    const user = userEvent.setup();
    render(
      <PayoutQrCard
        staffName="Daniela Ortiz"
        qr={{ standing: "valid", validUntil: "2026-12-15", imageUrl }}
      />,
    );

    const image = screen.getByRole("img", {
      name: "QR de cobro de Daniela Ortiz",
    });
    expect(image).toHaveAttribute("src", `${imageUrl}?variant=readable`);
    expect(screen.getByText("Vale hasta el mar 15 dic")).toBeInTheDocument();
    expect(screen.queryByText("Vence pronto")).not.toBeInTheDocument();
    const save = screen.getByRole("link", { name: "Guardar QR" });
    expect(save).toHaveAttribute("href", `${imageUrl}?variant=readable`);
    expect(save).toHaveAttribute("download", "qr-cobro-daniela-ortiz.jpg");

    await user.click(screen.getByRole("button", { name: "Ampliar" }));
    expect(
      screen.getByRole("dialog", { name: "QR de cobro de Daniela Ortiz" }),
    ).toBeInTheDocument();
  });

  it("marks a QR within seven days of its last day", () => {
    render(
      <PayoutQrCard
        staffName="Daniela Ortiz"
        qr={{ standing: "expiring", validUntil: "2026-12-05", imageUrl }}
      />,
    );

    expect(screen.getByText("Vale hasta el sáb 5 dic")).toBeInTheDocument();
    expect(screen.getByText("Vence pronto")).toBeInTheDocument();
  });

  it("says when the person has not uploaded a QR yet", () => {
    render(<PayoutQrCard staffName="Daniela Ortiz" qr={null} />);

    expect(screen.getByText("Sin QR de cobro")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Daniela todavía no subió su QR de cobro. Pídele que lo suba en la app, en Perfil › Mi QR de cobro.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("never draws an expired QR", () => {
    render(
      <PayoutQrCard
        staffName="Daniela Ortiz"
        qr={{ standing: "expired", validUntil: "2026-12-15", imageUrl: null }}
      />,
    );

    expect(
      screen.getByText("QR vencido · pídele uno nuevo"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "El QR de Daniela venció el mar 15 dic. No lo mostramos para que no le transfieras a una cuenta que ya no sirve.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Guardar QR" }),
    ).not.toBeInTheDocument();
  });
});
