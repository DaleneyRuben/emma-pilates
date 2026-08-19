# Delegate authentication to a managed identity provider

Status: superseded by [ADR-0029](./0029-manage-authentication-in-the-nestjs-backend.md)

A managed identity provider will verify credentials, issue and refresh session tokens, and run password-recovery flows. The modular monolith will validate the provider's tokens and map the provider subject to the system Account established in [ADR-0009](./0009-separate-system-account-from-domain-identities.md).

The provider owns authentication mechanics only. The application owns Accounts, Client and Staff Member links, Staff Roles, Branch assignments, and every authorization decision. Provider roles or custom claims are not the source of truth for domain permissions because those permissions change with application data and must be enforced consistently inside use cases.

This avoids implementing and operating password hashing, credential-recovery tokens, session revocation, and recovery-message delivery in the application. It also keeps provider-specific concepts at the system boundary: domain modules receive an authenticated Account identifier rather than provider tokens or SDK types.

The provider is intentionally not selected by this decision. Provider choice depends on the backend and hosting stack and can change without changing the Account or authorization model.
