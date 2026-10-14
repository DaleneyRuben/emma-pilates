import { libpqEnvironment } from './libpq-environment';

const production =
  'postgresql://avnadmin:p%40ss%2Fword@db.example.aivencloud.com:20680/emma' +
  '?sslmode=verify-full&sslrootcert=/etc/secrets/emma-ca.pem' +
  '&sslcert=/etc/secrets/emma-ca.pem&sslaccept=strict';

describe('libpq environment for pg_dump (EXT-009)', () => {
  it('splits the connection into libpq variables with the password decoded', () => {
    expect(libpqEnvironment(production, 'pilates-backup')).toEqual({
      PGHOST: 'db.example.aivencloud.com',
      PGPORT: '20680',
      PGUSER: 'avnadmin',
      PGPASSWORD: 'p@ss/word',
      PGDATABASE: 'emma',
      PGAPPNAME: 'pilates-backup',
      PGSSLMODE: 'verify-full',
      PGSSLROOTCERT: '/etc/secrets/emma-ca.pem',
    });
  });

  // libpq reads sslcert as a client certificate and refuses sslaccept, which
  // only Prisma's migration engine understands.
  it('leaves out the parameters only Prisma reads', () => {
    const environment = libpqEnvironment(production, 'pilates-backup');

    expect(environment).not.toHaveProperty('PGSSLCERT');
    expect(JSON.stringify(environment)).not.toContain('strict');
  });

  it('defaults the port and omits TLS settings and an empty password', () => {
    expect(
      libpqEnvironment(
        'postgres://rubendaleney@localhost/pilates_dev_sim',
        'pilates-backup',
      ),
    ).toEqual({
      PGHOST: 'localhost',
      PGPORT: '5432',
      PGUSER: 'rubendaleney',
      PGDATABASE: 'pilates_dev_sim',
      PGAPPNAME: 'pilates-backup',
    });
  });

  it('refuses a URL that is not PostgreSQL or names no database', () => {
    expect(() =>
      libpqEnvironment('mysql://user@localhost/emma', 'pilates-backup'),
    ).toThrow('DATABASE_URL must use the PostgreSQL protocol');
    expect(() =>
      libpqEnvironment('postgresql://user@localhost/', 'pilates-backup'),
    ).toThrow('DATABASE_URL must name a database');
  });
});
