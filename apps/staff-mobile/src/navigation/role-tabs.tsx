import { colors, fontFamilies, tabStackScreenLayout } from "@pilates/mobile-core";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createStaticNavigation,
  getFocusedRouteNameFromRoute,
  type ParamListBase,
  type RouteProp,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CancelClassScreen } from "../administrator/cancel-class-screen";
import { CancelSessionScreen } from "../administrator/cancel-session-screen";
import { FreezesScreen } from "../administrator/freezes-screen";
import { PendingPaymentsScreen } from "../administrator/pending-payments-screen";
import { ReviewFreezeScreen } from "../administrator/review-freeze-screen";
import { ReviewPaymentScreen } from "../administrator/review-payment-screen";
import { AssistantRescheduleScreen } from "../assistant/assistant-reschedule-screen";
import { AssistantSessionDetailScreen } from "../assistant/assistant-session-detail-screen";
import { BrowseSessionsScreen } from "../assistant/browse-sessions-screen";
import { ClientBookingsScreen } from "../assistant/client-bookings-screen";
import { ClientHistoryScreen } from "../assistant/client-history-screen";
import { ClientOverviewScreen } from "../assistant/client-overview-screen";
import { ClientSearchScreen } from "../assistant/client-search-screen";
import { ConfirmCashPaymentScreen } from "../assistant/confirm-cash-payment-screen";
import { NewClientScreen } from "../assistant/new-client-screen";
import { SelectPlanScreen } from "../assistant/select-plan-screen";
import { CashCloseScreen } from "../cash-close/cash-close-screen";
import { ContactListScreen } from "../coordinator/contact-list-screen";
import { ViewAsScreen } from "../impersonation/view-as-screen";
import type { StaffRole } from "../notifications/notification-destinations";
import { AvailabilityBlockFormScreen } from "../nutritionist/availability-block-form-screen";
import { AvailabilityScreen } from "../nutritionist/availability-screen";
import { NutritionistAgendaScreen } from "../nutritionist/nutritionist-agenda-screen";
import { StaffChangePasswordScreen } from "../profile/staff-change-password-screen";
import { StaffFeedbackScreen } from "../profile/staff-feedback-screen";
import { StaffNotificationsScreen } from "../profile/staff-notifications-screen";
import { StaffReferralCodeScreen } from "../profile/staff-referral-code-screen";
import { StaffPayScreen } from "../profile/staff-pay-screen";
import { StaffProfileScreen } from "../profile/staff-profile-screen";
import { ScheduleScreen } from "../schedule/schedule-screen";
import { ReportFaultScreen } from "../trainer/report-fault-screen";
import { TrainerAgendaScreen } from "../trainer/trainer-agenda-screen";
import { TrainerRosterScreen } from "../trainer/trainer-roster-screen";
import { ContactsTabIcon } from "./contacts-tab-icon";
import { StaffTabIcon, type StaffTabIconName } from "./staff-tab-icon";

// FIX-023: a tab's root sits over the tab bar; a pushed screen keeps the
// bottom safe area (tabStackScreenLayout).
const stackConfig = {
  screenLayout: tabStackScreenLayout,
  screenOptions: { headerShown: false },
} as const;

// Perfil and what opens from it, the same for every role (S23, S20, S27).
const profileScreens = {
  Profile: StaffProfileScreen,
  Notifications: StaffNotificationsScreen,
  ChangePassword: StaffChangePasswordScreen,
  Feedback: StaffFeedbackScreen,
  ReferralCode: StaffReferralCodeScreen,
};

// A Client's file and everything reached from it (S06–S10, S21, S22). The
// Coordinator never sells nor registers (ADR-0102), so she drops `sellingScreens`.
const clientScreens = {
  ClientSearch: ClientSearchScreen,
  ClientOverview: ClientOverviewScreen,
  BrowseSessions: BrowseSessionsScreen,
  SessionDetail: AssistantSessionDetailScreen,
  ClientBookings: ClientBookingsScreen,
  Reschedule: AssistantRescheduleScreen,
  ClientHistory: ClientHistoryScreen,
  Notifications: StaffNotificationsScreen,
};
const sellingScreens = {
  NewClient: NewClientScreen,
  SelectPlan: SelectPlanScreen,
  ConfirmCashPayment: ConfirmCashPaymentScreen,
};
const cancelClassScreens = { CancelClass: CancelClassScreen, CancelSession: CancelSessionScreen };

const tabBarStyle = { backgroundColor: colors.card, borderTopWidth: 0 };

// The bar shows only while the tab's stack is on its root screen.
const tabOptions =
  (title: string, icon: StaffTabIconName, root: string) =>
  ({ route }: { route: RouteProp<ParamListBase> }) => ({
    tabBarButtonTestID: `tab-${icon}`,
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) =>
      icon === "contacts" ? (
        <ContactsTabIcon color={color} focused={focused} />
      ) : (
        <StaffTabIcon color={color} focused={focused} name={icon} />
      ),
    tabBarStyle:
      (getFocusedRouteNameFromRoute(route) ?? root) === root
        ? tabBarStyle
        : { display: "none" as const },
    title,
  });

const profileTab = {
  screen: createNativeStackNavigator({ ...stackConfig, screens: profileScreens }),
  options: tabOptions("Perfil", "profile", "Profile"),
};

// Follow-up 225 §8: one tab bar per role, drawn like the client's, on Lino.
const tabConfig = {
  screenOptions: {
    headerShown: false,
    tabBarActiveTintColor: colors.emphasis,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarLabelPosition: "below-icon",
    tabBarLabelStyle: { fontFamily: fontFamilies.bodyMedium, fontSize: 12 },
  },
} as const;

export const roleNavigation: Record<StaffRole, ReturnType<typeof createStaticNavigation>> = {
  trainer: createStaticNavigation(
    createBottomTabNavigator({
      ...tabConfig,
      screens: {
        AgendaTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: {
              Agenda: TrainerAgendaScreen,
              Roster: TrainerRosterScreen,
              ReportFault: ReportFaultScreen,
              Notifications: StaffNotificationsScreen,
            },
          }),
          options: tabOptions("Agenda", "agenda", "Agenda"),
        },
        PayTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { MyPay: StaffPayScreen },
          }),
          options: tabOptions("Mis pagos", "pay", "MyPay"),
        },
        ProfileTab: profileTab,
      },
    }),
  ),
  assistant: createStaticNavigation(
    createBottomTabNavigator({
      ...tabConfig,
      screens: {
        ClientsTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { ...clientScreens, ...sellingScreens },
          }),
          options: tabOptions("Clientes", "clients", "ClientSearch"),
        },
        ScheduleTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { Schedule: ScheduleScreen },
          }),
          options: tabOptions("Horario", "schedule", "Schedule"),
        },
        CashTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { CashClose: CashCloseScreen },
          }),
          options: tabOptions("Caja", "cash", "CashClose"),
        },
        ProfileTab: profileTab,
      },
    }),
  ),
  nutritionist: createStaticNavigation(
    createBottomTabNavigator({
      ...tabConfig,
      screens: {
        AgendaTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { Agenda: NutritionistAgendaScreen, Notifications: StaffNotificationsScreen },
          }),
          options: tabOptions("Agenda", "agenda", "Agenda"),
        },
        AvailabilityTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: {
              Availability: AvailabilityScreen,
              AvailabilityBlockForm: AvailabilityBlockFormScreen,
            },
          }),
          options: tabOptions("Disponibilidad", "availability", "Availability"),
        },
        ProfileTab: profileTab,
      },
    }),
  ),
  // Cancelar una clase, Congelamientos and Cerrar caja open from Pagos (owner, 2026-11-02).
  administrator: createStaticNavigation(
    createBottomTabNavigator({
      ...tabConfig,
      screens: {
        PaymentsTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: {
              Payments: PendingPaymentsScreen,
              ReviewPayment: ReviewPaymentScreen,
              Freezes: FreezesScreen,
              ReviewFreeze: ReviewFreezeScreen,
              ...cancelClassScreens,
              CashClose: CashCloseScreen,
              Notifications: StaffNotificationsScreen,
            },
          }),
          options: tabOptions("Pagos", "payments", "Payments"),
        },
        ClientsTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { ...clientScreens, ...sellingScreens },
          }),
          options: tabOptions("Clientes", "clients", "ClientSearch"),
        },
        ScheduleTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { Schedule: ScheduleScreen, ...cancelClassScreens },
          }),
          options: tabOptions("Horario", "schedule", "Schedule"),
        },
        ProfileTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { ...profileScreens, ViewAs: ViewAsScreen },
          }),
          options: tabOptions("Perfil", "profile", "Profile"),
        },
      },
    }),
  ),
  coordinator: createStaticNavigation(
    createBottomTabNavigator({
      ...tabConfig,
      screens: {
        ClientsTab: {
          screen: createNativeStackNavigator({ ...stackConfig, screens: clientScreens }),
          options: tabOptions("Clientes", "clients", "ClientSearch"),
        },
        ContactsTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { ContactList: ContactListScreen },
          }),
          options: tabOptions("Para contactar", "contacts", "ContactList"),
        },
        ScheduleTab: {
          screen: createNativeStackNavigator({
            ...stackConfig,
            screens: { Schedule: ScheduleScreen, ...cancelClassScreens },
          }),
          options: tabOptions("Horario", "schedule", "Schedule"),
        },
        ProfileTab: profileTab,
      },
    }),
  ),
};
