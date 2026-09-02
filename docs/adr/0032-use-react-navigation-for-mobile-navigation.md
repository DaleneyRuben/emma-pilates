# Use React Navigation for mobile navigation

Status: accepted

The Client and Staff Expo applications will each use React Navigation with its static configuration API. Each navigation tree will be declared explicitly in TypeScript. The Client application contains only unauthenticated Client and authenticated Client flows; the Staff application contains only unauthenticated Staff and the four Role-routed Staff flows. Typed routes and deep-link paths are generated from each application's configuration.

React Navigation was selected because this is a native iOS and Android application with a separate admin web surface. Explicit control over navigation structure, state resets, authentication boundaries, and role-routed flows is more valuable here than deriving routes from the file system. Its static API also avoids much of the TypeScript and deep-linking boilerplate associated with its older dynamic configuration.

Expo Router was considered because it is Expo's recommended default and adds file-based routing, automatic deep linking, typed routes, and web-oriented rendering features. It was rejected because this application does not need a shared mobile-web route tree, and coupling public paths to the screen-file hierarchy would provide little benefit for its role-specific native flows. Expo remains the mobile framework; choosing React Navigation does not move the project to bare React Native.

Verified HTTPS links and notification navigation are governed by the central ingress selected in [ADR-0036](./0036-use-verified-https-links-through-a-central-mobile-ingress.md). Only explicitly declared public paths may enter the route configuration, and every protected destination passes through normal authentication and authorization checks. Dynamic navigator configuration should be introduced only for a flow that the static API cannot express cleanly.
