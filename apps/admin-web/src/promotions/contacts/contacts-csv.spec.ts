import { daniela, valeria } from "../../test/promotion-contact-fixtures";
import { contactsCsvName, promotionContactsCsv } from "./contacts-csv";

describe("the Promotion Contacts CSV", () => {
  it("writes the table's columns with Bolivia dates, for a spreadsheet", () => {
    expect(promotionContactsCsv([valeria, daniela])).toBe(
      "﻿Nombre,Correo,Teléfono,Aceptó el\r\n" +
        "Valeria Quiroga,valeria@example.com,+591 70011005,19/10/2026\r\n" +
        "Daniela Rojas,daniela@example.com,,16/10/2026\r\n",
    );
  });

  it("quotes a value with a comma, a quote, or a line break", () => {
    expect(
      promotionContactsCsv([
        { ...valeria, name: 'Ana "Anita" Rojas, hija', phone: "a\nb" },
      ]).split("\r\n")[1],
    ).toBe('"Ana ""Anita"" Rojas, hija",valeria@example.com,"a\nb",19/10/2026');
  });

  it("keeps a spreadsheet from running a value as a formula", () => {
    expect(
      promotionContactsCsv([{ ...valeria, name: "=HYPERLINK(1)" }]).split(
        "\r\n",
      )[1],
    ).toBe("'=HYPERLINK(1),valeria@example.com,+591 70011005,19/10/2026");
  });

  it("names the file after the Bolivia date of the export", () => {
    expect(contactsCsvName(new Date("2026-10-21T02:00:00.000Z"))).toBe(
      "contactos-promociones-2026-10-20.csv",
    );
  });
});
