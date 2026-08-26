# Retain failed jobs for thirty days

Status: accepted

Jobs that exhaust their retries or fail permanently remain available in pg-boss for 30 days. The failed record contains the minimized job payload, attempt history, timestamps, job family and version, and a structured sanitized failure category; it never adds secrets, provider credentials, usable authentication links, or raw sensitive provider responses for diagnosis. Access is restricted to operational maintainers rather than exposed through the normal mobile or admin product interfaces.

An operator may deliberately replay a failed job only after investigating or correcting its cause. Replay creates a traceable new attempt linked to the original failure and passes through the same authorization-independent applicability checks, idempotency protection, current-state reload, and retry policy as ordinary execution. Replaying a stale or already-completed action therefore remains a successful no-op. Replay and discard actions are audit recorded when they affect security-sensitive, financial, or administrative work.

After 30 days, automated cleanup removes the failed payload and attempt details; aggregate metrics and any independently required business or audit record remain. Keeping failed jobs indefinitely was rejected because it would grow PostgreSQL and retain potentially sensitive operational data without a durable purpose. Deleting them immediately and relying only on logs was rejected because it would make diagnosis and controlled recovery unnecessarily difficult.
