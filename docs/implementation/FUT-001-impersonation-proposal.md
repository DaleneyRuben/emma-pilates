# FUT-001 — Administrator impersonation of a Staff Member

Status: **proposed 2026-10-22, decisions taken under the blanket approval; the
migration (I12) waits for the user's explicit approval.** The user asked on
2026-10-22 to build the item that
[ADR-0030](../adr/0030-use-opaque-server-side-authentication-sessions.md)
deferred («the model can support a future Administrator impersonation feature
through explicit server-side state»). The decision is recorded in
[ADR-0100](../adr/0100-impersonate-a-staff-member-from-the-staff-app.md).

The feature in one sentence: an Administrator, signed in to the Staff app,
sees and acts in it as one Trainer, Assistant, or Nutritionist for at most 30
minutes, with a banner on every screen, an exit, and audit records that name
both people.

What it is for: the owner reproduces what a Staff Member reports («no me sale
la clase de las 7», «no puedo cobrar en efectivo en Urubó») on her own phone,
without asking for the person's password (which nobody may know,
[ADR-0029](../adr/0029-manage-authentication-in-the-nestjs-backend.md)) and
without the Staff Member being present; and she covers a shift (the Assistant
is ill, a cash Payment must be recorded today) with the Role's own screens
instead of a workaround through the admin web.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | **Only an Administrator may impersonate.** Administrators already hold every Branch and every administrative command ([ADR-0054](../adr/0054-enforce-contextual-authorization-in-use-cases.md)); impersonation gives them a Role's *view*, not new authority. No other Role gains it, and there is no per-Account switch: the Role is the permission, as everywhere else.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| I2  | **Whom: one active Trainer, Assistant, or Nutritionist.** Never another Administrator (an Administrator acting as an Administrator would hide the real actor behind an identical set of rights for nothing), never a Client (the Client app is a separate application, [ADR-0085](../adr/0085-separate-client-and-staff-mobile-applications.md); Clients are the people the studio serves, and nothing in the backlog needs the studio to act inside their account; an Assistant already acts *for* a Client with their own identity), never a pending or deactivated Staff Member (they have no working Account, so there is nothing to see as).                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| I3  | **It starts in the Staff app, from the Administrator's own Perfil.** `S23` gains one menu row, «Ver la app como…», which opens the new picker `S24` listing the active Staff Members by Role; choosing one confirms in a sheet and the app re-renders as that Role. The admin web gets no entry: the Staff app is the only surface the impersonated Roles use, so the thing the Administrator wants to see exists only on the phone; the admin web cannot render it; and a hand-off from `AW24` into the phone would need the Administrator at both at once and a credential crossing from the browser's cookie to a mobile bearer, which [ADR-0030](../adr/0030-use-opaque-server-side-authentication-sessions.md) and [ADR-0084](../adr/0084-proxy-admin-api-requests-through-vercel.md) keep apart on purpose. Perfil rather than a header control, because this is an action on the Administrator's own session, `S11`'s header already carries two controls, and `S23` is where the session is managed (log out, change password). |
| I4  | **Representation: an Impersonation row tied to the Administrator's own mobile Authentication Session, same bearer credential.** `system.impersonation_sessions` records the Authentication Session, the Administrator's Account, the acting Staff Member, `started_at`, `expires_at` (start + 30 minutes, absolute, never extended by activity), `ended_at`, and the end reason. The app keeps sending the same credential; the principal resolver loads the session's one active Impersonation and, while it is unexpired, resolves the request to the acting Staff Member's Account, current Role, and current Branches, with `impersonation: { id, administratorAccountId }` beside it. One active Impersonation per Authentication Session (partial unique index), so «start another» is «exit first».                                                                                                                                                                                                                                                                                                                  |
| I5  | **While impersonating, the Staff Member's rights apply and the Administrator's do not.** Every use case sees a principal whose identity is the Staff Member's (Role and Branches from current data, as ADR-0054 already does for every request), so a Trainer's agenda shows her Sessions, an Assistant books only at her Branches, and `administrator/*` routes answer `403` like they would to her. Nothing in business code changes to make this true; that is the point of swapping the principal rather than adding a flag every rule must check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I6  | **Forbidden while impersonating, with `403 impersonation_forbidden`:** changing the password, requesting or cancelling an email change, «Cerrar sesión en otros dispositivos», registering or deactivating a push device (the Administrator's phone must never become the Staff Member's notification destination), marking the Staff Member's notifications read (reading them is allowed; their unread badge stays theirs), starting another Impersonation, and any command on the Administrator's own Account (unreachable anyway, since the principal is not hers). Account closure does not apply: Staff Members are never closed. Everything else the Role may do is allowed and audited with both names (I8): acting as the person is the feature.                                                                                                                                                                                                                                                                                                                                                                            |
| I7  | **Visible on every screen, time-boxed, ended by exit or logout.** A banner above the navigator on every screen reads «Viendo como Camila Rojas» over «Entrenadora · Quedan 28 min» with a «Salir» action. `Salir` ends the Impersonation (`exited`) and returns the Administrator to `S11` with the notice «Dejaste de ver la app como Camila Rojas.». At 30 minutes the app returns on its own with «Terminó el tiempo para ver la app como Camila Rojas.», and the backend treats the row as ended from `expires_at` on, whichever side notices first (`expired`). Logging out revokes the Administrator's Authentication Session and ends the Impersonation in the same transaction (`logged_out`). If the Staff Member is deactivated or becomes an Administrator meanwhile, or the Administrator's session is revoked by a password change or recovery, the next request ends it (`revoked`) and the app returns to Login or to `S11` as the session allows.                                                                                                                                                                 |
| I8  | **Audit: two codes and one column.** `impersonation.started` (actor the Administrator, target the Staff Member's `account`, metadata `staffMemberId`, `role`, `expiresAt`) and `impersonation.ended` (metadata `reason`, `durationSeconds`; actor the Administrator for `exited` and `logged_out`, `system` for `expired` and `revoked`). Every audit record written while impersonating carries the new `audit_records.impersonation_id`, so the record names the Administrator as actor (`actor_account_id`, `actor_role = administrator`) and, through the Impersonation row, the acted-as Staff Member; the catalog's per-code Actor column is unchanged in meaning because the actor really is the Administrator. Rows that are not audited (a Booking's `created_by`, Attendance's `recorded_by`) keep the Staff Member's Account, as the screen shows, and are attributed through the Impersonation's time window; the catalog says so.                                                                                                                                                                                 |
| I9  | **The impersonated Staff Member is told nothing.** The studio is small and the Administrator is the owner; a push or email per Impersonation would be noise with no action for the person, and would need a notification category ([ADR-0068](../adr/0068-enable-all-initial-notification-categories.md) fixes four) and an email template. The audit record is the record, readable through the [personal-data runbook](../runbooks/personal-data-requests.md) when a person asks. A later item may add «Administración vio la app como tú el 22/10 a las 10:15» to Perfil if the studio wants it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| I10 | **Mobile surface only.** `POST /impersonations` answers `403 impersonation_surface` to an admin-web session: the admin web has nothing to render as a Staff Member, and the browser's 30-minute idle session would end under the Impersonation anyway.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I11 | **The picker reuses the existing Staff directory.** `S24` lists `GET /administrator/staff-members?status=active&pageSize=100`, filtered on the phone to the three impersonable Roles, grouped by Role, without a search field: the studio has a handful of Staff Members. The Administrator's own row never appears (I2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I12 | **Schema (needs migration approval):** the `impersonation_sessions` table, its `ImpersonationEndReason` enum, and the nullable `audit_records.impersonation_id`. Detailed below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Alternatives considered

- **A second Authentication Session for the acting identity** (a new bearer
  credential returned to the app). Rejected: the app would hold two
  credentials and have to switch them per request, logout would have to
  revoke both, and revoking the Administrator's session would not end the
  Impersonation by itself. One credential with server-side state does all of
  that with the existing revocation paths.
- **A client-side role switch** (the app renders the Trainer's stack with the
  Administrator's credential). Rejected: authorization is default-deny in the
  backend ([ADR-0054](../adr/0054-enforce-contextual-authorization-in-use-cases.md));
  the Administrator would see her own data under a Trainer's screens, not the
  Trainer's.
- **An `Impersonate-As` request header** checked per request. Rejected: no
  server-side time box, no single exit, no row to hang audit records from,
  and every request would have to prove the header's target again.
- **An admin-web entry on `AW24`** that opens the Staff app with a one-time
  link. Rejected (I3): a browser-to-phone credential crossing that the
  session design keeps apart, for a flow the phone can start in two taps.
- **An idle-extended lifetime** like the sessions'. Rejected: impersonation is
  a support action with a known end, not a work mode; a hard 30 minutes
  matches the admin web's idle limit for sensitive work and keeps the banner's
  countdown honest.
- **Telling the Staff Member** by push or email (I9). Deferred, not rejected.

## Schema and migration (I12, needs approval)

One migration, `20261022000000_impersonation_sessions`, on the `system`
schema:

```prisma
enum ImpersonationEndReason {
  EXITED     @map("exited")
  EXPIRED    @map("expired")
  LOGGED_OUT @map("logged_out")
  REVOKED    @map("revoked")

  @@schema("system")
}

model ImpersonationSession {
  id                      String                  @id @default(uuid()) @db.Uuid
  authenticationSessionId String                  @map("authentication_session_id") @db.Uuid
  administratorAccountId  String                  @map("administrator_account_id") @db.Uuid
  staffMemberId           String                  @map("staff_member_id") @db.Uuid
  startedAt               DateTime                @map("started_at") @db.Timestamptz(3)
  expiresAt               DateTime                @map("expires_at") @db.Timestamptz(3)
  endedAt                 DateTime?               @map("ended_at") @db.Timestamptz(3)
  endReason               ImpersonationEndReason? @map("end_reason")
  deletedAt               DateTime?               @map("deleted_at") @db.Timestamptz(3)
  authenticationSession   AuthenticationSession   @relation(fields: [authenticationSessionId], references: [id], onDelete: Restrict)
  administratorAccount    Account                 @relation("ImpersonationAdministrator", fields: [administratorAccountId], references: [id], onDelete: Restrict)
  staffMember             StaffMember             @relation(fields: [staffMemberId], references: [id], onDelete: Restrict)
  auditRecords            AuditRecord[]

  @@index([administratorAccountId, startedAt])
  @@index([staffMemberId, startedAt])
  @@map("impersonation_sessions")
  @@schema("system")
}
```

Plus, on `AuditRecord`, `impersonationId String? @map("impersonation_id")
@db.Uuid` with a `RESTRICT` relation and an index, and the back-relations on
`AuthenticationSession`, `Account`, and `StaffMember`.

Hand-written SQL in the migration, as the soft-delete and check rules ask:

- a partial unique index `impersonation_sessions_one_active_per_session` on
  `(authentication_session_id) WHERE ended_at IS NULL AND deleted_at IS NULL`,
  so a session holds at most one active Impersonation and a repeated `POST`
  fails on the index instead of creating a second row;
- a check `impersonation_sessions_end_reason_with_ended_at`:
  `(ended_at IS NULL) = (end_reason IS NULL)`;
- a check `impersonation_sessions_expires_after_start`: `expires_at >
  started_at`.

Impact: three new objects in `system`, one nullable column on an existing
table with no backfill, every foreign key `ON DELETE RESTRICT`
([ADR-0086](../adr/0086-soft-delete-every-database-row.md)), no data touched.
`audit_records`' append-only triggers are unchanged: the new column is
written at insert time like the others. The cross-schema foreign key to
`booking.staff_members` follows `audit_records.branch_id`'s precedent. The
migration is reversible by dropping the column and the table; nothing in the
known-drift file changes.

## API (stage 2)

| Endpoint                                   | Who                                           | Answers                                                                                                                                                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/v1/impersonations` `{ staffMemberId }` | An Administrator on a mobile session   | `201` with the Impersonation (`id`, `staffMemberId`, `staffMemberName`, `role`, `expiresAt`); `404 staff_member_not_found`; `409 staff_member_not_impersonable` (an Administrator, pending, or deactivated); `409 impersonation_active`; `403 impersonation_surface` from the admin web; `403` for every other Role |
| `DELETE /api/v1/impersonations/current`    | The impersonating session                     | `204`; `404 impersonation_not_active`                                                                                                                                                                                                                                                             |
| `GET /api/v1/authentication-sessions/current` | Any session                                | Unchanged shape plus an optional `impersonation` object (`id`, `staffMemberName`, `role`, `expiresAt`); the `identity` is the acting Staff Member's while impersonating. Additive, so the previous mobile release ([ADR-0016](../adr/0016-support-current-and-previous-mobile-releases.md)) is unaffected |
| The commands in I6                         | Any impersonating session                     | `403 impersonation_forbidden`                                                                                                                                                                                                                                                                     |

No `Idempotency-Key` on `POST /impersonations`: a retry hits the partial
unique index and answers `409 impersonation_active`, which the app treats as
success by re-reading the current session.

Principal resolution: `resolveAuthenticatedPrincipal` loads the session with
its active Impersonation in the same query; an unexpired one swaps the
identity (I4, I5) and an expired one is ended there (`expired`) before the
request continues as the Administrator. `AuthenticatedPrincipal` gains
`impersonation?: { id: string; administratorAccountId: string }`, and one
helper, `auditActorOf(principal)`, gives every audit writer the actor to
record (I8), so the writers change in one place each.

## Mobile (stage 3)

- `MobileSession` gains `impersonation?: { id, staffMemberName, role,
  expiresAt }`; the Staff app's `role` is the acting Role, so the existing
  `roleNavigation[role]` renders the Staff Member's stack with no new
  navigator.
- `S23` (Administrator only) gains the «Ver la app como…» row → `S24`.
- `S24`: the grouped list (I11), a confirmation sheet, then `POST` and a
  re-read of the current session.
- The banner (I7) lives in `StaffNavigation` above the navigator, so every
  screen of every stack carries it; `Salir` calls `DELETE` and re-reads the
  session; a timer at `expiresAt` does the same with the expiry notice.
- `StaffPushNotifications` does not register the device while
  `impersonation` is set (I6), and the Administrator's own registration is
  left as it was.
- Maestro: `administrator-view-as.yaml` (Paola → Perfil → Ver la app como… →
  Emma Vargas → her agenda with the banner → Salir → `S11`).

## Design

- Full prompt [`staff/24-administrator-view-as.md`](../design/prompts/staff/24-administrator-view-as.md)
  for the new picker `S24`.
- Follow-up [108](../design/prompts/followups/108-impersonation-entry-and-banner.md)
  for `S23`'s row, the banner on `S02`/`S04`/`S15` (the three roots an
  impersonated Role lands on; `S11` is never seen while impersonating, since
  Administrators are never impersonated), the design-system card, and the
  README.

## Stages

1. **This proposal** (branch `feature/fut-001-impersonation-proposal`): the
   decisions, ADR-0100, the glossary, the planned catalog rows, the prompts,
   and the design export. Ends by asking for the migration's approval.
2. **Backend**: the migration (after approval), the commands, the resolver,
   the guards, audit, expiry, e2e and integration specs, OpenAPI regenerated.
3. **Staff app**: `S24`, the banner, the exit, the Maestro flow, verified on
   the iPhone 16 Pro, the iPad Pro 11, and the Android emulator.

## Open questions, deferred

- Should the Staff Member later see «Administración vio la app como tú» in
  Perfil (I9)?
- Should an Impersonation be allowed to outlive the app being backgrounded
  for more than a few minutes, or end when the app returns? Today it runs to
  its 30 minutes or the exit, whichever comes first.
