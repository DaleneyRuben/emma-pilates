import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import { CivilDateInput } from "./civil-date-input";
import { CivilTimeInput } from "./civil-time-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";

const sessionSchema = z.object({
  date: z.string(),
  time: z.string(),
});

type SessionValues = z.infer<typeof sessionSchema>;

function SessionFields({
  onSubmit,
  defaultValues = { date: "", time: "" },
}: {
  onSubmit: (values: SessionValues) => void;
  defaultValues?: SessionValues;
}) {
  const form = useForm<SessionValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <CivilDateInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hora</FormLabel>
              <FormControl>
                <CivilTimeInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  );
}

describe("civil date and time fields", () => {
  it("shows a typed date as dd/mm/aaaa and submits yyyy-mm-dd", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<SessionFields onSubmit={onSubmit} />);

    const date = screen.getByRole("textbox", { name: "Fecha" });
    expect(date).toHaveAttribute("type", "text");
    expect(date).toHaveAttribute("inputmode", "numeric");
    expect(date).toHaveAttribute("placeholder", "dd/mm/aaaa");
    await user.type(date, "21102026");

    expect(date).toHaveValue("21/10/2026");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onSubmit).toHaveBeenCalledWith(
      { date: "2026-10-21", time: "" },
      expect.anything(),
    );
  });

  it("keeps an impossible date in the field and does not submit it", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<SessionFields onSubmit={onSubmit} />);

    const date = screen.getByRole("textbox", { name: "Fecha" });
    await user.type(date, "32132026");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(date).toHaveValue("32/13/2026");
    expect(date).toHaveAccessibleDescription("Elige una fecha válida.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("leaves an empty date empty and shows a stored date as dd/mm/aaaa", () => {
    render(
      <SessionFields
        onSubmit={jest.fn()}
        defaultValues={{ date: "2026-10-21", time: "" }}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Fecha" })).toHaveValue(
      "21/10/2026",
    );
  });

  it("shows a typed time as 24-hour HH:mm and submits that value", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<SessionFields onSubmit={onSubmit} />);

    const time = screen.getByRole("textbox", { name: "Hora" });
    expect(time).toHaveAttribute("type", "text");
    expect(time).not.toHaveAttribute("type", "time");
    expect(time).toHaveAttribute("placeholder", "hh:mm");
    await user.type(time, "0900");

    expect(time).toHaveValue("09:00");
    expect(time).not.toHaveValue(expect.stringMatching(/AM|PM/));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onSubmit).toHaveBeenCalledWith(
      { date: "", time: "09:00" },
      expect.anything(),
    );
  });

  it("keeps an impossible time in the field and does not submit it", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<SessionFields onSubmit={onSubmit} />);

    const time = screen.getByRole("textbox", { name: "Hora" });
    await user.type(time, "2460");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(time).toHaveValue("24:60");
    expect(time).toHaveAccessibleDescription("Elige una hora válida.");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
