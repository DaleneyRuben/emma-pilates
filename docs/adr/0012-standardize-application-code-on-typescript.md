# Standardize application code on TypeScript

Status: accepted

The backend, role-routed mobile app, and admin web app will be implemented in TypeScript. This gives the team one language across all application surfaces and supports consistent tooling, generated API types, validation, and testing.

TypeScript types are not a substitute for runtime validation or database constraints. Every external input is validated at its boundary, and PostgreSQL continues to enforce persistence invariants that must survive concurrent requests. Types shared with clients describe the public API contract; they do not expose backend domain entities or make client code part of a backend module.

The main tradeoff is giving up languages with stronger compile-time domain modeling or more mature concurrency primitives on the backend. At this system's scale, the operational and development simplicity of one language across a small team outweighs that benefit, provided the codebase keeps domain rules inside explicit modules and uses database transactions deliberately.

This decision does not choose the backend, mobile, or web frameworks, package manager, or repository layout.
