# Use React Navigation for mobile navigation

Status: accepted

The Expo mobile application will use React Navigation with its static configuration API. The navigation tree will be declared explicitly in TypeScript, with role-specific Client and Staff Member flows composed under one application root and with typed routes and deep-link paths generated from that configuration.

React Navigation was selected because this is a native iOS and Android application with a separate admin web surface. Explicit control over navigation structure, state resets, authentication boundaries, and role-routed flows is more valuable here than deriving routes from the file system. Its static API also avoids much of the TypeScript and deep-linking boilerplate associated with its older dynamic configuration.

Expo Router was considered because it is Expo's recommended default and adds file-based routing, automatic deep linking, typed routes, and web-oriented rendering features. It was rejected because this application does not need a shared mobile-web route tree, and coupling public paths to the screen-file hierarchy would provide little benefit for its role-specific native flows. Expo remains the mobile framework; choosing React Navigation does not move the project to bare React Native.

Deep links opened from notifications and other trusted application links must map through the declared route configuration and pass through normal authentication and authorization checks. Dynamic navigator configuration should be introduced only for a flow that the static API cannot express cleanly.
