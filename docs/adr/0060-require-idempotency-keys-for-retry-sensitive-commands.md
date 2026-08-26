# Require idempotency keys for retry-sensitive commands

Status: accepted

Authenticated commands whose retry could create a duplicate effect require an `Idempotency-Key` request header. The mobile app, admin web, or generated client creates one random UUID for the user's intended action and reuses it only when retrying that same action. Initial examples include creating a Booking or Waitlist entry, submitting or recording a Payment, and finalizing an upload. Simple edits and commands already addressed to one uniquely identified state transition do not require the header merely for consistency.

The backend scopes a key to the authenticated Account and command, hashes the relevant request input, and stores the completed outcome in PostgreSQL with the business transaction. A retry with the same key and equivalent input returns the original status and representation without executing the use case again. Reusing the key with different input returns RFC 9457 conflict details with a stable project code. Concurrent requests using the same key cannot both execute the protected effect.

Each protected endpoint declares the header in its code-first OpenAPI contract, and contract tests cover first execution, exact replay, conflicting reuse, and concurrent submission. Records are retained for at least that command's supported client-retry window and then removed by routine cleanup; the default retention and any per-command exception are set during implementation. Database constraints and domain invariants remain necessary because an idempotency key handles retries, not every possible duplicate business request.

Requiring keys for every mutation was rejected because it would add storage and client state to ordinary updates without a duplicate-effect risk. Depending only on disabled buttons or uniqueness constraints was rejected because a client that loses a successful HTTP response must be able to retry safely and receive the result of the original action.
