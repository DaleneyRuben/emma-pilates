import { useListRequestedFreezes } from "@pilates/api-contracts";
import {
  BodyText,
  Chevron,
  colors,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatCivilDate } from "../assistant/assistant-format";
import { useStaffFetcher } from "../staff-fetcher";
import { RootHeader } from "../ui/root-header";

type FreezesNavigation = {
  navigate: (screen: "ReviewFreeze", params: { freezeId: string }) => void;
};

export function FreezesScreen() {
  const navigation = useNavigation<FreezesNavigation>();
  const fetcher = useStaffFetcher();
  const requested = useListRequestedFreezes({ fetcher });
  const header = <RootHeader label="Congelamientos" title="Congelamientos" />;

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
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {freezes.length === 0 ? (
          <BodyText>No hay solicitudes pendientes.</BodyText>
        ) : (
          freezes.map((freeze) => (
            <Pressable
              accessibilityLabel={`Revisar congelamiento de ${freeze.clientName}`}
              accessibilityRole="button"
              key={freeze.id}
              onPress={() => navigation.navigate("ReviewFreeze", { freezeId: freeze.id })}
              style={styles.card}
            >
              <View style={styles.cardBody}>
                <Text style={styles.name}>{freeze.clientName}</Text>
                <BodyText>{`${formatCivilDate(freeze.startsOn)} – ${formatCivilDate(freeze.endsOn)}`}</BodyText>
                <BodyText>{freeze.reason}</BodyText>
              </View>
              <Chevron />
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  cardBody: { flexShrink: 1, gap: spacing.xs },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  name: { color: colors.text, fontSize: typography.titleSmall, fontWeight: "500" },
  screen: { gap: spacing.md },
});
