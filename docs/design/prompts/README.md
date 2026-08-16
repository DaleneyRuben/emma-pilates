# Design prompts index

Prompts fed to the design tool (Claude Design) to generate the screens in `../../../design/`. Start with [`00-design-system.md`](./00-design-system.md) — every other prompt references it by name.

For fixes to **already-generated** screens, use [`followups/`](./followups/) instead of editing the original screen prompt — each follow-up is a short delta meant to be sent as the next message in the existing Claude Design conversation, so only the affected screen(s) regenerate. Only write/edit a full prompt file directly for a screen that hasn't been generated yet.

## Client app (`client/`)

| Prompt | Screen | Built | Status |
|---|---|---|---|
| 01 | Iniciar sesión / Registrarse | `01` | ✅ |
| 02 | Inicio | `02` | ✅ |
| 03 | Reservar | `03` | ✅ |
| 04 | Detalle de sesión | `04` | ✅ |
| 05 | Mis reservas | `05` | ✅ |
| 06 | Reprogramar | `06` | ✅ |
| 07 | Historial de clases | `07` | ✅ |
| 08 | Elige tu plan | `08` | ✅ |
| 09 | Detalle del plan | `09` | ✅ |
| 10 | Pago | `10` | ✅ |
| 11 | Estado del pago | `11` | ✅ |
| 12 | Mi plan | `12` | ✅ |
| 13 | Evaluación nutricional | `13` | ✅ |
| 14 | Confirmar evaluación | `14` | ✅ |
| 15 | Mis evaluaciones | `15` | ✅ |
| 16 | Mis referidos | `16` | ✅ |
| 17 | Mi crédito | `17` | ✅ |
| 18 | Perfil | `18` | ✅ |
| 19 | Notificaciones | `19` | ✅ |
| [20](./client/20-recover-password.md) | Recuperar contraseña | `20` | ✅ |
| [21](./client/21-change-password.md) | Crea tu contraseña | `21` | ✅ |
| [22](./client/22-edit-profile.md) | Editar perfil | `22` | ✅ |

## Staff app (`staff/`)

| Prompt | Screen | Built | Status |
|---|---|---|---|
| S01 | Iniciar sesión | `S01` | ✅ |
| S02 | Mi agenda (Entrenadora) | `S02` | ✅ |
| S03 | Lista de asistentes (Entrenadora) | `S03` | ✅ |
| S04 | Buscar cliente (Asistente) | `S04` | ✅ |
| S05 | Nuevo cliente (Asistente) | `S05` | ✅ |
| S06 | Resumen del cliente (Asistente) | `S06` | ✅ |
| S07 | Reservar una clase (Asistente) | `S07` | ✅ |
| S08 | Detalle de sesión (Asistente) | `S08` | ✅ |
| S09 | Elegir plan (Asistente) | `S09` | ✅ |
| S10 | Confirmar pago en efectivo (Asistente) | `S10` | ✅ |
| S11 | Pagos pendientes (Administración) | `S11` | ✅ |
| S12 | Revisar pago (Administración) | `S12` | ✅ |
| S13 | Cancelar una clase (Administración) | `S13` | ✅ |
| S14 | Cancelar sesión (Administración) | `S14` | ✅ |
| S15 | Mi agenda (Nutricionista) | `S15` | ✅ |
| S16 | Mi disponibilidad (Nutricionista) | `S16` | ✅ |
| S17 | Formulario de horario (Nutricionista) | `S17` | ✅ |
| [S18](./staff/18-recover-password.md) | Recuperar contraseña | `S18` | ✅ |
| [S19](./staff/19-change-password.md) | Crea tu contraseña | `S19` | ✅ |
| [S20](./staff/20-notifications.md) | Notificaciones | `S20` | ✅ |
| [S21](./staff/21-assistant-manage-bookings.md) | Reservas de la clienta (Asistente) | `S21` | ✅ |

## Admin web (`admin-web/`)

| Prompt | Screen | Built | Status |
|---|---|---|---|
| 00 | Design System | `Sistema de Diseño` | ✅ |
| AW01 | Iniciar sesión | `AW01` | ✅ |
| AW02 | Horario | `AW02` | ✅ |
| AW03 | Formulario de sesión | `AW03` | ✅ |
| AW04 | Planes | `AW04` | ✅ |
| AW05 | Formulario de plan | `AW05` | ✅ |
| AW06 | Tipos de clase | `AW06` | ✅ |
| AW07 | Formulario de tipo de clase | `AW07` | ✅ |
| AW08 | Insumos | `AW08` | ✅ |
| AW09 | Formulario de insumo | `AW09` | ✅ |
| AW10 | Registrar retiro | `AW10` | ✅ |
| AW11 | Nómina | `AW11` | ✅ |
| AW12 | Formulario de pago de sueldo | `AW12` | ✅ |
| AW13 | Gastos | `AW13` | ✅ |
| AW14 | Formulario de gasto | `AW14` | ✅ |
| AW15 | Categorías de gasto | `AW15` | ✅ |
| AW16 | Reporte de ingresos y gastos | `AW16` | ✅ |
| AW17 | Promociones | `AW17` | ✅ |
| AW18 | Formulario de promoción | `AW18` | ✅ |
| AW19 | Sucursales | `AW19` | ✅ |
| AW20 | Formulario de sucursal | `AW20` | ✅ |
| AW21 | Clientes | `AW21` | ✅ |
| AW22 | Detalle de cliente | `AW22` | ✅ |
| AW23 | Personal | `AW23` | ✅ |
| AW24 | Formulario de personal | `AW24` | ✅ |
| AW25 | Evaluaciones nutricionales | `AW25` | ✅ |
| AW26 | Referidos | `AW26` | ✅ |
| AW27 | Créditos | `AW27` | ✅ |
| AW28 | Pagos | `AW28` | ✅ |
| AW29 | Revisar pago | `AW29` | ✅ |
| [AW30](./admin-web/30-recover-password.md) | Recuperar contraseña | `AW30` | ✅ |
| [AW31](./admin-web/31-retiros-consumo.md) | Retiros e insumos consumidos | `AW31` | ✅ |

## Follow-ups (`followups/`)

Each of these was sent as the next message in the existing Claude Design conversation for the surface it targets. All seven have been applied and verified against the built files in `../../../design/`.

| Follow-up | Fixes | Status |
|---|---|---|
| [01](./followups/01-sidebar-remove-descuentos.md) | Drops "Descuentos" and makes the sidebar identical on every admin screen ([ADR-0007](../adr/0007-drop-descuentos-from-admin-web.md)) | ✅ applied (AW02–AW29) |
| [02](./followups/02-plan-catalog-no-unlimited.md) | Removes unlimited plans / 15-day pass from AW04, 08, S09 | ✅ applied |
| [03](./followups/03-referral-reward-copy.md) | Fixes the referral-reward copy on `01` | ✅ applied |
| [04](./followups/04-payment-rejected-notification.md) | Adds the missing payment-rejected notification type to `19` | ✅ applied |
| [05](./followups/05-waitlist-visibility-for-staff.md) | Surfaces the Waitlist on `S03`/`AW03`, fixes cancel-session copy on `AW03`/`S14` | ✅ applied |
| [06](./followups/06-client-overview-add-bookings-entry.md) | Adds the entry point for `S21` to `S06` | ✅ applied |
| [07](./followups/07-insumos-add-withdrawal-history-link.md) | Adds the entry point for `AW31` to `AW08` | ✅ applied |

## Status

All prompts in this index have a generated screen in `../../../design/`, and all seven follow-ups have landed. `design/README.md`'s screen inventory and shell notes have been updated to match (including `AW30`/`AW31`, which the shell doc had missed on the previous pass).
