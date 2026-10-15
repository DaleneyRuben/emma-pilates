// Expo replays the last token to every new listener and emits again whenever
// the token is fetched, so only a different token is a change worth a sync.
export function onlyChangedTokens(listener: () => void): (token: string) => void {
  let last: string | null = null;

  return (token) => {
    if (token === last) return;
    last = token;
    listener();
  };
}
