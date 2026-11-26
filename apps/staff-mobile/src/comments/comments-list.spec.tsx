import type { AdminFeedbackDto } from "@pilates/api-contracts";
import { render, within } from "@testing-library/react-native";

import { CommentsList, FilterButton } from "./comments-list";

const comment = (id: string, senderName: string): AdminFeedbackDto =>
  ({
    app: "client",
    createdAt: "2026-11-26T15:20:00.000Z",
    id,
    senderName,
    text: "No encuentro dónde ver mi lista de espera desde Inicio.",
    type: "problem",
  }) as AdminFeedbackDto;

const now = new Date("2026-11-26T18:00:00.000Z");
const noop = () => undefined;

// E-F18, E-F25, E-F26: the comments are rows of one white card split by
// hairlines, each with two initials, two lines of text and a chevron.
describe("E-F18 comments list", () => {
  it("draws the comments as rows of one card split by hairlines", async () => {
    const screen = await render(
      <CommentsList
        comments={[comment("1", "Ana Pérez"), comment("2", "Daniela Ortiz")]}
        now={now}
        onOpen={noop}
      />,
    );

    const card = screen.getByTestId("comments-card");
    expect(within(card).getAllByRole("button")).toHaveLength(2);
    expect(within(card).getAllByTestId("comments-hairline")).toHaveLength(1);
  });

  it("shows two initials, the text cut at two lines and a chevron on each row", async () => {
    const screen = await render(
      <CommentsList comments={[comment("1", "Lucía Fernández")]} now={now} onOpen={noop} />,
    );

    const row = within(screen.getByRole("button", { name: /^Lucía Fernández/ }));
    expect(row.getByText("LF")).toBeOnTheScreen();
    expect(row.getByText(/lista de espera/)).toHaveProp("numberOfLines", 2);
    expect(row.getByTestId("chevron", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("puts a tag before «Filtrar»", async () => {
    const screen = await render(<FilterButton count={0} onPress={noop} />);

    const button = within(screen.getByRole("button", { name: "Filtrar" }));
    expect(button.getByTestId("glyph-tag", { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
