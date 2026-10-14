export const libpqEnvironment = (
  databaseUrl: string,
  applicationName: string,
): Record<string, string> => {
  throw new Error(`not implemented: ${databaseUrl.length} ${applicationName}`);
};
