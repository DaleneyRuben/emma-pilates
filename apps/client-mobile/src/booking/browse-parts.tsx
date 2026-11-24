import {
  ClassList,
  colors,
  formatSessionDate,
  formatTimeRange,
  civilDateRange,
  LoadingState,
  OtherDateSheet,
  QueryFailure,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { Fragment, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { BrowseEmptyState } from "./browse-empty-state";
import { BranchSheet, ClassTypeStrip, DayStrip, DayStripOther } from "./browse-filters";
import { dayBackFromFreeze, FrozenDayCard, FrozenLegend, isFrozen } from "./frozen-day";
import { SessionRow, seatsTag } from "./session-row";
import { allClassTypes, type BrowseState } from "./use-browse-sessions";

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** C03's days, with «Otra» past seven and the Freeze's legend. */
export function BrowseDays({ state }: { state: BrowseState }) {
  const { dates, freeze, frozenDay, later, pickedLater, selectedDate } = state;
  return (
    <>
      <DayStrip
        dates={state.strip}
        frozen={(date) => isFrozen(date, freeze)}
        onSelect={state.setSelectedDate}
        selected={selectedDate}
        today={state.today}
        trailing={
          later.length === 0 ? undefined : (
            <DayStripOther
              accessibilityLabel={`Elegir otra fecha, hasta ${state.windowDays} días`}
              label={pickedLater ? String(Number(selectedDate.slice(8, 10))) : "Otra"}
              onPress={() => state.setChoosingDate(true)}
              selected={pickedLater}
            />
          )
        }
      />
      {freeze !== null && !frozenDay && dates.some((date) => isFrozen(date, freeze)) ? (
        <FrozenLegend freeze={freeze} />
      ) : null}
    </>
  );
}

/** The Branch list under the picker, while it is open. */
export function BrowseBranchSheet({ state }: { state: BrowseState }) {
  if (!state.choosingBranch) return null;
  return (
    <BranchSheet
      branches={state.branchList}
      onSelect={(id) => {
        state.setSelectedBranchId(id);
        state.setChoosingBranch(false);
      }}
      selectedId={state.branchId}
    />
  );
}

/** The Class Type chips; a tablet wraps them instead of scrolling (03T). */
export function BrowseTypes({ state, wrap }: { state: BrowseState; wrap?: boolean }) {
  return (
    <ClassTypeStrip
      onSelect={state.setClassTypeId}
      options={[
        { id: allClassTypes, label: "Todas" },
        ...state.classTypeList.map((classType) => ({ id: classType.id, label: classType.name })),
      ]}
      selected={state.classTypeId}
      wrap={wrap}
    />
  );
}

/** S13's later days, past the strip. */
export function BrowseOtherDate({ state }: { state: BrowseState }) {
  return (
    <OtherDateSheet
      dates={state.later}
      onClose={() => state.setChoosingDate(false)}
      onSelect={(date) => {
        state.setSelectedDate(date);
        state.setChoosingDate(false);
      }}
      selected={state.selectedDate}
      testIDPrefix="browse-other"
      visible={state.choosingDate}
    />
  );
}

/**
 * The chosen day's classes, or why there are none. A phone scrolls each
 * state on its own; the tablet's list panel already scrolls (`scroll`
 * false). `selectedId` marks the class open beside the list (03T).
 */
export function BrowseBody({
  onOpen,
  onOpenFreeze,
  scroll = true,
  selectedId = null,
  state,
}: {
  onOpen: (sessionId: string) => void;
  onOpenFreeze: () => void;
  scroll?: boolean;
  selectedId?: string | null;
  state: BrowseState;
}) {
  const { freeze, refreshControl, selectedDate, visibleSessions } = state;
  const scrolled = (style: object, child: ReactNode, testID?: string) =>
    scroll ? (
      <ScrollView contentContainerStyle={style} refreshControl={refreshControl} testID={testID}>
        {child}
      </ScrollView>
    ) : (
      <Fragment>{child}</Fragment>
    );

  if (state.frozenDay && freeze !== null) {
    return scrolled(
      styles.list,
      <FrozenDayCard
        backOn={dayBackFromFreeze(freeze, state.dates)}
        day={selectedDate}
        freeze={freeze}
        onOpenFreeze={onOpenFreeze}
        onShowDay={state.setSelectedDate}
      />,
    );
  }
  if (state.loading) return <LoadingState label="Cargando clases" />;
  if (state.failed) {
    return <QueryFailure label="No pudimos cargar las clases." onRetry={state.refetch} />;
  }
  if (visibleSessions.length === 0) {
    return scrolled(
      styles.empty,
      <BrowseEmptyState
        branchId={state.branchId}
        classTypeId={state.classTypeId}
        classTypeName={state.classTypeList.find((type) => type.id === state.classTypeId)?.name}
        dates={state.dates}
        onSelectDate={state.setSelectedDate}
        onShowAll={() => state.setClassTypeId(allClassTypes)}
        selectedDate={selectedDate}
        today={state.today}
      />,
    );
  }
  return scrolled(
    styles.list,
    <>
      <View style={styles.dayHeader} testID="browse-day-header">
        <Text style={styles.dayTitle} variant="etiqueta">
          {capitalized(formatSessionDate(civilDateRange(selectedDate).from))}
        </Text>
        <Text variant="pastilla">
          {visibleSessions.length === 1 ? "1 clase" : `${visibleSessions.length} clases`}
        </Text>
      </View>
      <ClassList testID="browse-session-group">
        {visibleSessions.map((session) => {
          const row = (
            <SessionRow
              accessibilityLabel={`${session.classTypeName} ${formatTimeRange(session.startsAt, session.endsAt)}, ${session.trainerName}, ${seatsTag(session)}`}
              key={session.id}
              onPress={() => onOpen(session.id)}
              session={session}
              testID={`session-card-${session.id}`}
            />
          );
          // 03T: the class open in the detail panel sits on the tint.
          return scroll ? (
            row
          ) : (
            <View
              key={session.id}
              style={session.id === selectedId && styles.selected}
              testID={`session-row-${session.id}`}
            >
              {row}
            </View>
          );
        })}
      </ClassList>
    </>,
    "browse-sessions-scroll",
  );
}

const styles = StyleSheet.create({
  // C03: the day's date is a white strip card above its classes.
  dayHeader: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dayTitle: { flexShrink: 1 },
  empty: { flexGrow: 1, paddingBottom: spacing.xxl, paddingTop: spacing.xxs },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, paddingTop: spacing.xxs },
  selected: { backgroundColor: colors.primaryTint },
});
