# Allowlist collection filters and sorts

Status: accepted

Every collection endpoint explicitly defines the filters and sort orders required by its user journeys. Filters use ordinary, typed query parameters such as status, Branch, or date range; sorting uses a documented set of named choices, including direction where useful. NestJS code-first OpenAPI publishes those choices, and Orval generates matching client types. Exact filters and sorts are added only when a mobile or admin workflow needs them.

The backend rejects unknown filter fields, unsupported operators, and invalid sort choices with RFC 9457 Problem Details instead of silently ignoring them. It maps accepted choices to parameterized, context-owned repository queries; clients can never supply database column names or arbitrary query expressions. Authorization and Branch scope are enforced independently and cannot be widened through a filter. Filters and sorting are applied before the endpoint's pagination, and every sort has the deterministic unique-identifier tie-breaker required by [ADR-0061](./0061-use-contextual-pagination-styles.md).

A generic filtering language was rejected because its parsing, validation, authorization, performance, and client complexity are unnecessary for two first-party clients. Creating a separate endpoint for every filter combination was rejected because combinations would multiply endpoints and duplicate query behavior.
