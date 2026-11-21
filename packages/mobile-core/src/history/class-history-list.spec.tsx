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
  trainerPhoto: null,
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

// Rosa Emma (C05d): the summary is the 600 hero and each month a white card
// with its header strip and the classes divided by hairlines.
describe("ClassHistoryList", () => {
  it("opens with the lead and the count since the oldest month on the hero", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    expect(screen.getByText("Has asistido a")).toHaveStyle({ color: "#FFFBFB", fontSize: 15 });
    expect(screen.getByText("3 clases desde agosto")).toHaveStyle({
      color: "#FFFBFB",
      fontFamily: "Lora_500Medium",
      fontSize: 22,
    });
    expect(screen.getByTestId("class-history-summary")).toHaveStyle({
      backgroundColor: "#93615D",
      borderRadius: 24,
    });
  });

  it("heads each month's white card with a 50 strip and its class count", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    const heading = screen.getByText("Agosto 2026");
    expect(heading).toHaveStyle({
      fontFamily: "WorkSans_700Bold",
      fontSize: 12,
      textTransform: "uppercase",
    });
    expect(heading.parent).toHaveStyle({ backgroundColor: "#FEF6F2" });
    expect(heading.parent?.parent).toHaveStyle({ backgroundColor: "#FFFBFB", borderRadius: 20 });
    expect(screen.getByText("2 clases")).toHaveStyle({
      color: "#93615D",
      fontFamily: "WorkSans_700Bold",
    });
    expect(screen.getByText("1 clase")).toBeOnTheScreen();
  });

  it("draws each class as a row with the day column, divided by hairlines", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    const rows = screen.getAllByTestId("class-history-row");
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(flat(row)).not.toHaveProperty("backgroundColor");
      expect(flat(row)).toMatchObject({ paddingVertical: 14, gap: 16 });
    }
    // The last row of a group has no rule under it.
    expect(flat(rows[1])).toMatchObject({ borderBottomColor: "#F9E7DF", borderBottomWidth: 1 });
    expect(flat(rows[2])).not.toHaveProperty("borderBottomWidth");

    expect(screen.getByText("05")).toHaveStyle({ fontFamily: "Lora_500Medium", fontSize: 24 });
    // Board C05d: the weekday under the day is a spaced capital label («SÁB»).
    expect(screen.getByText("sáb")).toHaveStyle({
      color: "#93615D",
      fontFamily: "WorkSans_700Bold",
      fontSize: 12,
      textTransform: "uppercase",
    });
    expect(screen.getByText("Mat Pilates")).toHaveStyle({
      fontFamily: "WorkSans_600SemiBold",
      fontSize: 16,
    });
    expect(screen.getByText("Daniela Ortiz · Urubó")).toHaveStyle({
      color: "#93615D",
      fontSize: 13,
    });
  });

  it("reads each row to a screen reader with its full date", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    expect(
      screen.getByLabelText("Sábado 5 de septiembre, Mat Pilates, Daniela Ortiz · Urubó"),
    ).toBeOnTheScreen();
  });

  // The owner's pick C: the row names the Trainer without a face.
  it("names each Trainer without a face", async () => {
    const screen = await render(<ClassHistoryList entries={history} lead="Has asistido a" />);

    expect(screen.getByText("Daniela Ortiz · Urubó")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Foto de Daniela Ortiz")).toBeNull();
  });
});
