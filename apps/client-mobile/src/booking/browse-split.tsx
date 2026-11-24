import { getListSessionAvailabilityQueryKey } from "@pilates/api-contracts";
import { ScreenHeader, spacing, SplitPanels } from "@pilates/mobile-core";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { BranchLine } from "./browse-filters";
import { BrowseBody, BrowseBranchSheet, BrowseDays, BrowseTypes } from "./browse-parts";
import { WeekNotice } from "./browse-week-notice";
import { SessionPanel } from "./session-panel";
import type { BrowseState } from "./use-browse-sessions";

/** Past this width the band holds the title and its pills on one row (03T landscape). */
const rowBandWidth = 1000;

/**
 * Reservar on a tablet (03T/04T, the S04 split): the band keeps the title,
 * the Branch and the week's notice; the 392 pt list panel holds the days,
 * the Class Types and the classes; the chosen class opens beside it.
 */
export function BrowseSplit({
  onOpenFreeze,
  state,
}: {
  onOpenFreeze: () => void;
  state: BrowseState;
}) {
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Leaving a class refreshes the list, as coming back to it does on a phone.
  const select = useCallback(
    (sessionId: string | null) => {
      void queryClient.invalidateQueries({ queryKey: getListSessionAvailabilityQueryKey() });
      setSelectedId(sessionId);
    },
    [queryClient],
  );
  const close = useCallback(() => select(null), [select]);

  const pills = (
    <View style={styles.pills} testID="browse-band-pills">
      {state.selectedBranch ? (
        <BranchLine
          count={state.branchList.length}
          name={state.selectedBranch.name}
          onToggle={() => state.setChoosingBranch((open) => !open)}
          open={state.choosingBranch}
        />
      ) : null}
      <WeekNotice
        classesLeft={state.classesLeft}
        pill
        selectedDate={state.selectedDate}
        today={state.today}
      />
    </View>
  );
  const oneRow = width > rowBandWidth;

  return (
    <>
      <ScreenHeader action={oneRow ? pills : undefined} testID="browse-header" title="Reservar">
        {oneRow ? null : pills}
      </ScreenHeader>
      <SplitPanels
        detail={<SessionPanel onClose={close} sessionId={selectedId} />}
        list={
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={state.refreshControl}
            testID="browse-sessions-scroll"
          >
            <BrowseBranchSheet state={state} />
            <BrowseDays state={state} />
            <BrowseTypes state={state} wrap />
            <BrowseBody
              onOpen={select}
              onOpenFreeze={onOpenFreeze}
              scroll={false}
              selectedId={selectedId}
              state={state}
            />
          </ScrollView>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: spacing.mdLg, padding: spacing.xl },
  pills: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
});
