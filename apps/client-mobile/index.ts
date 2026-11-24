import { holdLaunchSplash, startErrorReporting } from "@pilates/mobile-core";
import { registerRootComponent } from "expo";

import App from "./App";
import { unlockTabletOrientation } from "./src/tablet-orientation";

startErrorReporting("client-mobile");
holdLaunchSplash();
unlockTabletOrientation();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
