import { boliviaInstant } from "../lib/bolivia-time";
import { mondayReformer, dayOfNextWeek } from "../test/schedule-fixtures";
import { dayItems } from "./week-slots";

// FIX-042 review: a replacement class created over a cancelled one must be
// the block on top, so a click opens the live class.
describe("dayItems with a cancelled class", () => {
  it("puts a live class after a cancelled one at the same start", () => {
    const day = dayOfNextWeek(0);
    const cancelled = {
      ...mondayReformer,
      id: "ffffffff-0000-5000-8000-000000000001",
      cancellation: {
        cause: "studio" as const,
        cancelledAt: boliviaInstant(day, "06:00"),
        bookedCount: 0,
      },
    };
    const live = {
      ...mondayReformer,
      id: "00000000-0000-5000-8000-000000000002",
    };

    const items = dayItems(day, [7], [live, cancelled]).filter(
      (item) => item.kind === "session",
    );

    expect(items.map((item) => item.session.id)).toEqual([
      cancelled.id,
      live.id,
    ]);
  });
});
