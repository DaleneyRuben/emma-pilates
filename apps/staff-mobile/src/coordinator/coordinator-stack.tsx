import { recoveryScreenLayout } from "@pilates/mobile-core";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ComponentType } from "react";

import { CancelClassScreen } from "../administrator/cancel-class-screen";
import { CancelSessionScreen } from "../administrator/cancel-session-screen";
import { AssistantRescheduleScreen } from "../assistant/assistant-reschedule-screen";
import { AssistantSessionDetailScreen } from "../assistant/assistant-session-detail-screen";
import { BrowseSessionsScreen } from "../assistant/browse-sessions-screen";
import { ClientBookingsScreen } from "../assistant/client-bookings-screen";
import { ClientHistoryScreen } from "../assistant/client-history-screen";
import { ClientOverviewScreen } from "../assistant/client-overview-screen";
import { ClientSearchScreen } from "../assistant/client-search-screen";

// IDN-009 / ADR-0102 (follow-up 158): the Coordinator's own stack. She finds
// Clients and manages their Bookings like the Assistant, at every Branch,
// with neither the sale nor the new-Client screens, and cancels a class like
// the Administrator. Her follow-up contact list (BKM-013) joins these
// screens when it exists.
export const coordinatorScreens = {
  ClientSearch: ClientSearchScreen,
  ClientOverview: ClientOverviewScreen,
  BrowseSessions: BrowseSessionsScreen,
  SessionDetail: AssistantSessionDetailScreen,
  ClientBookings: ClientBookingsScreen,
  Reschedule: AssistantRescheduleScreen,
  ClientHistory: ClientHistoryScreen,
  CancelClass: CancelClassScreen,
  CancelSession: CancelSessionScreen,
};

export const createCoordinatorStack = (accountScreens: Record<string, ComponentType<never>>) =>
  createNativeStackNavigator({
    screenLayout: recoveryScreenLayout,
    screenOptions: { headerShown: false },
    screens: { ...coordinatorScreens, ...accountScreens },
  });
