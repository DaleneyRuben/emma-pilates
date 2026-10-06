import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ClassHistoryList } from "./class-history-list";

const entry = (
  bookingId: string,
  startsAt: string,
  classTypeName = "Reformer Pilates",
  trainerName = "Emma Vargas",
  branchName = "Centro",
) => ({
  bookingId,
  sessionId: `session-${bookingId}`,
  classTypeName,
  trainerName,
  branchName,
  startsAt,
  endsAt: startsAt,
});

const history = [
  entry("3", "2026-09-05T13:00:00.000Z", "Mat Pilates", "Daniela Ortiz", "Urubó"),
  entry("2", "2026-08-26T11:00:00.000Z"),
  entry("1", "2026-08-19T11:00:00.000Z"),
];

const flat = (element: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(element?.props.style) as Record<string, unknown>;

// MOB-040: the 07 and S22 frames list each attended class as a row between
// rules directly on Superficie, not as a card.
describe("ClassHistoryList", () => {
  it("opens with the lead and the count since the oldest month", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    expect(screen.getByText("Has asistido a")).toHaveStyle({ color: "#766D69", fontSize: 13 });
    expect(screen.getByText("3 clases desde agosto")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 26,
    });
  });

  it("heads each month with a Borde fuerte rule and its class count", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    const heading = screen.getByText("Agosto 2026");
    expect(heading).toHaveStyle({ fontSize: 11, textTransform: "uppercase" });
    expect(heading.parent).toHaveStyle({ borderBottomColor: "#D8C9BB", borderBottomWidth: 1 });
    expect(screen.getByText("2 clases")).toHaveStyle({ color: "#7A716D", fontSize: 12 });
    expect(screen.getByText("1 clase")).toBeOnTheScreen();
  });

  it("draws each class as a ruled row with the day column, never as a white card", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    const rows = screen.getAllByTestId("class-history-row");
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(flat(row)).not.toHaveProperty("backgroundColor");
      expect(flat(row)).not.toHaveProperty("borderRadius");
      expect(flat(row)).toMatchObject({ paddingVertical: 16, gap: 16 });
    }
    // The last row of a group has no rule under it.
    expect(flat(rows[1])).toMatchObject({ borderBottomColor: "#EFE7DE", borderBottomWidth: 1 });
    expect(flat(rows[2])).not.toHaveProperty("borderBottomWidth");

    expect(screen.getByText("05")).toHaveStyle({ fontFamily: "Lora_500Medium", fontSize: 20 });
    expect(screen.getByText("sáb")).toHaveStyle({
      color: "#7A716D",
      fontSize: 10,
      textTransform: "uppercase",
    });
    expect(screen.getByText("Mat Pilates")).toHaveStyle({
      fontFamily: "Lora_500Medium",
      fontSize: 17,
    });
    expect(screen.getByText("Daniela Ortiz · Urubó")).toHaveStyle({
      color: "#766D69",
      fontSize: 13,
    });
  });

  it("reads each row to a screen reader with its full date", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    expect(
      screen.getByLabelText("sábado 5 de septiembre, Mat Pilates, Daniela Ortiz · Urubó"),
    ).toBeOnTheScreen();
  });
});
