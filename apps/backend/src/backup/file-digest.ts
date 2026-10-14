export const describeFile = (
  path: string,
): Promise<{ size: number; sha256: string }> =>
  Promise.reject(new Error(`not implemented: ${path}`));
