# Follow-up — The avatar on Inicio opens Perfil

Targets: **02 (Inicio)**. Send as a follow-up.

---

The "LM" avatar beside the greeting is a decorative `div`: not a button, no pressed state, leads nowhere. In the staff app the same element opens Perfil, and in the admin web the user cell opens its menu (AW33). Here it does nothing, and a client who taps it expecting her account gets no response.

Turn it into a real control:

- Same 46px circle, `#D8BDB8` fill, initials in white Lora, two letters ("LM"). It does not change size, colour or position: still aligned with the greeting, top right.
- A button with a minimum 44px touch target, a pressed state, and the accessible label "Tu cuenta".
- Tapping it opens **Perfil (screen 18)**, the root of the Perfil tab, with "Perfil" marked active in the bottom bar. It is a shortcut to a destination that already exists: it does not open a sheet or a menu, and it does not create a new screen.

Add the matching note to the screen's footer: the avatar is a shortcut to Perfil; the tab bar is still the primary route.

The avatar stays **only on Inicio**. The other tab roots (Reservar, Mis reservas) don't get it: in the client app the tab bar accompanies every screen and already offers Perfil at all times, so repeating the avatar would be a second route to the same place on the same screen. In the staff app, which has no tab bar, the avatar does belong on all four roots (see the S02/S04/S11/S15 follow-up).

---

Nothing else changes on this screen: the greeting and date, the news carousel, the plan card with its progress and its "Ver detalle" link, the quick actions and the four-destination tab bar all stay exactly as they are, in every frame.
