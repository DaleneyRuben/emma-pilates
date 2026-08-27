# Separate health and deployment checks

Status: accepted

The API exposes unauthenticated operational endpoints that reveal no configuration or dependency details. Its liveness check reports only whether the process and event loop are running; it does not query PostgreSQL or an external provider. Its readiness check uses short timeouts to confirm the process is accepting work, required startup initialization succeeded, PostgreSQL is reachable, and the deployed schema is compatible. Readiness fails during graceful shutdown. Email, push, and object-storage availability do not gate all API traffic and therefore are monitored separately rather than included in readiness.

Northflank uses liveness to restart a stuck API process and readiness to decide whether it may receive traffic. The worker is monitored through its progress heartbeat, queue-age signals, and external service-liveness checks under [ADR-0066](./0066-monitor-workers-with-actionable-signals.md); it does not pretend that a successful process check proves jobs are advancing.

After a production deployment, GitHub Actions performs non-mutating smoke checks against the production API and admin web and verifies the expected release identifier. The backend release also requires the worker heartbeat to advance for the deployed revision before the workflow reports success. A failed smoke check marks the release unsuccessful and alerts the operator; it never runs a destructive synthetic booking, Payment, or other business command. Recovery follows the separately defined rollback and incident policy because an applied database migration cannot be blindly reversed.

One dependency-heavy health endpoint was rejected because a PostgreSQL outage could trigger a restart loop without repairing the database. Process checks alone were rejected because a running API can still be unable to serve traffic, and a running worker can still be stalled. Manual post-deployment checking was rejected because it is easy to skip and cannot reliably prove which revision is serving.
