# Production reset and go-live (REL-019, REL-018)

Drafts for the owner. The reset is run by hand, once, after Google approves
the Client app. It is the one exception to soft deletion, because nothing real
exists on production yet, and it is never repeated once real Clients use it.

## REL-019 · The reset

Before anything else:

1. Confirm the last daily dump finished and is the only copy of the test
   data. It expires with the 30-day `daily/` rule, so note its name.
2. Pause nothing: the reset runs against production while it is up, and the
   owner types the confirmation.

The step, run by the owner:

1. Empty every table of the `booking`, `back_office`, and `system` schemas,
   and the `pgboss` jobs. Keep the `_prisma_migrations` table: the schema
   stays.
2. Remove the receipt and profile images from the `emma-pilates-prod-images`
   bucket.
3. Run the first-Administrator bootstrap again (IDN-006).
4. Update the Play Console reviewer login to the REL-016 Accounts.

The exact commands belong in the release runbook and are written when the
reset is about to happen, against the schema that is live that day. They are
not written here, because a command that empties production does not belong in
a draft that can be copied by mistake.

After the reset, check:

- The admin web shows no Client, no Payment, and no Session.
- A tester's old login is refused.
- A new registration works end to end.
- The backup heartbeat stays green.

## REL-018 · Go-live, from the empty production

1. Load the eight Plans of the decisions document, table 2.1, and hide the old
   monthly ones. REL-018 loads them; no item before it does.
2. Load the weekly schedule from the admin web: 6 classes Monday to Friday, 3
   on Saturday.
3. Invite the Staff: the Trainers with their personal codes, the Assistant,
   the Coordinator, and the Nutritionist with her availability.
4. Enter the Studio Settings values and the Opening Date.
5. Promote the release and open the presale, which offers the Opening Date as
   a Start Date (BKM-006).
