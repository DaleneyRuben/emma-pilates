# Separate Client and Staff mobile applications

Status: accepted

The system will have one Client mobile application, one Staff mobile
application, one desktop admin web application, and one modular-monolith
backend. This decision supersedes
[ADR-0008](./0008-one-role-routed-mobile-app-and-admin-web.md).

The Client application owns self-registration, Client authentication, class
discovery and Booking, Plans and Subscriptions, Client Payments, Evaluations,
Referrals, and the Client profile. The Staff application owns Staff
authentication and routes Trainers, Assistants, Administrators, and
Nutritionists to their Role-specific navigation and capabilities. The admin
web application remains the Administrator's deliberate desktop surface.

The two mobile applications are separate Expo projects and release artifacts.
They have distinct application names, slugs, bundle identifiers, package
identifiers, credentials, SecureStore namespaces, deep-link configuration,
builds, store listings, and release cadence. A Client Account cannot enter the
Staff application, and a Staff Member Account cannot enter the Client
application. The backend remains authoritative for Account identity and Role;
neither application trusts locally selected Role state.

Generic mobile infrastructure may be reused through narrow workspace packages:
design tokens and primitives, API transport, RFC 9457 normalization, query
setup, secure credential adapters, and verified-link parsing. Application
navigation, screens, product copy, authentication eligibility, and Role
behavior remain owned by the consuming application. Neither application may
depend on the other application.

The previous combined release artifact reduced initial setup, but it contradicted
the approved Client and Staff product surfaces and exposed unrelated entry
flows in the same installation. Splitting now keeps each audience's installed
experience, credentials, links, permissions, testing, and releases explicit
while the implemented mobile surface is still small.
