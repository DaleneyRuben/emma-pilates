# One role-routed mobile app and a separate admin web app

Status: accepted

The system will have one modular-monolith backend, one mobile application, and one desktop admin web application. The mobile application serves both Clients and Staff Members; after authentication it routes each person to the navigation and capabilities for their Role. The web application is the Administrator's desktop surface.

This follows the existing Booking & Membership language, which defines a shared staff mobile app for Trainers, Assistants, Administrators, and the Nutritionist, routed by Role. It keeps the client and staff mobile experiences in the same release artifact while maintaining the domain's role boundaries through authorization and role-specific navigation. The backend remains the single deployable established by [ADR-0005](./0005-modular-monolith-decomposed-by-bounded-context.md).

The alternative is separate client and staff mobile applications. That would give each audience an isolated release cadence, but it duplicates authentication, notification handling, shared account behavior, operational release work, and much of the mobile foundation before the studio has evidence that separate teams or release cycles need it. It also introduces needless migration work for a person whose role changes.

The Administrator remains available on mobile only for the urgent actions established in [ADR-0004](./0004-split-administrator-across-mobile-and-desktop.md), with transfer-payment confirmation also available on desktop under [ADR-0006](./0006-extend-payment-confirmation-to-desktop-admin.md). The desktop web app owns the deliberate administrative workflows.
