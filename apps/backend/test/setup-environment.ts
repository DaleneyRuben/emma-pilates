// The HTTP suite never opens PostgreSQL: the URL below reaches nothing on
// purpose, and a DATABASE_URL exported by the shell must not replace it.
process.env.DATABASE_URL =
  'postgresql://nobody@127.0.0.1:1/pilates_e2e_unreachable';
process.env.NODE_ENV = 'test';
// Application modules boot as they do for the offline OpenAPI generator: the
// pg-boss factories return a stub instead of opening the job runtime.
process.env.OPENAPI_GENERATION = 'true';
