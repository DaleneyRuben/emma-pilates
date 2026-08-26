# Monitor workers with actionable signals

Status: accepted

The initial production system uses a minimal layered monitoring baseline rather than logs alone or a full observability platform. The worker emits structured, sanitized logs and measurements for job family, attempt, duration, outcome, failure category, queue depth, age of the oldest ready job, and reconciliation completion. It also maintains a heartbeat that distinguishes a running process from one that is actually making progress. Logs and measurements contain identifiers needed for correlation, never complete job payloads, credentials, tokens, or sensitive business content.

Alerts cover only conditions that require action: a stale worker heartbeat, a queue item older than its job-family threshold, new exhausted or permanent failures, and a reconciler missing its allowed execution window. Alerts are deduplicated, rate limited, and followed by a recovery notice. Service-liveness alerts use the hosting platform or another monitor outside the worker, and the alert route must not depend solely on the pg-boss worker it is reporting. Exact thresholds and the initial free monitoring integration are selected and tested during deployment configuration.

Logs without alerts were rejected because failures could remain unnoticed until a user reports a missed reminder or notification. A full metrics, tracing, dashboard, and on-call platform was rejected for the initial release because the small system first needs reliable detection of a few known failure modes; richer observability can be added when traffic or operating experience justifies it.
