# Use bounded retry policies by job family

Status: accepted

Background jobs use a small, centrally defined set of retry and execution-timeout presets chosen by failure mode rather than one global policy or arbitrary settings per job. External-delivery jobs such as email and push notifications retry only temporary network, timeout, rate-limit, and provider-server failures with bounded exponential backoff and jitter, honoring a provider's longer `Retry-After` instruction when safe. Short internal jobs use a tighter bounded policy for transient infrastructure failures. Reconcilers continue on their next scheduled scan instead of creating unbounded retries for one scan.

Validation, authorization, unsupported input, missing configuration, provider authentication, and other permanent failures stop immediately. Stale or already-completed work remains a successful no-op under [ADR-0024](./0024-use-pg-boss-for-durable-background-jobs.md). Every job family declares a hard execution timeout, maximum attempts, backoff preset, and retryable failure categories in the worker's typed job definition. No handler may run or retry indefinitely. Exact preset values are selected with each integration and tested; a more specific accepted policy, including the authentication-email timings in [ADR-0031](./0031-use-sendpulse-for-transactional-email.md), overrides the general preset.

One global retry policy was rejected because provider delivery, short internal work, and recurring reconciliation fail and recover differently. Infinite retry was rejected because permanent failures would consume capacity indefinitely and conceal the need for operational intervention. Fully custom settings for every job were rejected because they would drift and make production behavior difficult to understand.
