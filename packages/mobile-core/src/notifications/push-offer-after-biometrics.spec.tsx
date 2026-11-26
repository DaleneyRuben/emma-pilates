import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable } from "react-native";

import { BiometricOffer } from "../auth/biometric-offer";
import { MobileIdentityProvider, useMobileIdentity } from "../auth/identity-provider";
import type { SessionManager } from "../auth/session-manager";
import { clearMobileQueryCache, MobileQueryProvider } from "../query/provider";
import { Text } from "../ui/text";
import { PushNotificationsProvider, usePushNotifications } from "./push-notifications";
import type { PushPlatform } from "./push-platform";

const session = { accountId: "account-1", role: "administrator" as const };

const manager = {
  canUseBiometrics: () => true,
  declineBiometricOffer: jest.fn().mockResolvedValue(undefined),
  disableBiometrics: jest.fn(),
  enableBiometrics: jest.fn().mockResolvedValue(true),
  endLocally: jest.fn(),
  getCredential: jest.fn().mockResolvedValue(null),
  hasBiometricSession: jest.fn().mockResolvedValue(false),
  isBiometricsEnabled: jest.fn().mockResolvedValue(false),
  logout: jest.fn(),
  refresh: jest.fn(),
  restore: jest.fn().mockResolvedValue(null),
  start: jest.fn().mockResolvedValue(session),
  unlockWithBiometrics: jest.fn(),
  wasBiometricOfferDeclined: jest.fn().mockResolvedValue(false),
} satisfies SessionManager;

const noop = () => () => undefined;
const platform: PushPlatform = {
  os: "ios",
  getPermissionStatus: jest.fn().mockResolvedValue("undetermined"),
  requestPermission: jest.fn().mockResolvedValue("granted"),
  prepareChannels: jest.fn().mockResolvedValue(undefined),
  getPushToken: jest.fn().mockResolvedValue("ExponentPushToken[abc]"),
  onPushTokenChange: noop,
  onNotificationReceived: noop,
  onNotificationTap: noop,
  takeLaunchTap: jest.fn().mockResolvedValue(null),
  setBadgeCount: jest.fn().mockResolvedValue(undefined),
  openSettings: jest.fn().mockResolvedValue(undefined),
};

const fetcher = jest.fn((input: RequestInfo | URL) =>
  String(input).endsWith("/unread-count")
    ? Promise.resolve(new Response(JSON.stringify({ unread: 0 }), { status: 200 }))
    : Promise.resolve(new Response(null, { status: 204 })),
) as unknown as typeof fetch;

// A Staff role's first home offers notifications right after the password
// sign-in, while «¿Entrar con Face ID?» is up (ADR-0067).
function SignInThenHome() {
  const identity = useMobileIdentity();
  const { offerPermission } = usePushNotifications();
  return (
    <Pressable
      accessibilityLabel="Sign in"
      accessibilityRole="button"
      onPress={() =>
        void identity.start("password", { offerBiometrics: true }).then(() => offerPermission())
      }
    >
      <Text variant="boton">{identity.status}</Text>
    </Pressable>
  );
}

// Testing session (#5, Staff): iOS presents one modal at a time, so the
// notification sheet opened under the Face ID offer left the app frozen
// once «Ahora no» closed it. The notification sheet waits for the offer.
describe("the notification offer after a password sign-in", () => {
  afterEach(async () => {
    await cleanup();
    clearMobileQueryCache();
    await AsyncStorage.clear();
  });

  it("waits until «¿Entrar con Face ID?» is answered", async () => {
    const screen = await render(
      <MobileQueryProvider>
        <MobileIdentityProvider manager={manager}>
          <PushNotificationsProvider
            fetcher={fetcher}
            installationId={() => Promise.resolve("installation-1")}
            onOpen={jest.fn()}
            permissionReason="Te avisamos de lo que pase en el estudio."
            platform={platform}
          >
            <SignInThenHome />
            <BiometricOffer />
          </PushNotificationsProvider>
        </MobileIdentityProvider>
      </MobileQueryProvider>,
    );
    await waitFor(() => expect(screen.getByText("signed-out")).toBeOnTheScreen());
    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    });
    await waitFor(() => expect(platform.getPermissionStatus).toHaveBeenCalled());

    expect(screen.getByRole("header", { name: "¿Entrar con Face ID?" })).toBeOnTheScreen();
    expect(screen.queryByTestId("push-permission-sheet")).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: "Ahora no" }));
    });

    await waitFor(() => expect(screen.getByTestId("push-permission-sheet")).toBeOnTheScreen());
    expect(screen.queryByRole("header", { name: "¿Entrar con Face ID?" })).toBeNull();
  });
});
