// A generated query resolves every HTTP status as data. Treating anything
// other than 200 as a failure makes the screen's Reintentar refetch it.
export function requireOk<T extends { status: number }>(response: T, message: string): Promise<T> {
  if (response.status !== 200) {
    return Promise.reject(new Error(message));
  }
  return Promise.resolve(response);
}
