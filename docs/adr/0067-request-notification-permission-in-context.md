# Request notification permission in context

Status: accepted

The mobile app does not request operating-system notification permission during initial onboarding. It first presents a short project-owned explanation after a successful action makes the benefit concrete, such as creating a Booking that can receive schedule-change and reminder notifications. The trigger is role-appropriate for Clients and Staff Members. Only an affirmative action on that explanation opens the operating-system permission prompt.

The app checks the current operating-system status before presenting either step. Once permission is denied, it does not repeatedly show the system prompt or a blocking reminder; notification Settings explain the value and provide a deliberate route to the operating-system settings. When permission is granted, the installation registers its endpoint under [ADR-0025](./0025-use-expo-push-service-for-mobile-notifications.md). Sign-out removes that installation's Account association even though the device-level permission may remain enabled.

Push permission remains optional: every relevant state is available inside the app and no workflow depends on notification delivery. Asking during onboarding was rejected because the user has not yet seen why notifications help and an early denial is difficult to reverse. Requiring users to discover notification setup only in Settings was rejected because many would unintentionally miss useful reminders.
