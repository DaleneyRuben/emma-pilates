import Constants from "expo-constants";

// The footer names the installed build (app.json / the store binary), not a
// literal that drifts from it (MOB-070).
export function appVersionLabel(): string {
  return Constants.expoConfig?.version ?? "1.0.1";
}
