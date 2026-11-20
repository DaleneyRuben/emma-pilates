import { render } from "@testing-library/react-native";

import { ChannelGrid } from "../assistant/channel-grid";
import { DateTile, Pill } from "../nutritionist/availability-block-form-parts";
import { UnitTiles } from "../trainer/report-fault-pieces";
import { BranchCard } from "./branch-chips";
import { DayStrip, DayStripAction } from "./day-strip";
import { FilterChips } from "./filter-chips";
import { PersonRow } from "./person-row";

const rosaProfundo = "#93615D";
const crema = "#FFFBFB";
const noop = () => undefined;

type Element = ReturnType<Awaited<ReturnType<typeof render>>["getByText"]>;

function expectSelected(box: Element, label: Element) {
  expect(box).toHaveStyle({ backgroundColor: rosaProfundo });
  expect(label).toHaveStyle({ color: crema, fontFamily: "WorkSans_700Bold" });
}

function expectUnselected(box: Element) {
  // Rosa Emma: a chip keeps its 1.5 pt 400 outline; a day tile, the card shadow.
  expect(box).toHaveStyle({ backgroundColor: crema });
}

// A box under 44 pt reaches 44 with its hit slop.
function expectTouchTarget(box: Element) {
  const style = Object.assign({}, ...[box.props.style].flat(Infinity).filter(Boolean)) as {
    height?: number;
    minHeight?: number;
  };
  const slop = (box.props.hitSlop ?? { bottom: 0, top: 0 }) as { bottom: number; top: number };
  expect((style.height ?? style.minHeight ?? 0) + slop.top + slop.bottom).toBeGreaterThanOrEqual(
    44,
  );
}

// FIX-089 (BotonAPiezas): one way to draw a choice. The chosen one is Rosa
// profundo with a Crema 600 label; the others Crema with an Arcilla outline.
describe("Staff selected states", () => {
  it("draws the class-type filter as palette B chips with a 44 pt target", async () => {
    const screen = await render(
      <FilterChips
        onSelect={noop}
        options={[
          { id: "all", label: "Todas" },
          { id: "mat", label: "Mat" },
        ]}
        selected="all"
      />,
    );

    const all = screen.getByRole("button", { name: "Todas" });
    expectSelected(all, screen.getByText("Todas"));
    expectUnselected(screen.getByRole("button", { name: "Mat" }));
    expectTouchTarget(all);
  });

  it("draws the Branch chips the same way", async () => {
    const screen = await render(
      <BranchCard
        label="Sucursal"
        onSelect={noop}
        options={[
          { id: "a", name: "Achumani" },
          { id: "c", name: "Centro" },
        ]}
        selectedId="a"
        testIDPrefix="branch"
      />,
    );

    expectSelected(screen.getByTestId("branch-a"), screen.getByText("Achumani"));
    expectUnselected(screen.getByTestId("branch-c"));
    expectTouchTarget(screen.getByTestId("branch-c"));
    expect(screen.getByText("Sucursal")).toHaveStyle({ fontFamily: "WorkSans_700Bold" });
  });

  it("draws the chosen day and the «Otra» chip the same way", async () => {
    const screen = await render(
      <DayStrip
        dates={["2026-10-08", "2026-10-09"]}
        onSelect={noop}
        selected="2026-10-08"
        testIDPrefix="day"
        today="2026-10-08"
        trailing={
          <DayStripAction
            accessibilityLabel="Otra fecha"
            label="Otra"
            onPress={noop}
            testID="other"
          />
        }
      />,
    );

    expectSelected(screen.getByTestId("day-2026-10-08"), screen.getByText("Hoy"));
    expect(screen.getByText("8")).toHaveStyle({ color: crema });
    expectUnselected(screen.getByTestId("day-2026-10-09"));
    expectUnselected(screen.getByTestId("other"));
    // No 11 pt hint text.
    expect(screen.getByText("vie")).toHaveStyle({ fontSize: 12 });
  });

  it("draws the availability pills and date tiles the same way", async () => {
    const screen = await render(
      <>
        <Pill label="Lun" onPress={noop} selected />
        <Pill label="Mar" onPress={noop} selected={false} />
        <DateTile
          accessibilityLabel="Viernes 9"
          date="2026-10-09"
          onPress={noop}
          selected={false}
          today="2026-10-08"
        />
      </>,
    );

    expectSelected(screen.getByRole("button", { name: "Lun" }), screen.getByText("Lun"));
    expectUnselected(screen.getByRole("button", { name: "Mar" }));
    expectUnselected(screen.getByRole("button", { name: "Viernes 9" }));
    expect(screen.getByText("Mar")).toHaveStyle({ fontFamily: "WorkSans_500Medium" });
  });

  it("draws the chosen unit tile the same way", async () => {
    const unit = (id: string, number: number) => ({
      id,
      number,
      status: "in_service",
      typeName: "Reformer",
    });
    const screen = await render(
      <UnitTiles
        chosenId="u1"
        label="Reformer"
        onChoose={noop}
        // @ts-expect-error the tiles read only these fields
        units={[unit("u1", 1), unit("u2", 2)]}
      />,
    );

    expectSelected(screen.getByRole("button", { name: "Reformer 1" }), screen.getByText("N.º 1"));
    expectUnselected(screen.getByRole("button", { name: "Reformer 2" }));
  });

  it("draws the chosen acquisition channel the same way", async () => {
    const screen = await render(
      <ChannelGrid label="¿Cómo nos conoció?" onChange={noop} value="instagram" />,
    );

    expectSelected(screen.getByRole("radio", { name: "Instagram" }), screen.getByText("Instagram"));
    expectUnselected(screen.getByRole("radio", { name: "TikTok" }));
  });

  it("draws the open person row on Rosa profundo with Crema words", async () => {
    const screen = await render(
      <PersonRow detail="70011001" name="Lucía Fernández" onPress={noop} selected />,
    );

    expectSelected(
      screen.getByRole("button", { name: "Lucía Fernández" }),
      screen.getByText("Lucía Fernández"),
    );
    expect(screen.getByText("70011001")).toHaveStyle({ color: crema });
  });
});
