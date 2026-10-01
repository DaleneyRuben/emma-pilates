# WEB-012 — Staff invitation commands for AW24

Status: **decided 2026-10-01 under the blanket backlog-decision approval**
(the user asked for a short proposal before any new backend endpoint and
delegated the open decisions).

## Problem

AW24 (follow-ups 35–36, DES-001 export `4ba4eeb`) draws the pending Staff
invitation with «Cambiar correo», «Reenviar enlace», and «Cancelar invitación»
(with a confirmation), a notice when the same email in «Nuevo miembro» reopens
a pending invitation, a dedicated conflict when the email belongs to a Client,
and the server's retry time on a limited resend. The backend has only
`POST /administrator/staff-members/{id}/activation-link` (resend), answers
every taken address with `email_in_use`, and sends `email_throttled` without a
wait. The Client side already has the equivalent commands (MOB-021, IDN-005).

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| W1 | `POST /api/v1/administrator/staff-members/{staffMemberId}/email-corrections` `{ email }` changes a **pending** Staff Member's Account email, invalidates every unused Activation Link, issues a new 7-day link to the new address, and restarts the 30-day pending window. It answers the updated `StaffMemberDto`. | ADR-0029: correcting a pending Account's email is allowed and only the newest link may succeed; mirrors `correctClientInvitationEmail`. |
| W2 | W1 refuses an activated or deactivated member with `409 staff_member_not_pending`, the member's own current address with `400 email_unchanged`, an address of any other live Account with `409 email_in_use`, or of a Client Account with `409 email_belongs_to_client` (W5). | Nothing to correct after activation; the email index is unique. |
| W3 | `POST /api/v1/administrator/staff-members/{staffMemberId}/invitation-cancellation` (`204`) removes a **pending** Staff Member: every unused link is invalidated and the Account and Staff Member are marked removed (`deleted_at`, ADR-0086, through `removePendingAccount`), which frees the address and drops the member from Personal. Activated or deactivated members get `409 staff_member_not_pending`; deactivation stays the way to remove an active member. | AW24's «Cancelar invitación»: «no es desactivar a un miembro activo». Soft delete only. |
| W4 | `POST /administrator/staff-members` with the email of a **pending Staff invitation** reopens it: a new 7-day link, a restarted 30-day window, and no change to name, phone, Role, or Branches. It answers `201` with the existing member and `invitationReopened: true` (absent or `false` otherwise). | AW24 «ya estaba pendiente»: «su rol y sus sucursales no cambiaron». An optional field keeps older admin builds working. |
| W5 | The same create answers `409 email_belongs_to_client` when the address belongs to a Client Account (pending or active), and keeps `409 email_in_use` for an active or deactivated Staff Member. | AW24's «Este correo pertenece a una cuenta de clienta». The caller is an authenticated Administrator, so naming the kind of Account is allowed (ADR-0029 keeps neutrality for the public flows only). |
| W6 | Every staff command that may send an Activation email (create, reopen, resend, email correction) answers a full recipient lane with `429 email_throttled` and `Retry-After` in seconds, computed from the same ADR-0029 recipient limits (`authenticationEmailWaitSeconds`, MOB-021). | ADR-0029: «An authenticated staff interface may state that the selected pending Account's resend is limited and show when it can be retried.» |
| W7 | Audited like the existing staff actions: `staff_member.email_corrected` (metadata `previousEmail`), `staff_member.invitation_cancelled` (metadata `email`), and `staff_member.invitation_reopened`. | ADR-0055; matches `client_invitation.*`. |
| W8 | AW32 shows «Esta invitación ya no está activa» for an Activation Link whose inspection is `removed` (the 30-day cleanup removed the invitation, MOB-021 `215c818`). A cancelled invitation keeps reading as an expired link. | Follow-up 35's removed frame. |

## Schema

No migration: `accounts.email`, `pending_expires_at`, `deleted_at`,
`staff_members.deleted_at`, and the authentication tokens already exist.

## Compatibility

All changes are additive for the admin web (new endpoints, an optional
response field, a new problem code, a header). The mobile apps do not call
these routes.

## Verification

Unit specs for the use cases, controller e2e specs for the routes and
headers, the Prisma integration spec for the soft removal, a curl smoke on
`pilates_dev_sim`, and the admin web at 1440 and 420 px.
