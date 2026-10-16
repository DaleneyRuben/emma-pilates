import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button busy state (follow-up 93)", () => {
  it("keeps its label for screen readers, says it is busy, and stays enabled", () => {
    render(<Button busy>Iniciar sesión</Button>);

    const button = screen.getByRole("button", { name: "Iniciar sesión" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).not.toBeDisabled();
    expect(button.querySelector("[data-slot=spinner]")).toBeInTheDocument();
    expect(screen.getByText("Iniciar sesión")).toHaveClass("invisible");
  });

  it("ignores clicks and never submits its form twice", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn((event: SubmitEvent) => event.preventDefault());
    const onClick = jest.fn();
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <input aria-label="Correo" />
        <Button type="submit" busy onClick={onClick}>
          Guardar
        </Button>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await user.type(screen.getByLabelText("Correo"), "a{Enter}");

    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows no spinner and works normally when not busy", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button.querySelector("[data-slot=spinner]")).toBeNull();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
