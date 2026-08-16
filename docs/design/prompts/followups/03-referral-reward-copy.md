# Follow-up — Fix the referral reward copy on Iniciar Sesión / Registrarse

Targets: **01 (Iniciar Sesión)**, the "Registrarse con código" frame. Send as a follow-up.

---

That frame's helper text under the referral code field currently reads: *"Tu amiga y tú reciben una clase de regalo al completar tu primer paquete."* This is wrong on three counts against `booking/CONTEXT.md`'s Referral/Credit entries:

- The reward is money **Credit**, not a free class.
- Only the **referrer** is rewarded — the new client (reading this text at signup) gets nothing.
- It's granted when the referred client's **first Payment is confirmed**, not on completing a first "paquete" generically.

Replace it with something like: *"Tu amiga gana crédito cuando confirmes tu primer pago."* — worded from the new signer-upper's perspective (they're the one reading it), making clear the benefit is their referrer's, not their own. Keep the same placement, collapsed-by-default behavior, and visual treatment as the rest of that field. Nothing else on the screen changes.
