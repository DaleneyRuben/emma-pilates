# Use verified HTTPS links through a central mobile ingress

Status: accepted

Public mobile links will use a project-controlled HTTPS domain configured as iOS Universal Links and Android App Links. React Navigation's static configuration will expose only explicitly allowlisted paths rather than automatically making every leaf screen linkable, and one mobile ingress will translate accepted URLs and notification data into typed internal destination intents.

The ingress accepts verified HTTPS links and the stable notification type plus record identifiers established in [ADR-0025](./0025-use-expo-push-service-for-mobile-notifications.md). It rejects unknown types, malformed identifiers, unapproved hosts and paths, and arbitrary destination URLs supplied in notification payloads. A valid link selects a destination; it never supplies trusted domain data or authorization.

Protected destinations wait for Authentication Session restoration. If no usable credential is available, the app shows Login and may continue to the safe destination only after authentication; it then resolves the current Account, Role, Branch access, and resource state through the backend before rendering. Missing, stale, or unauthorized destinations fall back to an appropriate role home with a non-sensitive message. Opening a link therefore cannot bypass the same backend authorization used by ordinary navigation.

Email verification, staff-account activation, and password-recovery secrets remain backend-owned one-time authentication links under [ADR-0029](./0029-manage-authentication-in-the-nestjs-backend.md), not general protected-screen routes. When the mobile app is absent, ordinary application links may show a neutral web landing or installation page; deferred deep-link attribution is not part of the initial release.

A custom URI scheme remains acceptable for local development but was rejected as the public link contract because it lacks the verified-domain ownership and browser fallback of HTTPS links. Screen-owned link handlers were rejected because they would scatter parsing and authentication behavior. Opening only the mobile home screen was rejected because it discards the direct path from a notification to the relevant authorized workflow.
