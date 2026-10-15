export function onlyChangedTokens(listener: () => void): (token: string) => void {
  return () => listener();
}
