import { Screen, ScreenHeader, spacing, useWideScreen } from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet } from "react-native";

import { BranchLine } from "./browse-filters";
import {
  BrowseBody,
  BrowseBranchSheet,
  BrowseDays,
  BrowseOtherDate,
  BrowseTypes,
} from "./browse-parts";
import { BrowseSplit } from "./browse-split";
import { WeekNotice } from "./browse-week-notice";
import { useBrowseSessions } from "./use-browse-sessions";

type BrowseNavigation = {
  navigate: {
    (screen: "SessionDetail", params: { sessionId: string }): void;
    (screen: "Subscription"): void;
  };
};

export function BrowseSessionsScreen() {
  const navigation = useNavigation<BrowseNavigation>();
  const state = useBrowseSessions();
  const wide = useWideScreen();
  const openFreeze = () => navigation.navigate("Subscription");

  if (wide) {
    return (
      <Screen style={styles.wideScreen}>
        <BrowseSplit onOpenFreeze={openFreeze} state={state} />
        <BrowseOtherDate state={state} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      {/* C03: the band holds the Branch, the week's notice and the days. */}
      <ScreenHeader testID="browse-header" title="Reservar">
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
          selectedDate={state.selectedDate}
          today={state.today}
        />
        <BrowseDays state={state} />
      </ScreenHeader>
      <BrowseBranchSheet state={state} />
      <BrowseTypes state={state} />
      <BrowseBody
        onOpen={(sessionId) => navigation.navigate("SessionDetail", { sessionId })}
        onOpenFreeze={openFreeze}
        state={state}
      />
      <BrowseOtherDate state={state} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
  // 03T: the split starts right under the band and reaches the tab bar.
  wideScreen: { gap: 0, paddingBottom: 0 },
});
