import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SearchFilter } from "./search-filter";

// The router commits a search change a moment after it is asked to, so the
// address lags behind the field by a render or two.
function LaggingSearch({ onSent }: { onSent: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <SearchFilter
      label="Buscar por cliente"
      value={value}
      onChange={(next) => {
        onSent(next);
        setTimeout(() => setValue(next), 150);
      }}
    />
  );
}

describe("SearchFilter", () => {
  it("keeps what was typed between the debounce firing and the address committing", async () => {
    const sent: string[] = [];
    const user = userEvent.setup();
    render(<LaggingSearch onSent={(value) => sent.push(value)} />);
    const field = screen.getByRole("searchbox", { name: "Buscar por cliente" });

    await user.type(field, "luc");
    await waitFor(() => expect(sent).toContain("luc"));
    // Typed after the debounce sent "luc" and before the address holds it.
    await user.type(field, "ia");

    await waitFor(() => expect(sent).toContain("lucia"), { timeout: 2_000 });
    expect(field).toHaveValue("lucia");
  });

  it("shows an address changed from elsewhere, such as the back button", async () => {
    function ElsewhereSearch() {
      const [value, setValue] = useState("lucia");
      return (
        <>
          <SearchFilter
            label="Buscar por cliente"
            value={value}
            onChange={setValue}
          />
          <button type="button" onClick={() => setValue("")}>
            Atrás
          </button>
        </>
      );
    }
    const user = userEvent.setup();
    render(<ElsewhereSearch />);

    await user.click(screen.getByRole("button", { name: "Atrás" }));

    expect(
      screen.getByRole("searchbox", { name: "Buscar por cliente" }),
    ).toHaveValue("");
  });
});
