# Use Expo with React Native for the mobile app

Status: accepted

The role-routed mobile application established in [ADR-0008](./0008-one-role-routed-mobile-app-and-admin-web.md) will use React Native through the Expo framework. Client and Staff Member experiences remain one TypeScript application targeting iOS and Android, and the app consumes the generated TypeScript client from the `api-contracts` workspace package.

Expo was selected because the application needs common mobile capabilities such as push notifications, camera and image access for payment receipts, secure local credential storage, deep linking, and repeatable native builds, but has no known requirement for a heavily customized native shell. Expo supplies an integrated framework for those concerns while retaining access to native libraries, configuration plugins, and custom native code when a justified requirement appears.

Bare React Native was rejected because it would make the team assemble and maintain more of the native build and application framework without a current product need for that control. Flutter was rejected because it would introduce Dart and a separate client ecosystem, weakening the TypeScript standardization accepted in [ADR-0012](./0012-standardize-application-code-on-typescript.md) and the monorepo contract workflow accepted in [ADR-0013](./0013-use-a-pnpm-monorepo.md).

Mobile navigation is selected separately in [ADR-0032](./0032-use-react-navigation-for-mobile-navigation.md), mobile server-state handling in [ADR-0033](./0033-use-tanstack-query-for-mobile-server-state.md), and mobile form handling in [ADR-0034](./0034-use-react-hook-form-and-zod-for-mobile-forms.md).

The initial mobile application will not add a global client-state library. Ephemeral UI state stays with its owning component or nearest shared parent, and React Context is reserved for genuinely application-wide, low-frequency concerns. Backend-owned data remains in TanStack Query, form state remains in React Hook Form, navigation state remains in React Navigation, and credentials remain in operating-system secure storage rather than being copied into Context. A dedicated store may be selected later if concrete, frequently changing cross-screen state makes these boundaries insufficient.

Offline behavior is selected separately in [ADR-0035](./0035-use-an-online-first-read-only-mobile-cache.md). This decision does not select the local persistence mechanism, mobile testing tools, over-the-air update policy, or Expo Application Services. Those choices remain separate and must be evaluated against the application's actual workflows.
