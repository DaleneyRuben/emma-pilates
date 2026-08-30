# Store focused audit records in PostgreSQL

Status: accepted

The backend will write dedicated, append-only PostgreSQL audit records for security-sensitive and materially important administrative actions. The initial catalog includes password recovery or replacement, Account and Authentication Session revocation, Account enablement or disablement, Role and Branch-access changes, and sensitive financial or operational mutations such as Payment decisions and staff-management actions. Each new use case must explicitly decide whether it belongs in this catalog; ordinary reads, routine low-risk Client activity, and indiscriminate database changes are not audited.

An audit record contains a stable action code, timestamp, outcome, actor Account and effective Role when available, target type and identifier, relevant Branch identifier, request correlation identifier, and only the minimal metadata needed to understand the event. It must never contain passwords, usable session or email-link credentials, uploaded file contents, or broad snapshots of personal data. Operational logs remain separate and are not the source of truth for this history.

A successful sensitive state change and its audit record are committed in the same PostgreSQL transaction; if the audit insert fails, the state change fails too. Selected security outcomes that do not accompany a state change may append their own record. Application database permissions allow inserting and reading authorized audit data but not updating an existing record. Retention duration, archival, and the Administrator-facing audit viewer remain later data-governance and product decisions.

Auditing every database write was rejected because it would collect noisy and potentially sensitive data without explaining business intent. Relying only on application or provider logs was rejected because rotating diagnostic logs do not provide a durable, queryable history of who performed an important action.
