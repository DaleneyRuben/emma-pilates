# A Session owns its duration, not its Class Type

Status: accepted (2026-10-16)

A Class Type used to carry `durationMinutes`, and every Session and Session Schedule took its length from it. The studio runs the same kind of class at different lengths, so the owner decided that how long a class lasts is chosen when the class is scheduled: a one-off Session and each weekly row of a Session Schedule carry their own duration, and a Class Type has none. The admin web prefills 60 minutes and the Administrator changes it when needed.

A Session already stores `starts_at` and `ends_at`, so its duration is `ends_at − starts_at` and needs no column. `booking.session_schedules` gains a required `duration_minutes`, backfilled from each schedule's Class Type at migration time so nothing generated changes. `booking.class_types.duration_minutes` becomes nullable and is no longer written or read for scheduling; it is dropped once no supported mobile release reads it.

Compatibility: released apps show `classType.durationMinutes` on the Session detail. The field stays in the responses, deprecated: where it describes a Session it carries that Session's real length, and on the catalog it carries the legacy stored value, or 60 when there is none. New app builds read the Session's start and end instead.
