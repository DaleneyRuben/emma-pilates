# Use Bolivia time for all business scheduling

Status: accepted

The initial system has one business time zone, the IANA zone `America/La_Paz`, for every Branch and application surface. Session and Evaluation schedules, Cancellation Windows, calendar-month limits, Subscription dates, reports, reminders, and other business rules are interpreted in Bolivia civil time. A Branch does not store its own time zone, and mobile or web clients do not silently convert studio schedules to the device's local zone when a person travels.

Concrete moments such as Session starts, audit timestamps, token expirations, and job run times are stored in PostgreSQL as timezone-aware instants and exchanged through the API as ISO 8601 UTC instants. The backend converts them to and from `America/La_Paz` at the business boundary; using UTC for an exact stored or transmitted instant does not create a second business time zone. Calendar-only values use PostgreSQL `date` and `YYYY-MM-DD`, while recurring schedule definitions use a local date or weekday and wall-clock time with the single Bolivia zone implied.

This is simpler than assigning a time zone to each Branch and matches the requirement that the studio operates in Bolivia. Storing naive local timestamps was rejected because expirations, ordering, delayed jobs, and integrations still require unambiguous instants. If the business opens a Branch outside Bolivia, this decision must be revisited before that Branch is created, including a migration to explicit per-Branch IANA zones and tests for the affected schedules.
