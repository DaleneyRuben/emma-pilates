import { render, fireEvent } from "@testing-library/react-native";

import { EvaluationSlotPicker } from "./evaluation-slot-picker";
import { dayName, firstDay, secondDay, slot } from "./evaluation-test-support";

const paid = slot("slot-1", firstDay, "09:00", { included: false, priceCentavos: 7_000 });
const free = slot("slot-2", secondDay, "10:00", { included: true, priceCentavos: 0 });

// Walkthrough finding 100: with free and paid slots on screen, each slot says
// which it is, so a Bs 70 one is never a surprise on «Confirma tu cita».
describe("EvaluationSlotPicker prices", () => {
  it("marks each slot «Gratis» or its price when both kinds are open", async () => {
    const screen = await render(
      <EvaluationSlotPicker
        days={[
          { date: firstDay, slots: [paid] },
          { date: secondDay, slots: [free] },
        ]}
        onPick={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Turno 09:00 · Bs 70" })).toBeOnTheScreen();
    expect(screen.getByText("Bs 70")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: dayName(secondDay) }));
    expect(screen.getByRole("button", { name: "Turno 10:00 · Gratis" })).toBeOnTheScreen();
    expect(screen.getByText("Gratis")).toBeOnTheScreen();
  });

  it("adds nothing when every open slot costs the same", async () => {
    const screen = await render(
      <EvaluationSlotPicker days={[{ date: firstDay, slots: [paid] }]} onPick={jest.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Turno 09:00" })).toBeOnTheScreen();
    expect(screen.queryByText("Bs 70")).toBeNull();
  });
});
