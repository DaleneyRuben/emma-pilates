# Use Jest, Supertest, and Testcontainers for backend tests

Status: accepted

The backend will use Jest as its TypeScript test runner, Nest's `@nestjs/testing` utilities for module and application wiring, Supertest for HTTP behavior, and Testcontainers for integration tests against a disposable PostgreSQL instance. This keeps one unit-test vocabulary across the backend, mobile, and admin web while following NestJS's supported testing model and exercising Prisma against the same database engine used in production.

Framework-light domain rules and application decisions should be instantiated directly in fast unit tests without booting Nest. Nest testing modules are reserved for behavior that depends on dependency injection, controllers, guards, pipes, filters, interceptors, or module wiring. Supertest exercises the running Nest application through `/api/v1`, including RFC 9457 errors, authentication and authorization behavior, and transport compatibility where appropriate.

Prisma repository, migration, transaction, constraint, PostgreSQL-specific query, and pg-boss integration tests use temporary PostgreSQL databases created through Testcontainers. Tests must apply the committed migrations. They must never use a developer's persistent local database, the shared development database, or production; a CI database must be disposable and owned by the test run. SQLite substitutes and mocked Prisma clients were rejected for integration coverage because they cannot verify PostgreSQL semantics or the generated database artifacts the application will actually deploy.

The project accepts that these database tests require a compatible container runtime and are slower than isolated unit tests. Testcontainers should be shared at the narrowest safe suite scope rather than starting a database for every test. Fixture construction, database reset and parallel-isolation strategy, OpenAPI compatibility automation, and bounded-context import enforcement remain separate testing and scaffolding decisions.
