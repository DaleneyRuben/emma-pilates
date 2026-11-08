import { useListDecidedFreezes, useListRequestedFreezes } from "@pilates/api-contracts";
import {
  colors,
  fontFamilies,
  IconRowGroup,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { SectionHeader } from "../ui/section-header";
import { freezeDecidedDetail } from "./freeze-format";
import { FreezeRow } from "./freeze-row";

type FreezesNavigation = {
  goBack: () => void;
  navigate: (screen: "ReviewFreeze", params: { freezeId: string }) => void;
};

/**
 * CON Congelamientos, opened from Pagos (owner, 2026-11-02): the requests
 * still to decide, then the decided ones (walkthrough finding 52). The title
 * sits in the bar as on its Accesos siblings, Facturas and Cancelar una clase.
 */
export function FreezesScreen() {
  const navigation = useNavigation<FreezesNavigation>();
  const fetcher = useStaffFetcher();
  const requested = useListRequestedFreezes({ fetcher, query: { refetchOnMount: "always" } });
  const decided = useListDecidedFreezes({ fetcher, query: { refetchOnMount: "always" } });
  const header = <BackBar onBack={() => navigation.goBack()} title="Congelamientos" />;
  const open = (freezeId: string) => navigation.navigate("ReviewFreeze", { freezeId });

  if (requested.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando congelamientos" />
      </Screen>
    );
  }
  if (requested.isError || requested.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar los congelamientos."
          onRetry={() => void requested.refetch()}
        />
      </Screen>
    );
  }

  const freezes = requested.data.data;
  // An older API has no decided list: the section is simply left out.
  const decidedFreezes = decided.data?.status === 200 ? decided.data.data : [];
  return (
    <Screen style={styles.screen}>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {freezes.length === 0 ? (
          <StateScreen
            icon="hourglass"
            layout="inList"
            note="Te avisamos cuando una clienta pida pausar su plan."
            title="No hay solicitudes por revisar"
          />
        ) : (
          <View>
            <SectionHeader title={`Por revisar · ${freezes.length}`} />
            <IconRowGroup>
              {freezes.map((freeze) => (
                <FreezeRow
                  accessibilityLabel={`Revisar congelamiento de ${freeze.clientName}`}
                  freeze={freeze}
                  key={freeze.id}
                  note={freeze.reason}
                  onPress={() => open(freeze.id)}
                />
              ))}
            </IconRowGroup>
          </View>
        )}
        <Text style={styles.note}>
          Pausan el plan de la clienta. Los días congelados se suman a su vencimiento.
        </Text>
        {decidedFreezes.length === 0 ? null : (
          <View>
            <SectionHeader title="Decididas" />
            <IconRowGroup>
              {decidedFreezes.map((freeze) => (
                <FreezeRow
                  accessibilityLabel={`Ver congelamiento de ${freeze.clientName}`}
                  freeze={freeze}
                  key={freeze.id}
                  note={freezeDecidedDetail(freeze)}
                  onPress={() => open(freeze.id)}
                />
              ))}
            </IconRowGroup>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  screen: { paddingHorizontal: spacing.xlSm },
});
