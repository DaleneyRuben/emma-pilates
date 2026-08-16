# Drop Descuentos from the admin web sidebar

Status: accepted

The admin web design carried a "Descuentos" link in the Promociones sidebar group from the earliest schedule-shell screens (`AW02`) onward, with no screen, no prompt, and no backing domain concept behind it. `booking/CONTEXT.md` lists Discount explicitly as a term to avoid for [Credit](../../booking/CONTEXT.md), and states that [Promotion](../../booking/CONTEXT.md) carries no automatic pricing or discount effect. There is nothing in the domain a "Descuentos" screen would manage — the studio's only two client-facing money mechanisms are Credit (earned via Referral, spent automatically at Payment time) and Plan pricing itself (managed on `AW05`).

The link is removed from the sidebar, not designed around. Nothing replaces it.

This decision was made once already, during the `AW19`–`AW29` design pass, but was lost when `design/README.md` — a file the design tool regenerates wholesale — was regenerated without carrying the "known gaps" note forward. Recording it as an ADR is meant to survive that regeneration. Any future regeneration of the admin sidebar must not reintroduce Descuentos without a new domain concept and a new ADR superseding this one.
