import { render } from "@testing-library/react-native";
import { Text as NativeText, TextInput, View } from "react-native";

import { Text } from "./text";
import { fieldTextProps } from "./field-text";
import { offScaleTexts } from "./type-scale-audit";

async function audit(element: React.ReactElement) {
  const screen = await render(element);
  const rendered = screen.toJSON();
  // The off-scale samples must not reach the setup's own audit, which checks
  // a tree as it unmounts: swap them for an empty view first.
  await screen.rerender(<View />);
  return offScaleTexts(rendered);
}

describe("offScaleTexts", () => {
  it("passes every variant in both tones on white, 50 and 600", async () => {
    expect(
      await audit(
        <View style={{ backgroundColor: "#FFFBFB" }}>
          <Text variant="titulo-pagina">Mis reservas</Text>
          <Text variant="etiqueta">Próxima clase</Text>
          <Text strike variant="secundario">
            Bs 450
          </Text>
          <Text variant="cuerpo">
            Lee los <Text variant="enlace-cuerpo">términos</Text>.
          </Text>
          <View style={{ backgroundColor: "#93615D" }}>
            <Text tone="onDark" variant="boton">
              Reservar
            </Text>
          </View>
        </View>,
      ),
    ).toEqual([]);
  });

  it("reports a size, face or spacing outside the scale", async () => {
    expect(
      await audit(
        <>
          <NativeText style={{ fontFamily: "WorkSans_400Regular", fontSize: 17 }}>
            Diecisiete
          </NativeText>
          <NativeText
            style={{
              color: "#93615D",
              fontFamily: "Lora_400Regular",
              fontSize: 24,
              lineHeight: 29,
            }}
          >
            No pudimos cargar tus reservas.
          </NativeText>
        </>,
      ),
    ).toEqual([
      "«Diecisiete» is off the scale (WorkSans_400Regular 17/–)",
      "«No pudimos cargar tus reservas.» is off the scale (Lora_400Regular 24/29)",
    ]);
  });

  it("reports a colour other than ink or white, and a missing text-size cap", async () => {
    const off = await audit(
      <NativeText
        style={{
          color: "#CDA697",
          fontFamily: "WorkSans_400Regular",
          fontSize: 15,
          lineHeight: 23,
        }}
      >
        09:30
      </NativeText>,
    );

    expect(off).toEqual([
      "«09:30» has colour #CDA697",
      "«09:30» grows past 1.3 times with the phone's text size",
    ]);
  });

  it("reports text dimmed by an ancestor's opacity", async () => {
    expect(
      await audit(
        <View style={{ opacity: 0.5 }}>
          <Text variant="titulo-fila">Reenviar invitación</Text>
        </View>,
      ),
    ).toEqual(["«Reenviar invitación» is transparent (0.5)"]);
  });

  it("reports small text on 100, 200 or 500 but lets titles, figures and destacado stand there", async () => {
    expect(
      await audit(
        <View style={{ backgroundColor: "#F9E7DF" }}>
          <Text variant="titulo-seccion">Fecha de inicio</Text>
          <Text variant="secundario">Tu plan actual vence el 3 de diciembre.</Text>
          <View style={{ backgroundColor: "#B78380" }}>
            <Text tone="onDark" variant="destacado">
              restantes
            </Text>
            <Text tone="onDark" variant="pastilla">
              Mi plan
            </Text>
          </View>
        </View>,
      ),
    ).toEqual([
      "«Tu plan actual vence el 3 de diciembre.» is small text (secundario) on #F9E7DF",
      "«Mi plan» is small text (pastilla) on #B78380",
    ]);
  });

  it("reports white text off 600 or 500 and ink text on them", async () => {
    expect(
      await audit(
        <>
          <View style={{ backgroundColor: "#FFFBFB" }}>
            <Text tone="onDark" variant="titulo-fila">
              Todas
            </Text>
          </View>
          <View style={{ backgroundColor: "#93615D" }}>
            <Text variant="boton">Reservar</Text>
            <Text tone="onDark" variant="pastilla">
              Hoy
            </Text>
          </View>
          <View style={{ backgroundColor: "#B78380" }}>
            <Text tone="onDark" variant="cifra-grande">
              5
            </Text>
          </View>
        </>,
      ),
    ).toEqual(["«Todas» is white on #FFFBFB", "«Reservar» is ink on #93615D"]);
  });

  // Follow-up 292: Destructivo is for white cards only (5.93:1 there).
  it("reports Destructivo text on 600 or 500 but lets it stand on white", async () => {
    expect(
      await audit(
        <>
          <View style={{ backgroundColor: "#FFFBFB" }}>
            <Text tone="destructivo" variant="boton">
              Cerrar sesión
            </Text>
          </View>
          <View style={{ backgroundColor: "#93615D" }}>
            <Text tone="destructivo" variant="boton">
              Salir
            </Text>
          </View>
        </>,
      ),
    ).toEqual(["«Salir» is destructivo on #93615D"]);
  });

  it("lets only initials stop growing with the phone's text size", async () => {
    expect(
      await audit(
        <>
          <Text allowFontScaling={false} variant="pastilla">
            LF
          </Text>
          <Text allowFontScaling={false} variant="cuerpo">
            Tu clase
          </Text>
        </>,
      ),
    ).toEqual(["«Tu clase» does not grow with the phone's text size"]);
  });

  it("reports an italic field that already holds text", async () => {
    expect(
      await audit(
        <TextInput
          {...fieldTextProps("")}
          accessibilityLabel="Nombre"
          defaultValue=""
          value="Lucía"
        />,
      ),
    ).toEqual(["field «Nombre» is italic with text in it"]);
  });

  it("checks a field's value and its italic example text", async () => {
    expect(
      await audit(
        <>
          <TextInput {...fieldTextProps("")} placeholder="Nombre" />
          <TextInput {...fieldTextProps("Lucía")} />
          <TextInput {...fieldTextProps("510", "cifra-grande")} accessibilityLabel="Contado" />
          <TextInput placeholder="Buscar" style={{ fontSize: 18 }} />
        </>,
      ),
    ).toEqual(["field «Buscar» is off the scale (– 18)"]);
  });
});
