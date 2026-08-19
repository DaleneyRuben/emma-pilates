# Use Vite, React, and TanStack Router for the admin web app

Status: accepted

The separate admin web application established in [ADR-0008](./0008-one-role-routed-mobile-app-and-admin-web.md) will be a TypeScript single-page application built with Vite and React, with TanStack Router owning its route tree. The production build will consist of static browser assets and will not introduce a web-rendering server alongside the NestJS backend.

The admin surface has many authenticated, data-heavy screens whose table filters, pagination, sorting, selected tabs, and report criteria should be validated, type-safe, and representable in the URL when they need to survive refreshes or be shared. TanStack Router makes route parameters and structured search state first-class TypeScript boundaries, supports route-level code splitting and data-loading coordination, and can consume the generated REST client required by [ADR-0018](./0018-use-rest-with-an-openapi-contract.md) without owning server-state caching itself. Vite supplies a focused development and static-build toolchain without adding a second application-server model.

React Router Framework Mode was considered because it has a mature ecosystem, typed route modules, and automatic code splitting. TanStack Router was selected because its validated, typed search-parameter model is a stronger fit for the admin application's filter- and report-heavy workflows. Next.js App Router was rejected because its server components and server functions would introduce an additional server-side boundary whose main benefits are not needed by this authenticated application; using it only as a static SPA would retain much of that framework's conceptual surface without using its strengths.

This decision selects TanStack Router, not TanStack Start or TanStack Query. It does not select the component library or design-system implementation, form and runtime-validation libraries, server-state caching, local client-state management, authentication SDK, web testing tools, hosting provider, or deployment topology.
