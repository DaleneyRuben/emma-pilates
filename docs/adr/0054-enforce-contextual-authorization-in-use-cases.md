# Enforce contextual authorization in use cases

Status: accepted

The backend will authorize every application command and query with fixed Roles plus contextual rules. Authentication resolves the current Account and its linked Client or Staff Member from current server-side data. A Staff Member's single Role defines the general actions they may perform, while the use case also enforces the relevant Branch assignment, resource ownership, or operational relationship. Administrators implicitly cover every Branch; the narrower rules for Clients, Trainers, Nutritionists, and Assistants remain those defined by the owning bounded context.

Authorization is default-deny and enforced in the NestJS application layer, not delegated to the mobile app, admin web, or generated API client. Transport guards may reject unauthenticated Accounts or obviously incompatible Roles early, but the owning use case makes the final decision so the same rule applies to HTTP, jobs, and future entrypoints. Reads are scoped to authorized records at the repository boundary, and writes load or identify the protected resource before applying the rule. Hiding a screen or button is only a user-experience aid and never grants authority.

Each use case must name its allowed Role and contextual constraints and cover allowed and denied cases in tests. This keeps the authorization matrix close to executable behavior instead of creating configurable permissions in PostgreSQL or an administration interface. Because opaque Authentication Sessions carry no authorization claims, changes to a Staff Member's Role or Branch assignments take effect from current backend data without waiting for session renewal.

Pure Role checks were rejected because they cannot express rules such as a Trainer recording Attendance only for their own Session or an Assistant operating only in assigned Branches. A general policy engine and administrator-configurable permissions were rejected because the first release has four stable Staff Roles and clear domain relationships; the extra policy language, storage, and management surface would add complexity without a current requirement.
