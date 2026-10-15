import { startErrorReporting } from "@pilates/mobile-core";
import { registerRootComponent } from "expo";

import App from "./App";

startErrorReporting("staff-mobile");
registerRootComponent(App);
