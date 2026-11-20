import { render } from "@testing-library/react-native";
import { Text as NativeText, TextInput, View } from "react-native";

import { Text } from "./text";
import { fieldTextProps } from "./field-text";
import { offScaleTexts } from "./type-scale-audit";

async function audit(element: React.ReactElement) {
  const screen = await render(element);
  const rendered = screen.toJSON();
  // The off-scale samples must not reach the setup's own audit.
  await screen.unmount();
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

  it("checks a field's value and its italic example text", async () => {
    expect(
      await audit(
        <>
          <TextInput {...fieldTextProps("")} placeholder="Nombre" />
          <TextInput {...fieldTextProps("Lucía")} />
          <TextInput placeholder="Buscar" style={{ fontSize: 18 }} />
        </>,
      ),
    ).toEqual(["field «Buscar» is off the scale (– 18)"]);
  });
});
