import { useListRequestedFreezes } from "@pilates/api-contracts";
import {
  ClientFace,
  IconRowGroup,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
  StateScreen,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, View } from "react-native";

import { useStaffFetcher } from "../staff-fetcher";
import { BackBar, backBarScroll } from "../ui/back-bar";
import { PersonRow } from "../ui/person-row";
import { SectionHeader } from "../ui/section-header";
import { freezeDays, freezeRange } from "./freeze-format";

type FreezesNavigation = {
  goBack: () => void;
  navigate: (screen: "ReviewFreeze", params: { freezeId: string }) => void;
};

/**
 * CON Congelamientos, opened from Pagos (owner, 2026-11-02). The API lists
 * only the requests still to decide, so the board's «Revisados» is not drawn.
 */
export function FreezesScreen() {
  const navigation = useNavigation<FreezesNavigation>();
  const fetcher = useStaffFetcher();
  const requested = useListRequestedFreezes({ fetcher, query: { refetchOnMount: "always" } });
  const header = (
    <BackBar
      back="Pagos"
      onBack={() => navigation.goBack()}
      subtitle="Pausan el plan de la clienta. Los días congelados se suman a su vencimiento."
      title="Congelamientos"
    />
  );

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
  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, backBarScroll.content]}
        style={backBarScroll.scroll}
      >
        {header}
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
                <PersonRow
                  accessibilityLabel={`Revisar congelamiento de ${freeze.clientName}`}
                  detail={`${freezeRange(freeze.startsOn, freeze.endsOn)} · ${freezeDays(freeze.startsOn, freeze.endsOn)} · ${freeze.reason}`}
                  face={
                    <ClientFace
                      fetcher={fetcher}
                      name={freeze.clientName}
                      photo={freeze.clientPhoto}
                      size={36}
                    />
                  }
                  key={freeze.id}
                  name={freeze.clientName}
                  onPress={() => navigation.navigate("ReviewFreeze", { freezeId: freeze.id })}
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
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  screen: { paddingHorizontal: spacing.xlSm },
});
