import { holdLaunchSplash, startErrorReporting } from "@pilates/mobile-core";
import { registerRootComponent } from "expo";

import App from "./App";

startErrorReporting("staff-mobile");
holdLaunchSplash();
registerRootComponent(App);
