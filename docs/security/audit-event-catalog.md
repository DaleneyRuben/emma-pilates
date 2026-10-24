# Audit event catalog

Source of truth for every `system.audit_records` action code
([ADR-0055](../adr/0055-store-focused-audit-records-in-postgresql.md)). A use
case that writes an audit record must use a code listed here, and a code listed
here must be written by the code base: `src/architecture/audit-catalog.spec.ts`
fails when the two drift. Adding a sensitive workflow means deciding, in the
same change, whether it belongs in the table below or in *Considered and not
audited*.

Every record is written in the same transaction as the change it describes, and
the table is append-only (the `audit_records_reject_update_or_delete` and
`audit_records_reject_truncate` triggers). Metadata stays minimal: never
passwords, tokens, link secrets, file contents, or copies of personal data
beyond what the table below names.

## Catalog

| Action code | Context | Written when | Actor | Target | Branch | Metadata |
| --- | --- | --- | --- | --- | --- | --- |
| `account.activated` | System Identity | An invited Client or Staff Member (or the bootstrap Administrator) sets their first password through an Activation Link | The Account itself (`account`) | `account` | — | `domainIdentity` (`client` / `staff`) |
| `account.password_changed` | System Identity | A signed-in Account changes its password; its other Authentication Sessions are revoked | The Account itself | `account` | — | — |
| `account.password_recovered` | System Identity | A Password-Recovery Link replaces the password; every Authentication Session is revoked | The Account itself | `account` | — | — |
| `account.email_change_requested` | System Identity | A signed-in active Account asks to change its login email; a Verification Link goes to the new address and a notice to the current one (IDN-008) | The Account itself | `account` | — | — |
| `account.email_change_cancelled` | System Identity | The Account cancels its pending email change from Editar perfil (IDN-008) | The Account itself | `account` | — | — |
| `account.email_changed` | System Identity | The link sent to the new address is opened: the login email changes and is verified; Authentication Sessions stay valid (IDN-008) | The Account itself | `account` | — | `previousEmail` |
| `pending_client_registration.cancelled` | System Identity | A self-registering Client cancels the pending registration | `system` (unauthenticated continuation) | `account` | — | `initiatedBy` |
| `pending_account.expired` | System Identity | The cleanup removes an expired, untouched pending Account | `system` | `account` | — | `domainIdentity` |
| `client_invitation.created` | System Identity | An Assistant or Administrator invites a Client | Staff Account and Role | `account` | — | — |
| `client_invitation.resent` | System Identity | The invitation's Activation Link is reissued | Staff Account and Role | `account` | — | — |
| `client_invitation.email_corrected` | System Identity | The pending invitation's email is corrected | Staff Account and Role | `account` | — | `previousEmail` |
| `client_invitation.cancelled` | System Identity | A pending invitation without activity is removed | Staff Account and Role | `account` | — | `email` (the removed Account no longer exists) |
| `client_invitation.verification_sent` | System Identity | An Assistant or Administrator sends a self-registered pending Client a new Verification Link from S05 «Enviar enlace de verificación» (MOB-021); older verification links stop working and the 7-day pending window restarts | Staff Account and Role | `account` | — | — |
| `impersonation.started` | System Identity | An Administrator starts seeing the Staff app as a Trainer, Assistant, Nutritionist, or the Coordinator from `S24` (FUT-001, ADR-0100, ADR-0102) | Administrator | `account` (the Staff Member's) | — | `staffMemberId`, `role`, `expiresAt` |
| `feedback.triaged` | System Identity | An Administrator sets a Feedback's status (Nuevo, Revisado, Resuelto) and its internal note «Qué cambiamos» on the admin web (REL-012) | Administrator | `feedback` | — | `previousStatus`, `status`, `noteChanged` |
| `feedback.exported` | System Identity | An Administrator exports every Feedback as CSV (REL-012), the log Google's production questionnaire asks for | Administrator | `feedback` | — | `feedbackCount` |
| `impersonation.ended` | System Identity | The Impersonation ends: «Salir» (`exited`), the 30 minutes pass (`expired`), the Administrator logs out (`logged_out`), or the Staff Member is deactivated or the session revoked (`revoked`) | Administrator for `exited` and `logged_out`; `system` for `expired` and `revoked` | `account` (the Staff Member's) | — | `reason`, `durationSeconds` |
| `administrator_bootstrap.created` | System Identity | The bootstrap command creates the first, pending Administrator | `bootstrap` | `account` | — | — |
| `administrator_bootstrap.activation_resent` | System Identity | The bootstrap command reissues the pending Administrator's link | `bootstrap` | `account` | — | — |
| `client.photo_changed` | Booking & Membership | A Client attaches or replaces their own profile photo (Client 22); a replaced photo's variants are released at once (ADR-0076) | Client Account | `client` | — | `replaced` |
| `client.photo_removed` | Booking & Membership | A Client removes their own profile photo; its variants are released at once (ADR-0076) | Client Account | `client` | — | — |
| `client_acquisition.corrected` | Booking & Membership | An Administrator corrects how a Client found the studio on `AW22` «¿Cómo nos conociste?»: the channel and the optional Referral Code, which wins over the channel (BKM-011); the Coordinator joins with IDN-009 | Administrator | `client` | — | `previousChannel`, `channel`, `previousReferralCode`, `referralCode` |
| `client.profile_corrected` | Booking & Membership | An Administrator or the Coordinator corrects a Client's name or phone from AW22 «Editar perfil» (IDN-009, ADR-0102); the login email stays the Client's own | Administrator or Coordinator | `client` | — | `changedFields` (`name` / `phone`, never their values) |
| `contact_alert.contacted` | Booking & Membership | The Administrator or the Coordinator marks a Client as contacted on «Para contactar», closing every open first-90-days Contact Alert of hers at once (BKM-013, ADR-0102) | Administrator or Coordinator | `client` | — | `reasons` (the closed reason codes, never her name or phone) |
| `account.closed` | Booking & Membership | A Client closes their own Account (password re-entered), or an Administrator closes a Client's Account (BE-007 G2–G6): future Bookings and Evaluations are cancelled as `account_closed`, the Subscription ends, the Credit is forfeited, every session, link, and device is revoked, and the name, email, phone, password, and photo are erased (ADR-0097) | Client Account, or Administrator | `account` | — | `initiatedBy` (`client` / `administrator`), `closedWaitlistEntries`, `cancelledBookings`, `cancelledEvaluations`, `forfeitedClasses`, `forfeitedCreditCentavos`, `keptPromotionContact` (the Client ticked the promotions box, ADR-0097), `endedPromotionsConsent` (an open Promotions Consent was ended, ADR-0098) |
| `staff_member.created` | Booking & Membership | An Administrator creates a Staff Member with a pending Account | Administrator | `account` | — | `role`, `branchIds` |
| `staff_member.activation_resent` | Booking & Membership | An Administrator reissues a pending Staff Member's Activation Link | Administrator | `account` | — | — |
| `staff_member.role_changed` | Booking & Membership | An Administrator changes a Staff Member's Role | Administrator | `account` | — | `previousRole`, `role` |
| `staff_member.branches_changed` | Booking & Membership | An Administrator assigns or removes Branches | Administrator | `account` | — | `added`, `removed` |
| `staff_member.deactivated` | Booking & Membership | An Administrator deactivates a Staff Member (Account disabled, sessions revoked) | Administrator | `account` | — | `role` |
| `staff_member.referral_code_changed` | Booking & Membership | An Administrator gives a Trainer her personal Referral Code on `AW24`, changes it, or removes it (BKM-011); Trainer pay (BKO-006) follows the Clients it brings | Administrator | `staff_member` | — | `previousReferralCode`, `referralCode` |
| `staff_member.email_corrected` | Booking & Membership | An Administrator corrects a pending Staff Member's email from AW24 «Cambiar correo»; the Activation Link is reissued to the new address (WEB-012 W1, W2, W7) | Administrator | `account` | — | `previousEmail` |
| `staff_member.invitation_cancelled` | Booking & Membership | An Administrator cancels a pending Staff Member's invitation from AW24 «Cancelar invitación»; the pending Account and Staff Member are marked removed, never deleted (WEB-012 W3, W7; ADR-0086) | Administrator | `account` | — | `email` (the address is free for a new invitation) |
| `staff_member.invitation_reopened` | Booking & Membership | An Administrator enters a pending Staff Member's email again in «Nuevo miembro»: the existing invitation's Activation Link is reissued instead of creating a second member (WEB-012 W4, W7) | Administrator | `account` | — | — |
| `branch.created` | Booking & Membership | An Administrator creates a Branch (ADM-001 slice A) | Administrator | `branch` | the new Branch | `name` |
| `branch.updated` | Booking & Membership | An Administrator renames a Branch or changes its address | Administrator | `branch` | the Branch | previous and new `name`, `address` (only those changed) |
| `branch.archived` | Booking & Membership | An Administrator archives an idle Branch; its Nutritionists' Availability Blocks there end (NUT-001 D15) | Administrator | `branch` | the Branch | `endedAvailabilityBlocks` |
| `class_type.created` | Booking & Membership | An Administrator creates a Class Type | Administrator | `class_type` | — | `defaultCapacity` |
| `class_type.updated` | Booking & Membership | An Administrator edits a Class Type's name, description, default capacity, or equipment needs (existing Sessions keep their facts, follow-up 39 §2) | Administrator | `class_type` | — | previous and new `name`, `defaultCapacity` (only those changed), `descriptionChanged`, `equipmentNeedsChanged` |
| `class_type.archived` | Booking & Membership | An Administrator archives a Class Type no effective Session Schedule uses | Administrator | `class_type` | — | — |
| `plan.created` | Booking & Membership | An Administrator creates a Plan | Administrator | `plan` | — | `priceCentavos` |
| `plan.updated` | Booking & Membership | An Administrator edits a Plan | Administrator | `plan` | — | `previousPriceCentavos`, `priceCentavos` |
| `plan.visibility_changed` | Booking & Membership | An Administrator hides or shows a Plan | Administrator | `plan` | — | `visible` |
| `payment.transfer_confirmed` | Booking & Membership | An Administrator confirms a transfer Payment | Administrator | `payment` | — | `method`, `priorState`, `newState`, `amountDueCentavos`, `creditAppliedCentavos` |
| `payment.transfer_rejected` | Booking & Membership | An Administrator rejects a transfer Payment | Administrator | `payment` | — | `method`, `priorState`, `newState`, `amountDueCentavos`, `creditAppliedCentavos` |
| `payment.cash_confirmed` | Booking & Membership | An Assistant or Administrator records a cash Payment | Staff Account and Role | `payment` | Collection Branch | `method`, `priorState`, `newState`, `amountDueCentavos`, `creditAppliedCentavos` |
| `payment.front_desk_transfer_submitted` | Booking & Membership | An Assistant photographs a Client's transfer receipt at the front desk; the Payment stays pending for the existing review (PAY-006) | Staff Account and Role | `payment` | The Branch named on the receipt | `clientId`, `method`, `amountDueCentavos`, `imageAssetId` |
| `payment.voided` | Booking & Membership | An Administrator voids a confirmed sale (a mistake, no refund); the Subscription ends and future Bookings are cancelled (PAY-006) | Administrator | `payment` | — | `clientId`, `reason`, `method`, `amountDueCentavos`, `previousEndsOn`, `endsOn`, `cancelledBookings` |
| `payment.courtesy_granted` | Booking & Membership | An Administrator grants Courtesy Access: a Bs 0 `courtesy` Payment and the hidden tester Plan (REL-011, booking ADR-0012) | Administrator | `payment` | — | `method`, `clientId`, `planId`, `classAllowance`, `durationDays`, `startsOn`, `endsOn` |
| `subscription.ended_early` | Booking & Membership | An Early Renewal with no classes left ends the current Subscription the day before the new Start Date (BKM-006, booking ADR-0005), in the same transaction as the new Subscription | Client or Staff Account and Role | `subscription` | — | `clientId`, `previousEndsOn`, `endsOn`, `renewalStartsOn`, `paymentId` |
| `founder_membership.granted` | Booking & Membership | The first real confirmed Payment of one of the first 40 Clients grants the Founder Membership (BKM-010, booking ADR-0008), in the same transaction | `system` | `founder_membership` | — | `clientId`, `number`, `paymentId` |
| `founder_membership.lost` | Booking & Membership | The nightly job ends a Founder Membership after a gap of more than 7 days (BKM-010, booking ADR-0008) | `system` | `founder_membership` | — | `reason` |
| `payment.invoice_issued_marked` | Booking & Membership | An Administrator marks a confirmed sale «Factura emitida» (PAY-007); the Payment keeps who and when | Administrator | `payment` | — | `method`, `hasInvoiceData` |
| `payment.invoice_issued_unmarked` | Booking & Membership | An Administrator undoes the «Factura emitida» mark (PAY-007) | Administrator | `payment` | — | `method`, `hasInvoiceData`, `previousIssuedAt` |
| `allowance_adjustment.recorded` | Booking & Membership | An extra class is recorded on a Subscription (BKM-008, booking ADR-0006): the gift on the first real Payment, or a courtesy or class return by an Administrator | The approving Account for a gift, the Administrator otherwise | `allowance_adjustment` | — | `clientId`, `subscriptionId`, `classes`, `reason` |
| `session.cancelled` | Booking & Membership | An Administrator cancels a Session with Bookings (last resort) | Administrator | `session` | Session Branch | `cause`, `cancelledBookings`, `closedWaitlistEntries` |
| `session.created` | Booking & Membership | An Administrator creates a one-off Session («Una sola vez», follow-up 39 §1) outside any Session Schedule | Administrator | `session` | Session Branch | `classTypeId`, `trainerStaffMemberId`, `startsAt`, `durationMinutes`, `capacity` |
| `session.updated` | Booking & Membership | An Administrator edits one Session (Trainer swap, new start, or capacity) | Administrator | `session` | Session Branch | previous and new `trainerStaffMemberId`, `startsAt`, `capacity` (only those changed) |
| `attendance.corrected` | Booking & Membership | The assigned Trainer changes an Attendance outcome already saved for a Booking (the first complete roster save is not a correction) | Staff Account and Role | `booking` | Session Branch | `previousOutcome`, `outcome` (`attended` / `no_show`) |
| `evaluation.cancelled_by_staff` | Booking & Membership | The Nutritionist or an Administrator cancels a booked Evaluation | Staff Account and Role | `evaluation` | Slot Branch | `cause`, `insideClientWindow` |
| `promotion.created` | Booking & Membership | An Administrator saves a new Promotion (a draft, with or without its image) | Administrator | `promotion` | — | `hasImage` |
| `promotion.updated` | Booking & Membership | An Administrator edits a Promotion's copy, display window, or image (a changed image unpublishes it, follow-up 39) | Administrator | `promotion` | — | `imageChanged`, `unpublished` |
| `promotion.published` | Booking & Membership | An Administrator publishes a Promotion, exposing its public image copies (ADR-0077) | Administrator | `promotion` | — | `displayStartsOn`, `displayEndsOn` |
| `promotion.unpublished` | Booking & Membership | An Administrator takes a published Promotion out of the carousel; its public copies are retired | Administrator | `promotion` | — | — |
| `promotion.archived` | Booking & Membership | An Administrator deletes a Promotion (the row is archived, never removed; its image is released, ADR-0076) | Administrator | `promotion` | — | `wasPublished` |
| `promotion_contact.exported` | Booking & Membership | An Administrator exports the Promotion Contacts (BE-022, ADR-0097), handing their names, emails, and phones out of the system | Administrator | `promotion_contact` | — | `contactCount` |
| `promotion_contact.withdrawn` | Booking & Membership | An Administrator records a former Client's «stop» request: the contact's name, email, and phone are erased and `withdrawn_at` is set (BE-022) | Administrator | `promotion_contact` | — | — |
| `promotions_consent.withdrawn` | Booking & Membership | An Administrator records a live Client's «stop» request on AW35: their open Promotions Consent gets `withdrawn_at`, and the Account stays as it is (BE-023, ADR-0098). The Client's own switch in Perfil is not audited; the consent rows are its record | Administrator | `client_promotions_consent` | — | `clientId` |
| `studio_settings.updated` | Booking & Membership | An Administrator changes the configurable Studio Settings on «Reglas del estudio» (BKM-004, ADR-0101); the change is a new version row | Administrator | `studio_settings` | — | `version`, previous and new `minimumBookings`, `taxRatePercent`, `renewalTargetMonths1To6Percent`, `renewalTargetMonths7To12Percent`, `renewalTargetFromMonth13Percent`, `openingDate` (only those changed) |
| `salary_payment.recorded` | Back Office | An Administrator records a Salary Payment | Administrator | `salary_payment` | — | `amountCentavos`, `paidOn` |
| `salary_payment.updated` | Back Office | An Administrator corrects a Salary Payment | Administrator | `salary_payment` | — | previous and new `staffMemberId`, `amountCentavos`, `paidOn` (only those changed) |
| `expense.recorded` | Back Office | An Administrator records a Branch Expense | Administrator | `expense` | Expense Branch | `amountCentavos`, `incurredOn`, `expenseCategoryId` |
| `expense.updated` | Back Office | An Administrator corrects an Expense (the Branch never changes) | Administrator | `expense` | Expense Branch | previous and new `expenseCategoryId`, `amountCentavos`, `incurredOn` (only those changed) |
| `cash_close.recorded` | Back Office | An Assistant (at her Branch) or an Administrator makes the day's Cash Close; it is never edited afterwards (BKO-003) | Staff Account and Role (the Administrator, with the Impersonation, while she sees the app as an Assistant) | `cash_close` | Cash Close Branch | `businessDate`, `expectedCentavos`, `countedCentavos`, `differenceCentavos` |

Back Office money records follow BKO-001 D17: Salary Payments and Expenses are audited; Supplies, Withdrawals, Restocks, and Expense Categories are not (below).

While an Impersonation is active, **every** audit record written by the
request carries `impersonation_id`: the actor columns name the Administrator
(`actor_account_id`, `actor_role = administrator`) and the Impersonation row
names the acted-as Staff Member. Rows that are not audited (a Booking's
`created_by`, Attendance's `recorded_by`, a Cash Payment's `recorded_by`)
keep the Staff Member's Account, as the screen showed it, and are attributed
to the Administrator through the Impersonation's `started_at`–`ended_at`
window.

## Retired codes

- `payment.credit_only_confirmed` was written when a Client paid a whole Plan with Credit. PAY-005 retired Credit (booking ADR-0009), so nothing writes it any more; the records written before stay.

## Considered and not audited

| Workflow | Why not |
| --- | --- |
| Login success, failure, and throttling | Throttle events already record the security signal; a success audit per sign-in would be high-volume routine activity. |
| Logout of the current Authentication Session | The Account ends its own sign-in; the session row keeps `revoked_at` and the reason. |
| Admin-web browser Login and logout (WEB-002) | Same rules as mobile: the session row records `surface = admin_web`, and a rejected non-Administrator counts as an ordinary failed attempt in the throttle events. Password change and recovery from the browser write the same `account.password_changed` / `account.password_recovered` records. |
| Admin-web Payment list, review, and receipt view (WEB-005) | Ordinary reads (ADR-0055), like the Staff app's queue; confirming or rejecting from the browser writes the same `payment.transfer_confirmed` / `payment.transfer_rejected` records as the Staff app, in the same transaction. Whether reading a receipt should be audited is an open data-governance question (WEB-005). |
| Admin-web request refused for an untrusted origin (`403 untrusted_origin`) | Nothing changes, and no Account is identified before the refusal; the request log keeps the status and correlation id. |
| Client registration and email verification | Routine self-service; the Account row records the timestamps. |
| Session Schedule create, replace, end (cancelling unbooked Sessions as `schedule_changed`) | The schedule rows keep their effective range and the cancelled Sessions record the actor; no booked class changes. |
| Client Booking, cancellation, Reschedule, Waitlist join/leave | Routine Client activity (ADR-0055); `created_by`/`cancelled_by`/`rescheduled_by` Account columns keep who acted, including an Assistant acting for a Client. |
| Trainer Attendance, first roster save | A reporting record with `recorded_by` and no money or access effect. A later correction of an outcome writes `attendance.corrected` above, because that outcome can decide instructor pay. |
| Automatic empty-Session cancellation, Waitlist closure, Purchase Intent expiry | System sweeps with no human actor; the rows record cause and time (BOOK-001, BOOK-004, PAY-002). |
| Client Evaluation booking and cancellation | Routine Client activity; the Evaluation row records creator, canceller, and cause. |
| Availability Block create, replace, end | The Nutritionist manages their own schedule; the block row records `created_by`/`ended_by`, and booked Evaluations are never changed by it. |
| Transfer receipt upload and Purchase Intent creation | Client self-service with no decision; the Payment decision is audited instead. |
| Credit ledger entries | The ledger itself is append-only and actor-stamped; the Payment audit references the purchase. |
| Supply create, edit, and archive; Withdrawals and Restocks | Stock rows record their actor and time, move no money, and the database keeps the quantity reconciled with the movements (BKO-001 D4, D17). |
| Promotion reordering (UPL-002) | Drag ordering is routine, high-churn activity that changes no copy and exposes nothing new; the rows keep `display_order` and `updated_at`. Every other Promotion change (create, edit, publish, unpublish, archive) is audited above because it decides what every Client sees. |
| Image finalization, variant rebuild, and the retention sweeps (UPL-001, UPL-002) | Worker processing with no human actor; `image_assets` and `image_variants` keep their state, failure code, and deletion timestamps (ADR-0073 to ADR-0077). |
| Reading a Promotion image (private Administrator route or public versioned route) | Ordinary reads (ADR-0055); the public route serves only what a published Promotion already shows to every Client. |
| Expense Category create and delete | A label with no money of its own; deletion is refused while any Expense uses it (BKO-001 D13). |
| Admin-web Back Office lists, forms, and the Insumos low-stock count (WEB-007) | Ordinary reads (ADR-0055); recording or correcting a Salary Payment or Expense from the browser writes the same `salary_payment.*` / `expense.*` records in the same transaction, and stock movements and categories stay unaudited as above. |
| Equipment and Equipment Issues (BKO-004) | No money moves. Each row keeps its own author and time (`created_by_account_id`; `reported_by_account_id`, `reported_at`, `resolved_by_account_id`, `resolved_at`), the database refuses any other change and every delete, and retiring is one-way, so the rows are their own trail, as Supplies are. |
| Admin-web Evaluation, Referral, and Credit lists (WEB-008) | Ordinary read-only oversight reads (ADR-0055); AW25–AW27 change nothing. The Administrator Evaluation cancel is not on the admin web (AW25 is read-only, invariant 10); where it is used, it keeps writing `evaluation.cancelled_by_staff`. |
| Admin-web income and expense report (WEB-009) | An ordinary read of two existing aggregates (ADR-0055); AW16 changes nothing and shows no personal data beyond totals, and the Payments, Expenses, and Salary Payments it sums keep their own audit records. |

## Retention

Decided by BE-007 ([proposal](../implementation/BE-007-data-governance-proposal.md),
G1; ADR-0055 reserved it there), with closure's erasure from
[ADR-0097](../adr/0097-erase-personal-data-when-a-client-account-closes.md),
which replaced G7:

- **Audit records are kept indefinitely.** The append-only triggers mean no
  application path can change or delete them, BE-008's retention sweeps never
  touch this table, and [ADR-0086](../adr/0086-soft-delete-every-database-row.md)
  rules out physical deletion anyway. Indefinite retention already covers any
  Bolivian tax or accounting period, so no per-code period is set.
- **Closing a Client Account erases the personal data on its rows, not in the
  audit metadata.** The Client's name, phone, and photo, and the Account's
  email and password, are overwritten in the closure transaction (ADR-0097).
  The audit records keep pointing at the same Account and Client ids, which
  now read as «Cliente eliminado». `account.closed` itself copies no personal
  data. The five codes that carry an email (`client_invitation.email_corrected`,
  `client_invitation.cancelled`, `staff_member.email_corrected`,
  `staff_member.invitation_cancelled`, `account.email_changed`) keep the email
  they recorded, because the triggers forbid rewriting a record; the
  personal-data runbook tells the person so when they ask.
- `promotion_contact.withdrawn` and `promotions_consent.withdrawn` record a
  «stop promotions» request without copying the contact's name, email, or
  phone.
- Who may read audit records, and how a person's own records are given back to
  them, is the operator procedure in
  [personal-data-requests.md](../runbooks/personal-data-requests.md).
