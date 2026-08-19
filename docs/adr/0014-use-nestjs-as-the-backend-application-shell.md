# Use NestJS as the backend application shell

Status: accepted

The backend will use NestJS. Booking & Membership, Back Office, and system identity are separate top-level Nest modules, matching the ownership boundaries in [CONTEXT-MAP.md](../../CONTEXT-MAP.md) and the PostgreSQL schemas selected in [ADR-0011](./0011-use-postgresql-with-schema-per-bounded-context.md).

Each top-level module exports a small application-facing interface. Controllers, guards, dependency wiring, configuration, and transport concerns use NestJS directly; domain rules and state transitions remain plain TypeScript wherever framework integration adds no value. A module must not reach into another module's repositories or internal providers. Cross-module writes call the owning module's exported application service.

NestJS was selected because its module system encapsulates providers by default and makes exported providers an explicit module interface. Its guards and request lifecycle also provide a consistent place for authentication and coarse authorization before application use cases enforce domain-specific rules.

A lighter HTTP framework would reduce framework concepts and decorator use, but would require the project to design and maintain its own module wiring, authorization pipeline, validation conventions, and application structure. For this system, NestJS's structural conventions support the modular-monolith boundary more than that flexibility would.

This decision does not require domain entities to use decorators or inherit from framework classes, and it does not select a persistence library or HTTP API style.
