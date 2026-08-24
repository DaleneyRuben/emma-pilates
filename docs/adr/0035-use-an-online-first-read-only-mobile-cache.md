# Use an online-first read-only mobile cache

Status: accepted

The initial mobile application will be online-first and may show an Account-scoped, persisted read-only cache when connectivity is unavailable. Recently loaded Session schedules, the signed-in Client's upcoming Bookings, and the minimum Subscription status and remaining allowance needed to understand those Bookings may remain available with a visible offline state and last-updated time.

Every operation that changes backend state requires connectivity. Creating, cancelling, or rescheduling a Booking, joining or leaving a Waitlist, recording Attendance, creating or confirming a Payment, changing Account data, and uploading an image are never queued locally and must not present success until the backend accepts them. Reconnection triggers revalidation of visible cached queries before the app treats them as current.

Persisted query data must be isolated by Account and cleared on logout or Account change. Transfer-receipt images, Evaluation details, payment-review data, staff or Client directories, and Back Office data are excluded from the initial offline cache. Because an offline device cannot discover server-side revocation immediately, local access ends when the stored Authentication Session is removed or reaches its locally known absolute expiration, and the cache remains deliberately limited even before then.

A strictly online application was rejected because temporary connectivity loss should not erase basic schedule and upcoming-Booking visibility. A full offline-first model and selective queued Attendance were rejected for the initial release because stale Session capacity, Subscription eligibility, authorization, and concurrent changes require conflict and idempotency behavior that the project does not yet need. Offline Attendance may be reconsidered if measured studio connectivity makes it operationally necessary.

This decision does not select the persistence library, at-rest protection, cache lifetime, storage quotas, or exact query serialization. Those implementation policies must preserve this allowlist rather than persisting the entire TanStack Query cache indiscriminately.
