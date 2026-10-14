// pg_dump cannot take DATABASE_URL as it is: the URL also carries Prisma's
// sslcert and sslaccept, which libpq reads as a client certificate and
// refuses. These variables keep only what libpq needs, and the password stays
// out of the command line (EXT-009).
export const libpqEnvironment = (
  databaseUrl: string,
  applicationName: string,
): Record<string, string> => {
  const url = new URL(databaseUrl);
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol');
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (database === '') {
    throw new Error('DATABASE_URL must name a database');
  }

  const optional = (name: string, value: string | null) =>
    value === null || value === '' ? {} : { [name]: value };

  return {
    PGHOST: url.hostname,
    PGPORT: url.port === '' ? '5432' : url.port,
    PGUSER: decodeURIComponent(url.username),
    ...optional('PGPASSWORD', decodeURIComponent(url.password)),
    PGDATABASE: database,
    PGAPPNAME: applicationName,
    ...optional('PGSSLMODE', url.searchParams.get('sslmode')),
    ...optional('PGSSLROOTCERT', url.searchParams.get('sslrootcert')),
  };
};
