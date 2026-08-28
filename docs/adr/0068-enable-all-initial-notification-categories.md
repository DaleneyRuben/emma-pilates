# Enable all initial notification categories together

Status: accepted

The initial mobile release has four push-notification categories: Booking and schedule updates, reminders, Subscription and Payment updates, and studio announcements. Once an Account grants operating-system notification permission and has an active device endpoint, every category relevant to that Account's role, Branch, and current domain relationships is enabled. The app does not expose per-category preference switches or store category-level opt-outs initially; the operating-system permission remains the user's master control for push notifications.

"Enabled" does not mean guaranteed delivery or permission to reveal sensitive data. The operating system may suppress notifications, Expo delivery may fail, and a device may be offline. Every notified state remains discoverable in the app, and payloads continue to follow the privacy and current-state rules in [ADR-0025](./0025-use-expo-push-service-for-mobile-notifications.md). Security, activation, and account-recovery messages continue through their established email and in-app flows rather than relying on push.

A single undifferentiated notification type was rejected because stable categories are still needed for payload handling, analytics, testing, and a possible future preference model. Per-event or per-category settings were rejected for the initial release because all four categories are part of the intended service experience and the added settings, persistence, and delivery branching are not currently required.
