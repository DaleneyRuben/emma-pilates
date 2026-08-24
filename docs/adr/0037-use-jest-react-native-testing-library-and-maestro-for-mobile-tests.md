# Use Jest, React Native Testing Library, and Maestro for mobile tests

Status: accepted

The Expo mobile application will use Jest with the `jest-expo` preset for TypeScript units, hooks, and native-adapter behavior; React Native Testing Library for component and screen behavior; and the open-source Maestro CLI for a small suite of end-to-end journeys against compiled iOS and Android application builds.

Jest tests framework-light logic such as link-intent parsing, cache allowlisting, RFC 9457 mapping, and form schemas, plus adapter behavior with native and generated-REST-client boundaries replaced deliberately. React Native Testing Library exercises screens through accessible text, roles, labels, and user interaction rather than component internals or broad snapshot assertions. Tests must not mock the unit under test or duplicate backend domain rules in mobile fixtures.

Maestro verifies only release-critical cross-boundary journeys that unit and screen tests cannot prove, including Authentication Session restoration and Role routing, a representative Client Booking journey, a representative Staff Member journey, an authorized notification or HTTPS-link destination, and receipt image selection and upload handoff. Stable accessibility identifiers supplement visible labels where localization or repeated controls would make selectors ambiguous. The CLI may run locally or in CI without requiring Maestro Cloud.

Vitest was considered for consistency with modern TypeScript tooling but rejected for the mobile application because Expo's maintained native preset and module mocks are centered on Jest. Detox was considered for its gray-box synchronization and deeper React Native integration, but its native setup and version coupling are not justified by the initial journeys. Component tests alone were rejected because they cannot verify the installed application's native navigation, linking, storage, notification, and upload boundaries.

This decision does not select the admin-web or backend test runners, fixture ownership, E2E environment provisioning, CI frequency, or device matrix. Those remain part of the wider testing and delivery architecture.
