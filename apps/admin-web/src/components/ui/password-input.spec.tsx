import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "./password-input";

describe("PasswordInput (follow-up 92)", () => {
  it("starts hidden and toggles the text without losing the value", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Contraseña" />);
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    await user.type(input, "Calma2026");
    const show = screen.getByRole("button", { name: "Mostrar contraseña" });
    expect(show).toHaveAttribute("type", "button");
    expect(show).toHaveAttribute("aria-pressed", "false");
    await user.click(show);

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("Calma2026");
    expect(input).toHaveFocus();
    const hide = screen.getByRole("button", { name: "Ocultar contraseña" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    await user.click(hide);
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("Calma2026");
  });

  it("keeps the cursor where it was when the type changes", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Contraseña" />);
    const input = screen.getByLabelText("Contraseña") as HTMLInputElement;
    await user.type(input, "Calma2026");
    input.setSelectionRange(5, 5);
    // Chrome moves the caret to the start when an input's type changes.
    const type = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "type",
    );
    jest.spyOn(input, "type", "set").mockImplementation((value: string) => {
      type?.set?.call(input, value);
      input.setSelectionRange(0, 0);
    });

    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );

    expect(input).toHaveAttribute("type", "text");
    expect([input.selectionStart, input.selectionEnd]).toEqual([5, 5]);
  });

  it("puts the caret back when Chrome moves it again just after the click", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Contraseña" />);
    const input = screen.getByLabelText("Contraseña") as HTMLInputElement;
    await user.type(input, "Calma2026");
    input.setSelectionRange(5, 5);

    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    input.setSelectionRange(0, 0);
    document.dispatchEvent(new Event("selectionchange"));

    expect([input.selectionStart, input.selectionEnd]).toEqual([5, 5]);
  });

  it("is reachable by keyboard and never submits its form", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn((event: { preventDefault: () => void }) =>
      event.preventDefault(),
    );
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput aria-label="Contraseña" />
      </form>,
    );

    await user.click(screen.getByLabelText("Contraseña"));
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("toggles each field on its own and disables the eye with its field", () => {
    render(
      <>
        <PasswordInput aria-label="Nueva" />
        <PasswordInput aria-label="Confirmar" disabled />
      </>,
    );
    const [first, second] = screen.getAllByRole("button", {
      name: "Mostrar contraseña",
    });
    expect(first).toBeEnabled();
    expect(second).toBeDisabled();
  });
});
