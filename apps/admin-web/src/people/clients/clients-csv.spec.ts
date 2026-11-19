import type { AdminClientExportRowDto } from "@pilates/api-contracts";
import { daniela, valeria } from "../../test/promotion-contact-fixtures";
import { clientsCsv, clientsCsvName, closedAccountsCsv } from "./clients-csv";

const isabel: AdminClientExportRowDto = {
  id: "c1000000-0000-5000-8000-000000000001",
  name: "Isabel Arce",
  subscriptionStatus: "active",
  email: "isabel@example.com",
  phone: "+591 70011003",
  clientSince: "2026-09-02",
  lastClassOn: "2026-11-19",
};

// FIX-065 (walkthrough finding 91): Clientas › «Exportar CSV», the columns
// the owner asked for: Nombre, Estado, Correo, Teléfono, Desde; FIX-091 adds
// the list's «Última clase» to the live Clients' file.
describe("the Clientas CSV", () => {
  it("writes each live Client with her row's state and the day she joined", () => {
    expect(
      clientsCsv([
        isabel,
        {
          ...isabel,
          name: "Sofía Guzmán",
          subscriptionStatus: "expired",
          phone: null,
          lastClassOn: null,
        },
        { ...isabel, name: "Mariana Peña", subscriptionStatus: "none" },
      ]),
    ).toBe(
      "﻿Nombre,Estado,Correo,Teléfono,Desde,Última clase\r\n" +
        "Isabel Arce,Activo,isabel@example.com,+591 70011003,02/09/2026,19/11/2026\r\n" +
        "Sofía Guzmán,Expirado,isabel@example.com,,02/09/2026,\r\n" +
        "Mariana Peña,Sin plan,isabel@example.com,+591 70011003,02/09/2026,19/11/2026\r\n",
    );
  });

  it("writes a closed account with the day she asked to keep hearing from the studio", () => {
    expect(closedAccountsCsv([valeria, daniela])).toBe(
      "﻿Nombre,Estado,Correo,Teléfono,Desde\r\n" +
        "Valeria Quiroga,Cuenta cerrada,valeria@example.com,+591 70011005,19/10/2026\r\n" +
        "Daniela Rojas,Cuenta cerrada,daniela@example.com,,16/10/2026\r\n",
    );
  });

  it("quotes a value with a comma, a quote, or a line break", () => {
    expect(
      clientsCsv([
        { ...isabel, name: 'Ana "Anita" Rojas, hija', phone: "a\nb" },
      ]).split("\r\n")[1],
    ).toBe(
      '"Ana ""Anita"" Rojas, hija",Activo,isabel@example.com,"a\nb",02/09/2026,19/11/2026',
    );
  });

  it("keeps a spreadsheet from running a value as a formula", () => {
    expect(
      closedAccountsCsv([{ ...valeria, name: "=HYPERLINK(1)" }]).split(
        "\r\n",
      )[1],
    ).toBe(
      "'=HYPERLINK(1),Cuenta cerrada,valeria@example.com,+591 70011005,19/10/2026",
    );
  });

  it.each([
    [undefined, "clientas-todas-2026-10-20.csv"],
    ["active", "clientas-con-plan-2026-10-20.csv"],
    ["none", "clientas-sin-plan-2026-10-20.csv"],
    ["expired", "clientas-expirado-2026-10-20.csv"],
    ["founder", "clientas-fundadora-2026-10-20.csv"],
    ["expiring", "clientas-por-vencer-2026-10-20.csv"],
    ["unbooked", "clientas-sin-reservar-2026-10-20.csv"],
    ["closed", "clientas-cuenta-cerrada-2026-10-20.csv"],
  ] as const)(
    "names the file after the chip %s and the Bolivia date",
    (filter, name) => {
      expect(clientsCsvName(filter, new Date("2026-10-21T02:00:00.000Z"))).toBe(
        name,
      );
    },
  );
});
