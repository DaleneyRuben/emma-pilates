import {
  type AuthenticationLinkIntent,
  type LinkIdentityKind,
  parseVerifiedLink,
} from "./verified-link";

export type LinkSource = {
  addEventListener: (
    event: "url",
    listener: (event: { url: string }) => void,
  ) => { remove: () => void };
  getInitialURL: () => Promise<string | null>;
};

type VerifiedLinkIngressOptions = {
  allowedHosts: readonly string[];
  identityKind: LinkIdentityKind;
  onIntent: (intent: AuthenticationLinkIntent) => void;
  source: LinkSource;
};

export function subscribeToVerifiedLinks({
  allowedHosts,
  identityKind,
  onIntent,
  source,
}: VerifiedLinkIngressOptions): () => void {
  function deliver(url: string | null): void {
    if (url === null) {
      return;
    }

    const intent = parseVerifiedLink(url, allowedHosts, identityKind);

    if (intent !== null) {
      onIntent(intent);
    }
  }

  const subscription = source.addEventListener("url", ({ url }) => {
    deliver(url);
  });

  void source
    .getInitialURL()
    .then(deliver)
    .catch(() => undefined);

  return () => subscription.remove();
}
