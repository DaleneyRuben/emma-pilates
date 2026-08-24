# Use Expo with React Native for the mobile app

Status: accepted

The role-routed mobile application established in [ADR-0008](./0008-one-role-routed-mobile-app-and-admin-web.md) will use React Native through the Expo framework. Client and Staff Member experiences remain one TypeScript application targeting iOS and Android, and the app consumes the generated TypeScript client from the `api-contracts` workspace package.

Expo was selected because the application needs common mobile capabilities such as push notifications, camera and image access for payment receipts, secure local credential storage, deep linking, and repeatable native builds, but has no known requirement for a heavily customized native shell. Expo supplies an integrated framework for those concerns while retaining access to native libraries, configuration plugins, and custom native code when a justified requirement appears.

Bare React Native was rejected because it would make the team assemble and maintain more of the native build and application framework without a current product need for that control. Flutter was rejected because it would introduce Dart and a separate client ecosystem, weakening the TypeScript standardization accepted in [ADR-0012](./0012-standardize-application-code-on-typescript.md) and the monorepo contract workflow accepted in [ADR-0013](./0013-use-a-pnpm-monorepo.md).

Mobile navigation is selected separately in [ADR-0032](./0032-use-react-navigation-for-mobile-navigation.md), and mobile server-state handling is selected in [ADR-0033](./0033-use-tanstack-query-for-mobile-server-state.md). This decision does not select a local-state library, local persistence and offline policy, mobile testing tools, over-the-air update policy, or Expo Application Services. Those choices remain separate and must be evaluated against the application's actual workflows.
