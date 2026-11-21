import { ClientFace, spacing, surfaces, Text } from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";

// The persistent reminder of whose behalf the Assistant is acting on (v2 S07,
// S08, S09, S10): her face (finding n.º 30) and «Reservando para **Lucía**» on Lino.
export function ClientBanner({
  action,
  clientName,
  clientPhoto,
  detail,
}: {
  action:
    | "Para"
    | "Reservando para"
    | "Registrando pago para"
    | "Viendo reservas de"
    | "Viendo historial de";
  clientName: string;
  clientPhoto: { imageAssetId: string } | null;
  /** A quiet tail such as «8 clases en su plan». */
  detail?: string;
}) {
  const fetcher = useStaffFetcher();
  return (
    <View style={styles.banner} testID="client-banner">
      <ClientFace fetcher={fetcher} name={clientName} photo={clientPhoto} size={32} />
      <Text style={styles.text} variant="cuerpo">
        {`${action} `}
        <Text variant="titulo-fila">{clientName}</Text>
        {detail === undefined ? null : ` · ${detail}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smLg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.smLg,
  },
  text: { flex: 1 },
});
