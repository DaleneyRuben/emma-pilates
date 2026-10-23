# Diagnóstico técnico y de producto: Emma Pilates

Fecha: 22 de octubre de 2026. Base analizada: rama `main` en el commit `18a62f58`. Análisis de sólo lectura: no se modificó ningún archivo de código.

## Resumen ejecutivo

1. **El sistema existe, funciona y está en producción.** Tres aplicaciones (clientas, staff, administración), un backend con 130 endpoints y 50 tablas, worker de tareas, notificaciones push, correos, backups, monitoreo y despliegue continuo a staging y producción. 3.382 commits en diez semanas, 427 archivos de pruebas, 100 ADRs, código limpio y consistente. Del backlog original de 232 ítems quedan la ronda de tienda y pulido visual.

2. **Pero se construyó con un reglamento de estudio distinto del que ahora define la dueña.** Planes por meses en lugar de 30/60/90 días; cancelación con 2,5 h en vez de 12 h; clases que se cancelan sólo con cero reservas y 2 h antes, no con menos de 2 o 3 alumnas y 3 h antes; referidos premiados con Bs 60 de crédito en lugar de clases y pases de invitada; sin tope semanal, sin congelamiento, sin membresía fundadora, sin clase de regalo, sin renovación anticipada. Y hay cosas construidas que el negocio no menciona: nutricionista con evaluaciones, multi-sucursal, crédito en dinero.

3. **La operación del estudio está cubierta a medias.** Reservas, lista de espera, asistencia, cobro en efectivo, revisión de transferencias por QR, horario, catálogo, personal, insumos y gastos: sí. Cierre de caja, pago calculado a las instructoras, comisiones de la coordinadora, equipos y fallas, recordatorios de clase, seguimiento de los 90 días: no existe nada.

4. **La web de administración es una herramienta operativa, no de dirección.** Hay un único reporte de ingresos cobrados y gastos por mes, sin gráficos reales, sin impuestos, sin KPIs, sin proyecciones ni recomendaciones. Toda la capa económica que pide la dueña está por construir, aunque los datos que la alimentan (pagos, sesiones, reservas, asistencia, gastos) ya se registran bien.

5. **Problemas de código: pocos y acotados.** Tres bugs medios en el backend (saldo de crédito tras cierre de cuenta, lista de espera al subir capacidad, corrección de asistencia sin auditoría), un total del reporte que no cuadra con su desglose en la web, un puñado de manejos de error flojos en las apps, reglas duplicadas como constantes en seis lugares y textos de negocio escritos en las pantallas. Nada que impida abrir; todo listado en 1.8.

6. **Recomendación.** No reescribir: adaptar el dominio. La Fase 1 propuesta (30 a 42 días de trabajo) cambia las reglas a las de Emma y añade cierre de caja, nómina calculada y equipos; con eso se puede abrir. Las fases 2 y 3 (seguimiento de clientas, panel de KPIs, proyecciones, recomendaciones e IA) se construyen con el estudio ya operando, sobre un contexto analítico nuevo que lee las tablas existentes. Antes de empezar hacen falta las respuestas de la última sección, sobre todo la política dentro de las 12 h, la renovación anticipada, el destino del crédito por referidos, la facturación y el canal de los mensajes.

## Alcance y método

Se leyeron el mapa de contextos y los tres glosarios, los ADRs, el backlog y la guía de pruebas, los modelos Prisma y las migraciones, los 39 controladores del backend y sus casos de uso, las pantallas de las tres aplicaciones y el paquete móvil compartido, y se ejecutaron `typecheck` y `lint` de cada aplicación. La comparación con el negocio parte de las reglas que la dueña entregó para este diagnóstico. Las referencias a archivos usan la forma `ruta:línea`. Los esfuerzos son estimaciones en días de trabajo de una persona con asistencia de IA al ritmo actual del repositorio.

## Parte 1: Inventario de lo que existe

### 1.1 Visión general del repositorio

**Qué es.** Un monorepo pnpm en TypeScript con cinco aplicaciones y tres paquetes, construido entre el 11 de agosto y el 22 de octubre de 2026 (3.382 commits, 150 pull requests). Está **desplegado en producción y staging** y le faltan sólo los pasos de tienda para que alguien lo instale desde Google Play. No es un prototipo: tiene 100 ADRs del sistema más 4 del contexto de reservas, tres glosarios de dominio, 27 migraciones, un runbook de releases, backups diarios con simulacro de restauración y monitoreo con alertas.

| Pieza | Carpeta | Tecnología | Tamaño |
| --- | --- | --- | --- |
| Backend (API + worker + comandos) | `apps/backend` | NestJS 11, Prisma 7, PostgreSQL 18, pg-boss, Pino, Zod | 39 controladores, ≈130 endpoints REST bajo `/api/v1`, 27 migraciones, 50 tablas |
| App de clientas | `apps/client-mobile` | Expo 57, React Native 0.86, React 19, React Navigation 7, TanStack Query 5 | 24 pantallas diseñadas y construidas |
| App de staff | `apps/staff-mobile` | Misma base | 24 pantallas diseñadas y construidas, 4 roles |
| Web de administración | `apps/admin-web` | Vite, React 19, TanStack Router/Query/Table, shadcn/Tailwind/Radix, Playwright | 35 pantallas diseñadas y construidas |
| Páginas públicas | `apps/public-site` | HTML estático en Cloudflare Pages | Privacidad, soporte, eliminación de cuenta |
| Contratos de API | `packages/api-contracts` | OpenAPI generado desde NestJS; cliente Fetch y hooks TanStack generados con Orval | Se regenera en cada cambio de contrato (`pnpm check:api` en CI) |
| Núcleo móvil compartido | `packages/mobile-core` | Autenticación, enlaces, notificaciones, caché, tokens de diseño | 91 archivos |
| Herramientas | `packages/tooling` | ESLint, scripts | — |

En total hay unos 1.420 archivos TypeScript fuera de los generados, de los cuales 427 son de pruebas (Jest unitarias e integración con PostgreSQL real, Supertest, React Native Testing Library, Testing Library + MSW, Playwright y Maestro). La CI corre en GitHub Actions con PostgreSQL desechable; `main` se publica sola en staging y se promueve a producción a mano.

**Contextos de dominio (DDD).** Tres contextos acotados con esquema PostgreSQL propio y módulo NestJS propio:

- **Booking & Membership** (`booking`): planes, suscripciones, tipos de clase, series semanales, sesiones, reservas, lista de espera, asistencia, evaluaciones nutricionales, pagos, crédito, referidos, promociones, clientas, personal y sucursales.
- **Back Office** (`back_office`): insumos (retiros y reposiciones), pagos de sueldo, categorías de gasto y gastos.
- **System Identity** (`system`): cuentas, sesiones de autenticación, enlaces de un solo uso, límites de intentos, supresión de correos, auditoría, idempotencia, notificaciones, dispositivos, imágenes.

**Infraestructura en producción** (`docs/architecture/infrastructure.md`): API y worker en Northflank (plan gratuito), PostgreSQL 18 en Aiven (gratuito, 1 GB), admin web en Vercel Hobby, imágenes y backups en Cloudflare R2, dominio `emmapilatesstudio.com` en Cloudflare con correo entrante, Resend para correos transaccionales, Expo Push con Firebase para Android, Better Stack para alertas, Sentry (vía Better Stack) para errores. Costo mensual actual cercano a cero; staging se pausa cuando no se usa. Faltan Apple Developer (99 USD al año) para iOS y la publicación en Google Play.

**Estado del backlog** (`docs/implementation/BACKLOG.md`, 232 ítems): 215 hechos; pendientes sólo la ronda de tienda (REL-003 a REL-010), la cola de pulido UX-002 a UX-013 surgida de la auditoría UX-001 del 22 de octubre, y un par de limpiezas (PAY-004). Nada de la cola pendiente toca reglas de negocio: el producto, tal como fue definido, está terminado.

### 1.2 Modelo de datos principal

50 tablas en tres esquemas. Todo el dinero son enteros en centavos de boliviano (ADR-0082); ninguna fila se borra físicamente (ADR-0086, columnas `deleted_at` / `archived_at`); toda hora de negocio es `America/La_Paz` (ADR-0057).

**Booking & Membership: catálogo y agenda**

| Entidad | Campos clave | Relaciones |
| --- | --- | --- |
| `Branch` (sucursal) | nombre, dirección, archivada | Una sala por sucursal; sesiones no se solapan |
| `ClassType` (tipo de clase) | nombre, descripción, capacidad por defecto, equipamiento (texto) | → series y sesiones |
| `SessionSchedule` (serie semanal) | sucursal, tipo, instructora, día, hora, duración, capacidad, vigente desde/hasta | Genera sesiones 30 días adelante |
| `Session` (clase concreta) | inicio, fin, capacidad, estado (programada/cancelada), causa (cero reservas, sin suplente, cambio de serie), marca del chequeo de sesión vacía | → reservas, lista de espera |
| `Plan` | nombre, **meses** (1/3/6/12), clases, precio, orden, oculto | → suscripciones, intenciones, pagos |
| `Subscription` | clienta, plan (snapshot), clases originales y restantes, inicio, fin, estado, pago | 1 pago → 1 suscripción |
| `Promotion` | titular, descripción, imagen, ventana de exhibición, orden, publicada | Sólo contenido |

**Booking & Membership: flujo de reserva**

| Entidad | Campos clave | Notas |
| --- | --- | --- |
| `Booking` | sesión, clienta, suscripción, estado (reservada/cancelada/reprogramada), quién la creó y canceló, cadena de reprogramación | Consume 1 clase al crearse; cancelar la devuelve |
| `WaitlistEntry` | sesión, clienta, orden de llegada, cierre (salió, promovida, sesión cancelada, sesión empezó), reserva promovida | Promoción automática por el worker |
| `AttendanceRecord` | reserva, resultado (asistió / no asistió), quién, cuándo | Sólo informativo |

**Booking & Membership: pagos y crédito**

| Entidad | Campos clave | Notas |
| --- | --- | --- |
| `PurchaseIntent` | clienta, plan (snapshot), precio, crédito reservado, monto a pagar, comprobante, estado (abierta/enviada/expirada), expira a las 24 h | Antes del pago por transferencia |
| `Payment` | clienta, plan (snapshot), precio, crédito aplicado, monto, método (transferencia/efectivo/sólo crédito), estado (pendiente/confirmado/rechazado), sucursal de cobro, quién lo envió y decidió, motivo de rechazo | Fuente de los ingresos |
| `CreditReservation`, `CreditLedgerEntry` | reservas y asientos (premio por referido, reserva, gasto, liberación, cierre de cuenta) con correlación y actor | Libro mayor del crédito |
| `Referral` | referidora, referida, estado (pendiente/premiada), pago que la calificó, monto (Bs 60) | Sólo clienta → clienta |

**Booking & Membership: personas y nutrición**

| Entidad | Campos clave |
| --- | --- |
| `Client` | nombre, teléfono, foto, **código de referido**, consentimientos de promociones |
| `StaffMember` | nombre, teléfono, rol (instructora, nutricionista, asistente, administración), foto; `StaffBranchAssignment` |
| `PromotionContact`, `ClientPromotionsConsent` | contactos para promociones (ex clientas) y consentimiento de clientas vivas |
| `AvailabilityBlock`, `EvaluationSlot`, `Evaluation` | disponibilidad semanal de la nutricionista, turnos de 45 min y citas (una por mes con plan activo) |

**Back Office**

| Entidad | Campos clave |
| --- | --- |
| `Supply`, `Withdrawal`, `SupplyRestock` | insumos por sucursal, retiros y reposiciones inmutables, umbral de stock bajo |
| `SalaryPayment` | persona, monto, fecha (sin cálculo ni detalle; estudio-wide) |
| `ExpenseCategory`, `Expense` | gastos por sucursal, fecha y categoría |

**System Identity:** `Account` (correo, hash, verificación, activación, deshabilitación, enlace 1:1 a clienta o personal), `AuthenticationToken` (enlaces de un solo uso), `AuthenticationSession` (sesiones opacas con expiración por inactividad y absoluta, por superficie), `ImpersonationSession` (30 min), `AuthenticationThrottleEvent`, `EmailSuppression`, `AuditRecord` (append-only con código de acción, actor, objetivo, correlación), `IdempotencyRecord`, `Notification` y `NotificationDelivery` (bandeja por cuenta y entregas por dispositivo), `AccountDevice` (token push), `ImageAsset` e `ImageVariant`.

Relaciones centrales: `Client 1─n Subscription 1─n Booking n─1 Session n─1 SessionSchedule`; `Payment 1─1 Subscription`; `Client 1─1 Account 1─n AuthenticationSession`; `StaffMember 1─n Session` (instructora); `Branch 1─n Session`, `Supply`, `Expense`.

### 1.3 Backend: API, worker, notificaciones

**Estructura.** NestJS como monolito modular (ADR-0005, ADR-0014) con un módulo por contexto (`booking`, `back-office`, `system-identity`) más módulos transversales (`notifications`, `uploads`, `jobs`, `health`, `links`, `monitoring`, `backup`). Una sola imagen Docker ejecuta tres procesos: API, worker pg-boss y comandos (migración, release, backup, bootstrap del primer administrador, fixtures de desarrollo). Autorización contextual dentro de cada caso de uso con pruebas de denegación por defecto (ADR-0054); auditoría append-only en la misma transacción (ADR-0055); transacciones Serializable con reintento para reservas y dinero (ADR-0056); claves de idempotencia obligatorias en los comandos sensibles a reintentos (ADR-0060). 373 archivos fuente, 175 de pruebas unitarias, 43 de pruebas HTTP de extremo a extremo y 91 de integración contra PostgreSQL real.

**Endpoints** (≈130 bajo `/api/v1`, agrupados):

| Grupo | Rutas principales |
| --- | --- |
| Identidad | registro de clientas y verificación, sesiones de autenticación (móvil y admin web), activación, recuperación y cambio de contraseña, cambio de correo, inspección de enlaces, impersonación, webhook de Resend |
| Clienta | perfil y foto, suscripción actual, planes, sucursales, tipos de clase, sesiones, reservas, lista de espera, historial, intenciones de compra, compra con crédito, pago actual, crédito, referidos, QR de transferencia, evaluaciones, consentimiento de promociones, cierre de cuenta |
| Instructora | agenda, lista de asistentes, asistencia |
| Asistente | búsqueda y ficha de clientas, reservas e historial por clienta, cotización de planes, pago en efectivo, invitaciones |
| Nutricionista | agenda, bloques de disponibilidad |
| Administración | sucursales, tipos de clase, planes, series semanales (y lote), sesiones (crear, editar, cancelar), clientas (lista, ficha, cierre), personal (invitar, rol, sucursales, desactivar), pagos (lista, pendientes, recibo, confirmar, rechazar), promociones y contactos, evaluaciones, referidos, créditos, reporte de ingresos, insumos, retiros, pagos de sueldo, categorías y gastos, reporte de gastos |
| Sistema | notificaciones y dispositivos, subidas de imágenes, salud (`live`, `ready`), enlaces verificados |

**Reglas de negocio tal como están codificadas** (las que cambian con el reglamento de Emma están en negrita):

| Regla | Valor | Archivo |
| --- | --- | --- |
| **Ventana de cancelación** | **2,5 h**; dentro de ella no se cancela, sólo se reprograma al mismo día; la constante está repetida en cuatro archivos | `booking/commands/cancel-booking.ts:29` y tres más |
| **Chequeo de sesión vacía** | **2 h antes**, una sola vez, cancela sólo con **cero** reservas; cierra la lista de espera y avisa a la instructora y a las de la lista | `booking/sessions/session-start-checks.ts:4` |
| Lista de espera | FIFO, promoción automática al liberarse un cupo (consume la clase, avisa); no se une ni se promueve dentro de la ventana; se cierra sin aviso al empezar la sesión | `booking/commands/promote-waitlist.ts` |
| Reserva | sesión futura con cupo, suscripción activa que cubre la fecha y con clases, sin solape horario; consume una clase al crearse | `booking/commands/create-booking.ts` |
| **Duración del plan** | **meses calendario** 1, 3, 6 o 12 (restringido en TypeScript, no en la base); el fin es el mismo día del mes, recortado al último día | `booking/payments/subscription-term.ts` |
| Inicio de la suscripción | día de la **confirmación** del pago | `prisma-payment-commands.ts:529` |
| Expiración | sin job: se marca al comprar, confirmar o cerrar cuenta; «efectiva» = fin ≥ hoy y (clases > 0 o reservas futuras) | `purchase-eligibility.ts` |
| **Renovación** | sólo cuando la suscripción actual ya no es efectiva (`subscription_not_expired`) | `purchase-eligibility.ts:40-76` |
| Recordatorio de vencimiento | 3 días antes, con igualdad exacta de fecha | `notifications/remind-expiring-subscriptions.ts` |
| Intención de compra | 24 h, una abierta por clienta, reserva el crédito | `prisma-payment-commands.ts` |
| Pago en efectivo | asistente de la sucursal o administración; confirmado al instante | `prisma-payment-commands.ts:611` |
| **Referido** | **Bs 60 de crédito** a la referidora al confirmarse el primer pago de la referida; la variable de entorno sólo acepta ese valor | `referral-attribution.ts`, `config/environment.ts:91` |
| Asistencia | sólo la instructora asignada, sólo tras la hora de fin, lista completa en un guardado; corrección ilimitada sin auditoría | `booking/commands/record-attendance.ts` |
| Materialización | 30 días adelante, cada hora | `booking/materialization-horizon.ts` |
| Evaluaciones | turnos de 45 min, una por mes con plan efectivo, reservar y cancelar hasta 3 h antes, recordatorios 24 h y 1 h | `evaluations/evaluation-rules.ts` |
| Sesiones admin web | 30 min de inactividad y 12 h absolutas; móvil 30 y 90 días | `create-authentication-session.ts` |
| Límites | login con espera progresiva desde el 6.º fallo; correos 1/min, 5/h, 10/día; 1.200 peticiones por minuto por dirección y 600 por credencial, en memoria del proceso | `login-throttle-policy.ts`, `request-rate-limit.ts` |

Casi todas las reglas son constantes en el código; la única configurable por entorno es el premio por referido, y sólo acepta 6000 centavos. Cambiar una regla implica glosario, código, pruebas, OpenAPI y textos de las apps.

**Worker** (pg-boss, un proceso aparte, latido cada 30 s a Better Stack):

| Trabajo | Cadencia | Qué hace |
| --- | --- | --- |
| Correo de autenticación | cola | Verificación, activación, recuperación, cambio de correo por Resend; respeta supresiones; 3 reintentos |
| Finalizar subida | cola | Verifica bytes, genera variantes con sharp, publica en R2 |
| Envío de push | cola | Una push por notificación a cada dispositivo; 5 reintentos |
| Materialización de sesiones y turnos | cada hora | Horizonte de 30 días |
| Chequeo de sesión vacía y cierre de listas | cada minuto | Ver reglas |
| Recordatorios de evaluación | cada minuto | 24 h y 1 h antes |
| Recordatorio de vencimiento | cada hora | 3 días antes |
| Expiración de intenciones de compra | cada 5 min | Libera crédito, programa el borrado del comprobante |
| Recibos de push | cada 5 min | Consulta recibos a Expo, desactiva dispositivos dados de baja |
| Limpiezas | cada hora | Cuentas pendientes vencidas, subidas abandonadas, retención de filas operativas |

**Catálogo de notificaciones** (bandeja por cuenta más push; una fila por evento de negocio): `waitlist_promoted`, `session_cancelled`, `session_rescheduled_by_studio`, `session_assigned`, `evaluation_booked`, `evaluation_cancelled`, `evaluation_cancelled_by_studio`, `evaluation_reminder_day`, `evaluation_reminder_hour`, `payment_submitted` (a todos los administradores), `payment_confirmed`, `payment_rejected`, `subscription_expiring`. No existe ninguna notificación por **recordatorio de clase**, nueva reserva, plan vencido ni promoción; la categoría «anuncio» existe en el enum pero nada la produce.

**Reportes existentes.** `GET /administrator/reports/income` suma pagos confirmados por fecha de decisión, por método y por mes (con sucursal: sólo efectivo cobrado allí), cargando las filas en memoria. `GET /administrator/reports/expenses` suma gastos por categoría y mes y los pagos de sueldo sólo sin filtro de sucursal. Las listas de evaluaciones, referidos y créditos son de sólo lectura. No hay reportes de asistencia, ocupación, clientas activas, clases consumidas frente a compradas ni exportación.

### 1.4 App de clientas (`apps/client-mobile` y `packages/mobile-core`)

**Stack y estructura.** Expo 57 con React Native 0.86 y React 19; React Navigation 7 (cuatro pestañas: Inicio, Reservar, Mis Reservas, Perfil, cada una con su propio stack nativo y un límite de error por pantalla); TanStack Query 5 con caché persistida en AsyncStorage sólo para una lista blanca de lecturas (sesiones, reservas, suscripción); React Hook Form y Zod en formularios; cliente REST generado con Orval desde el OpenAPI del backend (`packages/api-contracts`); credenciales en SecureStore con opción biométrica; Sentry para errores; push por Expo. Todo lo compartido con la app de staff vive en `packages/mobile-core` (autenticación, enlaces verificados, notificaciones, moneda, tiempo en `America/La_Paz`, componentes de UI). Tamaño: 55 archivos fuente y 42 de prueba (164 casos) en la app; 91 fuente y 70 de prueba (284 casos) en `mobile-core`; 12 flujos Maestro. `typecheck` y `lint` en verde; ningún archivo supera las 400 líneas; sin TODO, pruebas saltadas ni `ts-ignore`.

**Pantallas y endpoints.**

| Pantalla | Propósito | Endpoints |
| --- | --- | --- |
| Inicio | Saludo, carrusel de promociones, tarjeta del plan o de compra, accesos rápidos | `clients/current`, `clients/current/subscription`, `evaluations`, `clients/current/referrals`, `promotions` |
| Reservar y Detalle de sesión | Sucursal, 7 días, filtro por tipo de clase, cupos, reservar o lista de espera | `branches`, `class-types`, `sessions`, `sessions/:id/bookings`, `sessions/:id/waitlist-entries` |
| Mis reservas, Reprogramar, Historial | Próximas reservas y listas de espera, cancelar, reprogramar al mismo día, clases asistidas por mes | `bookings`, `bookings/:id`, `bookings/:id/reschedule`, `waitlist-entries/:id`, `bookings/history` |
| Elige tu plan, Detalle del plan, Pago, Estado del pago, Mi plan | Catálogo, desglose con crédito, intención de compra de 24 h, QR del estudio, subida del comprobante, estado (en revisión, confirmado, rechazado con motivo), clases restantes y vigencia | `plans`, `purchase-intents/*`, `credit-purchases`, `transfer-instructions/qr`, `uploads/*`, `payments/current` |
| Mis referidos, Mi crédito | Código propio, compartir, invitadas y crédito ganado; saldo disponible y reservado | `clients/current/referrals`, `clients/current/credit` |
| Evaluación nutricional (3 pantallas) | Disponibilidad mensual, confirmar, próximas y anteriores, cancelar | `evaluation-slots`, `evaluations` |
| Perfil, Editar perfil, Cambiar contraseña, Notificaciones, Cerrar mi cuenta | Datos, foto, cambio de correo con enlace, bandeja con no leídas, consentimiento de promociones, cierre con consecuencias calculadas | `clients/current`, `clients/current/photo`, `accounts/current/*`, `notifications/*`, `accounts/current/closure` |

**Funcionalidades y estado.**

| Funcionalidad | Estado | Observaciones |
| --- | --- | --- |
| Registro con verificación por correo, código de referido opcional, corrección y reenvío | Completa | Validación de correo laxa (`includes("@")`) en registro y recuperación |
| Login, biometría, recuperación, activación por enlace, límites de intentos | Completa | Compartido en `mobile-core` |
| Cambio de contraseña y de correo | Completa | El correo cambia sólo al abrir el enlace de 24 h |
| Perfil y foto (recorte, subida, variantes privadas) | Completa | El teléfono se guarda sin validar formato |
| Inicio con promociones y accesos | Completa | «Paquetes desde Bs 560» está escrito en el código, no viene del catálogo |
| Explorar y reservar sesiones | Completa | Sólo 7 días y 100 sesiones por consulta; sin tope semanal |
| Cancelar reserva | Completa según la regla actual | Ventana de 2,5 h calculada también en el teléfono; dentro de la ventana no se puede cancelar |
| Reprogramar | Completa según la regla actual | Sólo dentro de la ventana, mismo día; sin clave de idempotencia; todos los errores se muestran como el mismo mensaje genérico |
| Lista de espera | Completa | La app ofrece unirse aunque falten menos de 2,5 h y el servidor lo rechace con un mensaje genérico |
| Historial de clases | Completa | Agrupado por mes, sólo asistencias |
| Plan actual, clases restantes, vigencia | Completa según la regla actual | «Válido por 1 mes», «Pagado hasta»; no hay vigencia en días ni clases extra |
| Compra de plan por transferencia (QR, comprobante, estado) y con crédito | Completa | Flujo robusto: reanuda la intención abierta, bloquea el cierre de cuenta con un pago pendiente, guarda el QR en la galería |
| Renovación | Parcial | Sólo tras el vencimiento: «Podrás comprar un plan nuevo cuando este termine» |
| Referidos y crédito | Completa según el modelo actual | Crédito en dinero (Bs 60) al primer pago de la referida; sin tope mensual ni clase gratis para la amiga |
| Evaluaciones nutricionales | Completa | Una por mes con plan activo; recordatorios un día y una hora antes |
| Notificaciones (bandeja, badge, push, hoja de permiso propia) | Completa | Sin recordatorios de clase: el catálogo no los tiene |
| Cierre de cuenta y consentimiento de promociones | Completa | Consecuencias calculadas, contraseña, Promotion Contact opcional |
| Sin conexión | Parcial | Banner y caché de sesiones, reservas y suscripción; Inicio falla sin red porque exige el perfil, que no se guarda |

**Textos de negocio escritos en el código** que deberían venir del servidor o de configuración: «Paquetes desde Bs 560» (Inicio), «Cancelación sin costo hasta 2 h 30 antes de cada clase» y «clases en cualquier sucursal del estudio» (Detalle del plan), «sesiones de 45 min», «hasta 3 horas antes», «un día antes y una hora antes», «una evaluación disponible por mes» (Evaluaciones), «versión 1.0» (Perfil, mientras la app está en 1.0.1), y los plazos de 24 h, 30 min, 7 y 30 días de los enlaces repetidos en varios textos. Cualquier cambio de regla obliga a tocar la app y publicar una actualización.

### 1.5 App de staff (`apps/staff-mobile`)

**Stack y estructura.** Mismo stack que la app de clientas (Expo 57, React Native 0.86, React 19, React Navigation 7, TanStack Query 5, Sentry) y el mismo paquete compartido `mobile-core` para autenticación, biometría, enlaces, notificaciones y UI. Tras el login, el rol de la cuenta (instructora, asistente, nutricionista, administración) elige un stack nativo propio (`src/navigation.tsx`); no hay pestañas. Perfil, notificaciones y cambio de contraseña se comparten entre los cuatro stacks y se abren desde el avatar de la cabecera. En tablet (ancho ≥ 768) la asistente trabaja con búsqueda a la izquierda y la ficha de la clienta en un panel lateral. 57 archivos fuente (7.456 líneas), 41 archivos de prueba (126 casos) y 10 flujos Maestro; `typecheck` y `lint` en verde; sin TODO ni pruebas saltadas.

| Rol | Pantalla raíz | Pantallas | Endpoints principales |
| --- | --- | --- | --- |
| Instructora | Agenda | Agenda del día (tira de 7 días), lista de asistentes y asistencia | `trainer/sessions`, `trainer/sessions/:id/roster`, `sessions/:id/attendance` |
| Asistente | Buscar clienta | Buscar, nueva clienta (invitación), resumen, explorar sesiones, detalle, elegir plan, confirmar pago en efectivo, reservas de la clienta, reprogramar, historial | `assistant/clients/*`, `sessions`, `bookings`, `waitlist-entries`, `assistant/client-invitations/*` |
| Administración | Pagos pendientes | Pagos pendientes, revisar pago (recibo), cancelar una clase (selector), cancelar sesión, «Ver la app como…» | `administrator/payments/*`, `administrator/sessions/*`, `administrator/staff-members`, `impersonations` |
| Nutricionista | Agenda | Agenda de evaluaciones, disponibilidad semanal, formulario de bloque | `nutritionist/evaluations`, `nutritionist/availability-blocks/*` |

**Funcionalidades y estado.**

| Funcionalidad | Rol | Estado | Observaciones |
| --- | --- | --- | --- |
| Login, biometría, recuperación, enlaces de correo | Todos | Completa | Compartido con la app de clientas; sin registro (sólo invitación) |
| Perfil | Todos | Parcial | Sólo lectura (nombre, correo, teléfono, rol, sucursales); «versión 1.0» fija en el pie mientras `app.json` dice 1.0.1 |
| Notificaciones (bandeja, badge, push) | Todos | Parcial | Bandeja y push completos; las notificaciones de la asistente no abren ninguna pantalla al tocarlas |
| Agenda de la instructora | Instructora | Parcial | Sesiones por día con reservadas/capacidad; falta el nombre del día y el rótulo de rol (UX-007); si falla el perfil se ignora el error |
| Lista de asistentes y asistencia | Instructora | Parcial | Marca «Asistió / No asistió» sólo después de la hora de fin, en un solo guardado, corregible; sin lista de espera; sin estado vacío real (UX-009); la condición «clase terminada» se evalúa al abrir la pantalla |
| Búsqueda de clientas | Asistente | Completa | Búsqueda con 2 caracteres y sin tildes; etiqueta «Pendiente» |
| Resumen de clienta | Asistente | Completa | Plan (activa/vencida, clases restantes, vence el), próxima reserva, historial reciente, invitación pendiente |
| Reservar para una clienta, lista de espera, cancelar, reprogramar, historial | Asistente | Completa | Misma regla de 2,5 h que la clienta; reprogramar sólo dentro de la ventana, mismo día y sucursal; el rechazo «ya tiene reserva» o «plan activo» llega al final del flujo (UX-003) |
| Cobro en efectivo (elegir plan, cotización con crédito, confirmar) | Asistente | Parcial | Completo para efectivo por plan con clave de idempotencia; sin comprobante para la clienta, sin QR ni transferencia desde recepción, sin descuento alguno |
| Invitar clienta nueva y gestionar la invitación | Asistente | Completa | Correo en uso, límites de envío con cuenta regresiva, clienta auto-registrada pendiente |
| Pagos pendientes y revisión de transferencias | Administración | Parcial | Recibo ampliable, confirmar, rechazar con motivo; si falla la descarga del recibo queda «Cargando el comprobante…» para siempre |
| Cancelar una sesión con reservas | Administración | Completa | Avisa cuántas reservas y lista de espera afecta; devuelve la clase y notifica |
| «Ver la app como…» (impersonación) | Administración | Completa | 30 minutos, franja fija con cuenta regresiva y «Salir»; confirmación con diálogo nativo (UX-002) |
| Agenda y disponibilidad | Nutricionista | Completa | Bloques semanales con fecha efectiva; cancelar evaluación |
| Sin conexión | Todos | Parcial | Banner global; sólo la agenda de la instructora se guarda en caché; sin cola de acciones |
| Administración: clientas, reservas, cobros | Administración | No existe | El stack de administración no tiene búsqueda de clientas ni cobro; sólo llega a ellos impersonando a una asistente |

**Datos fijos en el código** que convendría centralizar: la tira de 7 días de la agenda, «45 min» en los textos de disponibilidad, «vence en 7 días / 30 días / 24 horas» en las invitaciones (copias de constantes del servidor), límites `limit: 100` y `pageSize: 100` en listas, y colores y tipografías literales en 8 y 5 sitios respectivamente en lugar de los tokens.

### 1.6 Web de administración (`apps/admin-web`)

**Stack y estructura.** Vite 8 con React 19; TanStack Router (rutas tipadas, estado de filtros y paginación en la URL con Zod, carga perezosa por página), TanStack Query y TanStack Table; componentes propios al estilo shadcn sobre Radix y Tailwind 4; React Hook Form y Zod; Sentry con túnel propio; Jest 30 con Testing Library y MSW; Playwright contra un backend real con base de datos desechable. Se despliega en Vercel desde GitHub Actions; un middleware reenvía `/api/v1` al API con una cookie de sesión host-only y una prueba de origen (ADR-0084, ADR-0087). Cabeceras de seguridad estrictas (CSP sin `unsafe-inline`, HSTS). Tamaño: 230 archivos fuente (17.651 líneas, ninguno sobre 400), 84 archivos de prueba Jest (487 casos), 14 archivos Playwright (17 recorridos). `typecheck` y `lint` en verde; sin TODO ni pruebas saltadas. **No hay librería de gráficos**: el único gráfico es un diagrama de barras hecho a mano con `div` para el reporte.

**Rutas.**

| Sección | Rutas | Qué hace |
| --- | --- | --- |
| Acceso | `/iniciar-sesion`, `/recuperar-contrasena`, `/crear-contrasena` | Login con límites de intentos, recuperación y activación por enlace; sesión de 30 min detectada al fallar una petición |
| Horario | `/` (semana por sucursal) | Cuadrícula semanal, crear sesión única o serie desde un hueco o el botón, editar ocurrencia o serie, terminar serie, cancelar sesión con reservas |
| Catálogo | `/catalogo/sucursales`, `/catalogo/tipos-de-clase`, `/catalogo/planes` | Crear, editar, archivar; planes con visibilidad en la app |
| Back office | `/back-office/clientes`, `/pagos`, `/insumos`, `/insumos/retiros`, `/personal`, `/nomina`, `/gastos`, `/categorias-de-gasto`, `/evaluaciones-nutricionales` | Directorio y ficha de clientas con cierre de cuenta; cola y revisión de transferencias; insumos con movimientos; personal (invitar, rol, sucursales, desactivar); pagos de sueldo manuales; gastos por categoría |
| Reporte | `/reporte` | Ingresos y gastos en un rango de fechas por sucursal |
| Promociones | `/promociones`, `/promociones/contactos`, `/referidos`, `/creditos` | Carrusel con imagen y orden; contactos para promociones con exportación CSV; listas de referidos y créditos |

**Funcionalidades y estado.**

| Funcionalidad | Estado | Observaciones |
| --- | --- | --- |
| Login, recuperación, sesión, cambio de contraseña, cierre de sesión | Completa | Sin aviso previo de expiración ni «cerrar las otras sesiones» que ADR-0030 prevé |
| Horario semanal, crear/editar/terminar series, cancelar sesión | Completa | Sin lista de asistentes por sesión (sólo el conteo); máximo 100 sesiones por semana con aviso |
| Sucursales, tipos de clase, planes | Completa | Archivar sin desarchivar; el plan se define en meses |
| Clientas: lista, búsqueda, ficha, cierre de cuenta | Completa en lectura | Sin edición de datos ni historial de pagos y reservas en la ficha |
| Personal: invitar, reenviar, corregir correo, rol, sucursales, desactivar | Completa | Sin reactivar |
| Pagos: cola pendiente, filtros, revisión del recibo, confirmar, rechazar con motivo | Completa | Los pagos ya decididos no se pueden abrir (sin ver recibo ni motivo); no se registran pagos en efectivo desde la web |
| Insumos, retiros, reposiciones, consumo mensual | Completa | — |
| Nómina (pagos de sueldo) | Completa como registro manual | No calcula nada: monto y fecha |
| Gastos y categorías | Completa | Sin descripción, proveedor ni recurrencia; sin filtro de fechas |
| Evaluaciones, referidos, créditos | Completa, sólo lectura | Sin ajustes manuales de crédito |
| Reporte de ingresos y gastos | Parcial | Ver abajo |
| Promociones y contactos | Completa | — |
| Monitoreo de errores | Completa | Sólo en producción; staging no reporta |

**Qué muestra exactamente el reporte** (`/reporte`): dos campos de fecha nativos (últimos 6 meses por defecto, sin atajos de «este mes» o «mes pasado») y el selector de sucursal con «Todas»; tres mosaicos (Ingresos con la línea «Efectivo · Transferencias», Gastos como nómina más gastos, Neto); barras por mes de ingresos y gastos; tabla de gastos por categoría (nómina sólo en «Todas»); tabla de totales por mes. Los ingresos son **pagos confirmados por fecha de decisión**: caja pura, sin devengo, sin detalle por plan ni por día, sin impuestos, sin exportación ni comparación con el período anterior. El total incluye los pagos cubiertos sólo con crédito, pero la línea de desglose sólo nombra efectivo y transferencias, así que las partes no suman el total.

**Reutilizable para la capa económica:** los controles de rango y sucursal del reporte, la página-lista genérica (`catalog-page.tsx`) que ya usan nueve pantallas, las tablas TanStack con paginación en la URL, los paneles laterales, los campos de dinero y fecha, el formato «Bs 1.200,00» y el patrón de estado en la URL para los parámetros de un simulador.

### 1.7 Integraciones existentes

| Integración | Estado | Detalle |
| --- | --- | --- |
| Correo transaccional (Resend) | Real | Verificación, activación, recuperación y cambio de correo desde `no-responder@emmapilatesstudio.com`; webhook firmado de rebotes y quejas; en local se escribe a disco. Plan gratuito: 100 correos al día compartidos entre staging y producción |
| Push (Expo Push Service + Firebase) | Real en Android | iOS espera la clave APNs del Apple Developer Program |
| Almacenamiento de imágenes y backups (Cloudflare R2) | Real | Comprobantes, fotos de perfil y promociones con variantes; dump diario de la base con bloqueo de 25 días y retención de 30 y 365 días; simulacro de restauración hecho |
| Monitoreo (Better Stack, Sentry SDK) | Real | Errores saneados sin datos personales de API, worker, admin web y apps; cuatro monitores de disponibilidad; latidos de worker y backup; alertas por correo |
| Hosting | Real | Northflank (API, worker, migraciones, backup), Aiven (PostgreSQL), Vercel (admin web), Cloudflare Pages (páginas públicas) |
| Tiendas | Parcial | Google Play en pruebas internas; Apple no iniciado |
| **Pasarela de pagos** | **No existe** | Un QR estático servido por la API; la clienta transfiere desde su banco y sube el comprobante; una persona lo confirma (decisión ADR booking 0002) |
| **Facturación e impuestos** | **No existe nada** | Ninguna referencia a factura, NIT, SIAT, IVA o impuestos en código ni base de datos; no se emite comprobante a la clienta |
| WhatsApp, SMS, CRM, analítica de producto | No existen | — |

### 1.8 Problemas detectados

Lo primero que hay que decir: el código está inusualmente limpio para su tamaño. Cero TODO, cero pruebas saltadas, cero `ts-ignore` o `eslint-disable` sin justificar en las cuatro aplicaciones; ningún archivo supera las 400 líneas; ningún borrado físico en la base; dinero siempre en enteros; registros y reportes de error sin datos personales; CI en verde en `main`. Los hallazgos son puntuales.

**Bugs y comportamientos incorrectos**

| Sev. | Dónde | Hallazgo |
| --- | --- | --- |
| Media | `apps/backend/src/booking/administration/prisma-oversight.ts:207-244` | La consulta de saldos de crédito de la lista AW27 ignora los asientos de cierre de cuenta, mientras el resumen de la clienta sí los resta: una clienta que cerró su cuenta con crédito sigue apareciendo con saldo positivo y el total «en saldo activo» queda inflado |
| Media | `apps/backend/src/booking/administration/prisma-session-exceptions.ts:157-168` | Subir la capacidad de una sesión no promueve la lista de espera; los cupos nuevos quedan sin asignar hasta la próxima cancelación |
| Media | `apps/backend/src/booking/commands/prisma-booking-commands.ts:650-673` | La corrección de asistencia es ilimitada, sin auditoría ni actualización de la fecha de registro; importa si la asistencia pasa a determinar el pago de las instructoras |
| Media | `apps/admin-web/src/report/report-tiles.tsx:60-66` | El total de ingresos incluye los pagos cubiertos sólo con crédito, pero el desglose nombra únicamente efectivo y transferencias: las partes no suman el total |
| Media | `apps/staff-mobile/src/trainer/trainer-agenda-screen.tsx:120`, `src/navigation.tsx:101-111` | Las dos pantallas de la instructora no comprueban el estado HTTP; un 403 o 500 hace que la pantalla lance un error de render en lugar de mostrar «Reintentar» |
| Media | `apps/staff-mobile/src/administrator/review-payment-screen.tsx:60-72` | Si falla la descarga del comprobante queda «Cargando el comprobante…» para siempre y se puede confirmar sin verlo |
| Media | `apps/client-mobile/src/booking/reschedule-screen.tsx:88-95` | Reprogramar no envía clave de idempotencia (reservar y lista de espera sí); un doble toque puede duplicar la operación |
| Media | `apps/client-mobile/src/booking/session-detail-screen.tsx:258-287` | La app ofrece unirse a la lista de espera aunque falten menos de 2,5 h; el servidor lo rechaza y la app muestra un error genérico que invita a reintentar |
| Media | `apps/client-mobile/src/booking/bookings-screen.tsx:171-181`, `reschedule-screen.tsx:108` | Los rechazos de negocio (ventana de cancelación, destino no elegible, clase llena) se muestran como «Inténtalo de nuevo» |
| Media | `apps/client-mobile/src/home/home-screen.tsx:146-162` | Sin conexión, Inicio falla aunque la suscripción esté en caché, porque exige el perfil, que no se persiste |
| Baja | `apps/backend/src/notifications/remind-expiring-subscriptions.ts:18-21` | El recordatorio de vencimiento compara la fecha con igualdad exacta: si el worker cae más de 24 h, ese día de vencimiento se queda sin aviso |
| Baja | `apps/client-mobile/src/evaluations/my-evaluations-screen.tsx:220-227` | Toda evaluación pasada se rotula «Realizada» sin mirar si fue cancelada |
| Baja | `apps/client-mobile/src/profile/edit-profile-screen.tsx:36` | El teléfono se guarda sin validación de formato (importa para WhatsApp) |

**Código incompleto, duplicado o muerto**

| Sev. | Dónde | Hallazgo |
| --- | --- | --- |
| Media | Backend (4 archivos), `packages/mobile-core/src/time/session-format.ts:82`, `apps/client-mobile/src/plans/plan-detail-screen.tsx:157` | La ventana de 2,5 h está escrita seis veces entre servidor, núcleo móvil y textos; el chequeo de 2 h dos veces. Cambiarla a 12 h sin centralizarla es un riesgo de inconsistencia |
| Media | Textos fijos en las apps (secciones 1.4 y 1.5) | Precios, plazos y reglas escritos en pantalla; cada cambio obliga a publicar una versión |
| Baja | `apps/backend/src/booking/evaluations/evaluation-notifications.ts:13-42` | Un catálogo de textos de push que nadie importa, distinto del catálogo real |
| Baja | `apps/backend/src/booking/payments/payments.dto.ts:241-262` | Campos bancarios deprecados aún en el contrato (PAY-004 pendiente) |
| Baja | `ClassType.durationMinutes`, categoría `announcement` | Columna deprecada que el API responde como 60 fijo; categoría de notificación sin productor |
| Baja | `apps/staff-mobile/src/navigation.tsx:81-191` | La pantalla de asistencia vive dentro del archivo de navegación (396 líneas, al borde del límite) |
| Baja | Admin web | Archivar sucursal, tipo de clase o insumo y desactivar personal no tienen vuelta atrás; los pagos ya decididos no se pueden abrir; la ficha de clienta no edita datos ni muestra pagos |
| Baja | Ambas apps | Confirmaciones con diálogo nativo (UX-002), notificaciones de la asistente sin destino, «versión 1.0» fija, colores y tipografías literales fuera de los tokens, registro de género mixto (UX-005) |

**Riesgos de seguridad** (ninguno grave)

| Sev. | Dónde | Hallazgo |
| --- | --- | --- |
| Media | `apps/backend/src/http/request-rate-limit.ts:49-70` | El límite general de peticiones vive en memoria del proceso: con más de una réplica el límite se multiplica. Hoy hay una réplica |
| Baja | `apps/admin-web/vercel.json:37-61` | El proxy `/api/v1` sólo aplica a los dos hosts de Vercel; con un dominio propio habría que ampliarlo |
| Baja | Admin web | La sesión de 30 min se descubre al fallar una petición, sin aviso previo; falta «cerrar las otras sesiones» (ADR-0030) |
| Info | — | Credenciales móviles en SecureStore; cookie host-only HttpOnly con comprobación exacta de origen; CSP sin `unsafe-inline`; subidas verificadas byte a byte; secretos de desarrollo rechazados en producción; sin SQL dinámico sin parametrizar |

**Riesgos de datos y operación**

| Sev. | Dónde | Hallazgo |
| --- | --- | --- |
| Media | Aiven Free (1 GB, 20 conexiones, sin restauración puntual, se apaga si está inactivo) | Suficiente para abrir; vigilar el disco y las conexiones (pool de 4 en producción) y prever el salto al plan pago cuando haya datos reales |
| Media | Resend Free | 100 correos al día compartidos: una campaña de registro el día de la apertura supera el límite y los correos fallan tras los reintentos |
| Baja | `apps/backend/src/booking/administration/prisma-oversight.ts:226-238` y los dos reportes | Agregan en memoria tras cargar todas las filas; aceptable al volumen de un estudio, no escala a análisis históricos (motivo para las tablas de hechos de la Parte 3) |
| Baja | `Booking` | Sin índices compuestos para el conteo de cupo y el solape; irrelevante a 143 clases al mes |
| Info | Entorno local | En esta máquina `typecheck` y `lint` del backend fallan porque el cliente Prisma generado (ignorado por git) es anterior a la migración de impersonación; la CI de `main` está en verde, así que basta regenerarlo |
| Info | Staging | Cada merge a `main` lanza un «Release Staging» que falla a los 10 minutos porque staging está pausado; es el comportamiento acordado, pero ensucia el historial de Actions y obliga a relanzar la release al reanudar |

## Parte 2: Comparación con lo que necesita el negocio

### 2.0 Las reglas codificadas frente a las reglas de Emma

El sistema se construyó con un reglamento de estudio **distinto** del que ahora define la dueña. La mayoría de las diferencias no son código a medio hacer sino reglas distintas, escritas en el glosario (`booking/CONTEXT.md`), en ADRs y en pruebas. Cambiarlas es trabajo de dominio (glosario, migración, pruebas, textos en las tres aplicaciones y en los prompts de diseño), no un ajuste de parámetros. Esta tabla es la base de todo lo que sigue.

| Tema | Regla de Emma | Regla codificada hoy | Dónde | Impacto |
| --- | --- | --- | --- | --- |
| Vigencia de planes | 30, 60 y 90 días | 1, 3, 6 o 12 **meses** calendario (`durationMonths`), fin el mismo día del mes | `Plan.durationMonths`, `subscription-term.ts` | Alto: catálogo, compra, pantallas y textos de los tres frentes |
| Catálogo de planes | 8 planes: suelta 80; 4/290; 8/590; 12/820; 16/1.120; 24/1.560 (60 d); 24/1.590; 36/2.190 (90 d) | Catálogo libre de nombre, meses, clases y precio; el Administrador lo carga en AW04 | `administrator/plans` | Bajo una vez corregida la vigencia: son datos |
| Mismo precio por equipo | Reformer, cadillac y mat al mismo precio | Los planes no están atados al tipo de clase: una suscripción sirve para cualquier sesión | Glosario «Plan», «Subscription» | Ninguno: ya cumple |
| Tope semanal | 3 clases/semana en el plan de 8 y 4 en el de 12 (y, por extensión, en los largos) | No existe: la bolsa de clases se puede gastar a cualquier ritmo, incluso toda en una semana | Glosario «Plan» | Alto: regla nueva al reservar (clientas, asistente, lista de espera) |
| Congelamiento | Una vez por plan, hasta 15 días | No existe | — | Medio: entidad nueva, corre la fecha de fin, bloquea reservas en el período |
| Planes intransferibles | Sí | Sí: la suscripción pertenece a la clienta | — | Ninguno |
| Cancelación de reserva | 12 horas de anticipación; si no, se descuenta la clase | Ventana de **2,5 horas**; fuera de ella cancelar devuelve la clase; dentro no se puede cancelar pero sí **reprogramar** a otra sesión del mismo día | `cancel-booking.ts:29`, glosario «Cancellation Window», «Reschedule» | Alto: constante, textos en apps y diseño, y decidir si la reprogramación dentro de las 12 h sigue existiendo |
| Lista de espera | Automática | Automática, en orden de llegada, consume la clase al promover y avisa; deja de promover al entrar en la ventana de cancelación (hoy 2,5 h) | `promote-waitlist.ts` | Bajo: con la ventana de 12 h habría que decidir hasta cuándo promueve |
| Mínimo para dictar una clase | 2 reservas los primeros 2 meses, luego 3; se revisa 3 h antes; se cancela y se avisa | Se cancela sólo con **cero** reservas, revisado **2 h** antes; con 1 reserva se dicta | `session-start-checks.ts:4`, `prisma-session-start-checks.ts:19` | Alto: umbral configurable por período, devolución de clase a las afectadas, aviso, y el pago de 25 Bs a la instructora |
| Renovación | Las fundadoras deben comprar dentro de los 7 días del fin del plan; lo normal en un estudio es poder comprar antes de que venza | Sólo se puede comprar un plan **después** de que el actual expire; hay recordatorio 3 días antes | Glosario «Subscription», `purchase-eligibility.ts` | Alto para retención: una clienta con 1 clase restante no puede renovar hasta vencer |
| Membresía fundadora | 40 cupos, 15 % en cualquier plan, ligada a la persona, se pierde con más de 7 días sin plan, no acumulable | No existe (ni descuentos: ADR-0007 quitó «Descuentos» de la web) | — | Alto: entidad, descuento en la compra, pérdida automática, cupo |
| Clase gratis a clientas nuevas | +1 clase al comprar el primer plan | No existe | — | Medio: ajuste de clases con motivo al confirmar el primer pago |
| Invita a una amiga | 1 invitación por clienta al mes, sólo en horarios con cupo, cada amiga gratis una sola vez; si compra, la anfitriona gana 1 clase | No existe. Lo que existe es un **código de referido** que da **Bs 60 de crédito** en dinero a la referidora cuando la referida confirma su primer pago | `Referral`, `CreditLedgerEntry`, `referral-attribution.ts` | Alto: dos mecanismos distintos (pase de invitada + recompensa en clases); el crédito en dinero sobra o se convierte |
| Código de referencia | Para atribuir clientas a instructoras o a la coordinadora | Cada clienta tiene un código; sólo clientas refieren clientas; no hay «¿cómo nos conociste?» ni atribución a personal | `Client.referralCode` | Medio: canal de adquisición y referente (clienta, instructora, coordinadora) |
| Campañas de clases extra | Inicio de año y vacaciones | Las «Promociones» son sólo contenido del carrusel, sin efecto | Glosario «Promotion» | Medio: mismo ajuste de clases con motivo «campaña» |
| Catering por convenio | Descuento para clientas | No existe | — | Bajo: puede ser contenido (promoción) o un beneficio mostrado en «Mi plan» |
| Pagos | QR y efectivo; factura | QR estático con recibo y confirmación manual; efectivo en recepción; crédito. Sin impuestos ni facturas | ADR booking 0002, `Payment` | Medio para reportes (16 % calculado); alto si se quiere facturar por SIAT |
| Cierre de caja | Diario | No existe; cada pago en efectivo registra sucursal, quién y cuándo | `Payment.collectedAtBranchId` | Medio |
| Pago a instructoras | 65 Bs + 8 Bs desde la 5.ª alumna; 25 Bs por cancelada; 10 % del primer plan de sus referidas | `SalaryPayment` sólo guarda monto y fecha; el cálculo es externo por decisión (glosario Back Office) | `back-office.prisma` | Alto: cálculo automático, atribución y vista para la instructora |
| Coordinadora | 3.500 + 50/80 por clienta nueva + bono 400 por renovación ≥ 80 % | No existe el rol ni la comisión | — | Medio |
| Equipos | 8 reformers, 8 cadillacs, mat; registro de fallas | Sólo un texto libre «equipamiento» por tipo de clase y la capacidad por sesión | `ClassType.equipmentNeeds`, `Session.capacity` | Medio |
| Sala y sucursales | Una sala, una clase a la vez, máximo 8 | Multi-sucursal, una sala por sucursal, sesiones sin solaparse, capacidad por tipo de clase y por sesión | Glosario «Branch» | Ninguno: se opera con una sucursal |
| Horario | L–V 6 clases, sábado 3 | Series semanales que generan sesiones 30 días adelante, editables desde una fecha | `SessionSchedule` | Ninguno |
| Recordatorios de clase | Deseados | No existen: hay avisos de cancelación, promoción de lista de espera, pagos y vencimiento de plan (3 días antes); los recordatorios 1 día y 1 h antes son sólo de **evaluaciones nutricionales** | catálogo de notificaciones | Medio |
| Seguimiento de 90 días | Mensajes día 2, semana 1, día 30, día 90; alertas de 7 días sin reserva y de < 4 clases en el primer mes | No existe nada | — | Alto para la retención |
| Nutricionista y evaluaciones | No aparece en el modelo de negocio | Construido completo: rol, disponibilidad, turnos, reservas, recordatorios, lista en la web | NUT-001/002 | Decisión: mantener oculto o retirar |

### 2.1 App de clientas

| Funcionalidad necesaria | Estado actual | Qué falta | Prioridad | Esfuerzo |
| --- | --- | --- | --- | --- |
| Registro, verificación por correo, inicio de sesión, recuperación y cambio de contraseña y de correo | Existe | Nada funcional. Preguntar «¿cómo nos conociste?» y el código de referencia en el registro (hoy sólo el código) | Alta | 1–2 d |
| Reservar una clase (explorar por fecha y sucursal, detalle, confirmar) | Existe | Aplicar el tope semanal al reservar; mostrar «te quedan N esta semana» | Alta | 2–3 d (con backend) |
| Cancelar con la regla de 12 horas | Parcial | La ventana es de 2,5 h. Cambiar la constante y todos los textos (app, diseño, glosario); decidir qué pasa dentro de las 12 h (hoy: reprogramar el mismo día) | Alta | 1–2 d |
| Lista de espera automática | Existe | Revisar hasta qué hora promueve con la ventana nueva | Baja | 0,5 d |
| Contador de clases restantes | Existe («Mi plan») | Mostrar también las clases extra (regalo, invitación, campaña) con su origen | Media | 0,5–1 d |
| Vigencias | Parcial | Son meses calendario; deben ser 30/60/90 días y verse así | Alta | 2–3 d (con backend y migración) |
| Topes semanales | No existe | Regla nueva (ver reservar) | Alta | incluido arriba |
| Congelamiento | No existe | Pedir el congelamiento desde «Mi plan» (fechas, máximo 15 días, una vez), ver el nuevo fin; bloqueo de reservas en el período | Media | 3–4 d |
| Compra de planes (QR, recibo, estado) | Existe | Precio con descuento fundadora; clase de regalo visible tras confirmar | Alta | 1–2 d |
| Renovación | Parcial | Permitir comprar el siguiente plan antes del vencimiento (empieza al terminar el actual) | Alta | 3–4 d |
| Membresía fundadora | No existe | Ver el beneficio y el plazo de 7 días en «Mi plan»; precio con 15 % en «Elige tu plan»; aviso cuando está por perderse | Alta | 3–4 d (con backend) |
| Clase de regalo (clientas nuevas) | No existe | Automática al confirmar el primer pago; visible como clase extra | Media | 1–2 d |
| Invita a una amiga | No existe | Pantalla «Invita a una amiga»: elegir sesión con cupo, nombre y teléfono de la amiga, una por mes; estado (asistió, compró); clase extra ganada | Media | 4–5 d |
| Códigos de referencia | Parcial | Existe el código y «Mis referidos» con crédito en Bs 60. Decidir si el crédito en dinero sigue o se reemplaza por clases | Media | 1–2 d |
| Recordatorios de clase | No existe | Push e inbox 24 h y 2 h antes (la infraestructura de notificaciones existe) | Media | 1–2 d |
| Beneficio de catering | No existe | Tarjeta informativa en «Mi plan» o una promoción del carrusel con el convenio | Baja | 0,5–1 d |
| Evaluación nutricional | Existe | Decidir si se oculta | — | 0,5 d |
| Perfil, foto, notificaciones, cierre de cuenta, consentimiento de promociones | Existe | Nada | — | — |

### 2.2 App de staff

| Funcionalidad necesaria | Estado actual | Qué falta | Prioridad | Esfuerzo |
| --- | --- | --- | --- | --- |
| Asistencia por clase (instructora) | Existe | Nada esencial; UX-009 pendiente (lista vacía) | — | — |
| Ventas y cobros en el estudio | Existe (efectivo por la asistente, con cotización y crédito) | Cobro por QR en recepción (hoy el QR sólo lo usa la clienta desde su app: la asistente no puede registrar una transferencia vista en el momento); descuento fundadora; clase de regalo; canal de adquisición | Alta | 3–4 d |
| Cierre de caja diario | No existe | Pantalla de cierre: efectivo esperado (suma de pagos en efectivo del día), contado, diferencia, nota; historial; aviso si falta | Alta | 3–4 d (con backend) |
| Cancelación de clases por mínimo de reservas | Parcial | Hoy sólo con cero reservas y 2 h antes. Umbral 2/3 por período, 3 h antes, devolver la clase a las reservadas, avisarles, registrar la causa y los 25 Bs | Alta | 2–3 d |
| Vista de la instructora: sus clases | Existe (agenda y lista de asistentes) | Nada | — | — |
| Vista de la instructora: sus pagos | No existe | Pestaña «Mis pagos»: statement del mes (clases, alumnas extra, canceladas, comisiones), estado | Media | 2–3 d (con el cálculo del backend) |
| Registro de fallas de equipos | No existe | Lista de equipos (8 reformers, 8 cadillacs, mat) y «Reportar falla» desde la agenda; marcar resuelta; ver capacidad afectada | Media | 2–3 d |
| Coordinadora | No existe | Si usa la app: alta de clientas con canal y referente, lista de vencimientos y de inactivas para contactar | Media | 2–3 d |
| Búsqueda y ficha de clienta, reservas por clienta, historial, invitación de clienta nueva | Existe | Marcar la reserva propia y el plan activo antes de la acción (UX-003) | Baja | 1 d |
| Pagos pendientes y revisión de transferencias (administración) | Existe | Nada | — | — |
| Impersonación «Ver la app como…» | Existe (recién construido, FUT-001) | Nada | — | — |
| Nutricionista (agenda, disponibilidad) | Existe | Decidir si se oculta | — | — |

### 2.3 Seguimiento de los primeros 90 días

Nada de esto existe hoy. La infraestructura necesaria sí: inbox y push por cuenta (`Notification`, `NotificationDelivery`, worker con reconciliadores), asistencia por reserva y fecha del primer pago.

| Funcionalidad necesaria | Estado actual | Qué falta | Prioridad | Esfuerzo |
| --- | --- | --- | --- | --- |
| Mensaje del día 2 («¿cómo te fue?») | No existe | Hito por clienta desde el primer pago o la primera clase; plantilla; envío por push e inbox; registro `LifecycleMessage` | Media | 1 d (sobre la base común) |
| Mensaje de la semana 1 | No existe | Igual | Media | 0,5 d |
| Mensaje del día 30 (balance del primer mes) | No existe | Igual, con sus clases tomadas | Media | 0,5 d |
| Mensaje del día 90 | No existe | Igual | Media | 0,5 d |
| Alerta: no reserva en 7 días | No existe | Regla diaria en el worker; lista «para contactar» en la app de staff y en la web; botón «contactada» | Alta | 1–2 d |
| Alerta: menos de 4 clases en el primer mes | No existe | Regla al día 15 (riesgo) y al día 30 (no activada); misma lista | Alta | 1 d |
| Base común (hitos, plantillas, reglas, lista de contacto) | No existe | Tabla de hitos, job nocturno idempotente, pantalla de lista de contacto, auditoría | Alta | 3–4 d |

Los mensajes salen hoy sólo por push e inbox de la app. Si se quieren por WhatsApp (el canal que la dueña ya eligió para promociones), hace falta un proveedor (API de WhatsApp Business o un servicio como Twilio) y su costo; ver preguntas.

### 2.4 Web de administración (resumen; la propuesta completa está en la Parte 3)

| Funcionalidad necesaria | Estado actual | Qué falta | Prioridad | Esfuerzo |
| --- | --- | --- | --- | --- |
| Catálogo de planes con vigencia en días y tope semanal | Parcial | Campos nuevos en AW04/AW05 | Alta | 1 d |
| Ingresos por plan, día y mes | Parcial (por método y mes) | Agrupaciones nuevas, gráfico | Alta | 2 d |
| Impuestos, costos fijos presupuestados, resultado mensual | No existe | Configuración, presupuesto, estado mensual | Alta | 3–4 d |
| Pago de instructoras y comisiones calculados | No existe | Tarifas, statements, aprobación | Alta | 4–6 d |
| Devengado vs cobrado | No existe | Vista de devengo y pantalla | Media | 2–3 d |
| KPIs y gráficos | No existe | Tablas de hechos, endpoints, panel | Alta | 8–12 d |
| Proyecciones y simulador | No existe | Paquete de cálculo y pantallas | Media | 6–8 d |
| Recomendaciones por reglas | No existe | Motor en el worker y panel | Media | 4–6 d |
| IA | No existe | Informe narrado y preguntas restringidas | Baja | 4–6 d |
| Fundadoras, invitaciones, canal de adquisición, equipos, cierre de caja (listas y controles) | No existe | Pantallas sobre las entidades nuevas de la Parte 2 | Media | 4–6 d |
| Gestión de personal, clientas, pagos, promociones, back office, horario | Existe | Nada esencial; cola UX-005, UX-008, UX-011 | — | — |

## Parte 3: Propuesta para la web de administración

La web de administración de hoy es una herramienta de **operación** (catálogo, horario, personal, revisión de pagos, back office, listas) con un único reporte de ingresos y gastos. Lo que pide la dueña es una capa de **dirección**: ver el negocio, proyectarlo y recibir recomendaciones. Esa capa no existe y conviene construirla como un módulo propio que **lee** lo que ya registran las apps en lugar de volver a capturar datos.

Convención de esta parte: cada propuesta dice qué dato existe hoy, qué dato falta y en qué entidad nueva se guardaría. Las entidades nuevas se resumen en 3.6.

### 3.1 Control económico

| Bloque | Qué debe mostrar | Qué existe hoy | Qué falta |
| --- | --- | --- | --- |
| **Ingresos por plan, día y mes** | Tabla y gráfico de ingresos cobrados (pagos confirmados) por plan, por día y por mes; filtro por método (QR, efectivo, crédito). | `GET /administrator/reports/income` suma pagos confirmados por método y por mes; el reporte AW16 los muestra con una escala por mes. Cada `Payment` guarda `planNameSnapshot`, `method`, `decidedAt`, `collectedAtBranchId`. | Agrupar por plan y por día (el dato ya está en `payments`; es un cambio de consulta y de pantalla). Separar «precio de lista», «descuento fundadora» y «crédito aplicado» (hoy sólo hay `planPriceCentavos`, `creditAppliedCentavos`, `amountDueCentavos`; el descuento necesita su columna). |
| **Impuestos** | 16 % sobre ventas (13 % IVA + 3 % IT) calculado sobre el ingreso cobrado del mes; mostrar venta bruta, impuesto estimado y venta neta. | Nada. | Una `TaxRule` en configuración (tasa, vigencia desde) y la columna «Impuestos» en el estado mensual. Si en el futuro se factura por SIAT, el impuesto real saldrá de las facturas emitidas, no de este estimado. |
| **Costos fijos** | Presupuesto mensual por línea (alquiler 8.500, coordinadora 3.500, recepción 3.400, servicios 600, software 150, limpieza 800, contador 800, mantenimiento 100, anuncios 1.000, insumos 400, imprevistos 10 %) frente al gasto real registrado. | `Expense` y `ExpenseCategory` registran gastos reales por fecha y categoría; `SalaryPayment` registra sueldos pagados. El reporte de gastos los suma por categoría y mes. | Un **presupuesto** (`CostBudgetLine`: categoría, monto mensual, vigencia) para comparar presupuesto vs real y para alimentar el punto de equilibrio sin esperar a que se registre cada gasto. Regla de «imprevistos 10 %» como línea calculada. |
| **Pago de instructoras calculado** | Por instructora y mes: clases dictadas × 65 Bs; alumnas desde la 5.ª × 8 Bs; clases canceladas por mínimo × 25 Bs; 10 % del primer plan de cada alumna que trajo; total; estado (borrador, aprobado, pagado). | Todo el insumo existe: `Session` (instructora, estado, causa de cancelación), `Booking` y `AttendanceRecord` (cuántas asistieron), `Payment` (primer plan de cada clienta). `SalaryPayment` registra el pago hecho (monto y fecha, sin detalle). | `PayRateRule` (tarifas vigentes), `InstructorPayStatement` con sus líneas generadas por el worker al cierre de mes (o bajo demanda), la atribución clienta → instructora (3.6) y la nueva causa de cancelación «mínimo no alcanzado». Decidir si se paga por **reservas** o por **asistencias** (pregunta 9). Al confirmar el pago, se crea el `SalaryPayment` ligado al statement. |
| **Comisiones de la coordinadora** | 3.500 base + 50 Bs por clienta nueva en plan mensual + 80 Bs en bimestral/trimestral + 400 Bs de bono si renovó ≥ 80 % de las que vencieron en el mes; una sola comisión por clienta (si la trajo una instructora, no cobra). | Nada (la coordinadora no es un rol del sistema). | `CommissionRule`, la atribución de cada clienta nueva (canal, quién la trajo), el cálculo mensual de renovación (3.2) y un `CoordinatorPayStatement`. La coordinadora puede ser un `StaffMember` con un rol nuevo sólo para figurar en nómina, sin acceso a la app. |
| **Resultado mensual** | Estado de resultados simple: ingreso cobrado, ingreso devengado, impuestos, costos fijos (real y presupuesto), pago a instructoras, comisiones, resultado, margen; comparación con el mes anterior y con el punto de equilibrio. | Los dos reportes (ingresos y gastos) por separado. | Un endpoint `GET /administrator/finance/monthly-statement?month=` que consolide las piezas anteriores y una pantalla «Finanzas» con el estado por mes y la tabla de 12 meses. |
| **Devengado vs cobrado** | Para cada plan vendido, repartir el ingreso en línea recta a lo largo de su vigencia (30, 60 o 90 días) o por clase consumida; mostrar por mes el ingreso devengado, el cobrado y el **pasivo diferido** (dinero cobrado por clases aún no dadas). | `Subscription` tiene `startsOn`, `endsOn`, `originalClassAllowance`, `remainingClassAllowance` y su `Payment`. | Una vista materializada `subscription_revenue_by_month` calculada por el worker (sin nueva captura de datos). Elegir el criterio (pregunta 12): por días de vigencia es el estándar contable; por clase consumida refleja mejor el costo. Recomendación: devengar por días y mostrar «clases pendientes de dar» como dato complementario. |

### 3.2 Indicadores clave (KPIs) y sus fórmulas

Todas las fórmulas se calculan sobre **sesiones dictadas** (estado programada y hora de fin pasada) salvo que se diga lo contrario; las canceladas se cuentan aparte como capacidad perdida. «Mes» es el mes calendario de Bolivia.

| KPI | Fórmula | Datos que existen | Datos que faltan |
| --- | --- | --- | --- |
| Alumnas promedio por clase | Σ reservas vigentes al inicio de cada sesión dictada ÷ nº de sesiones dictadas. Variante «asistencia»: Σ asistencias registradas ÷ sesiones dictadas. | `Booking` (estado), `AttendanceRecord`, `Session`. | Ninguno. Conviene guardar un snapshot por sesión (`session_facts`) para no recalcular sobre tablas transaccionales. |
| Ocupación | Σ reservas ÷ Σ capacidad de las sesiones dictadas. Variante «programada»: incluye en el denominador las canceladas por mínimo. | `Session.capacity`, reservas. | Ninguno. |
| Distancia al punto de equilibrio | En alumnas por clase: 3,6 − promedio real. En Bs: ingreso de equilibrio − ingreso devengado del mes. En clientas: (ingreso faltante) ÷ ingreso promedio por clienta activa. El ingreso de equilibrio se calcula con el simulador (3.4): (costos fijos + pago a instructoras) ÷ (1 − tasa de impuestos). | Ingresos, sesiones. | Presupuesto de costos fijos, tarifas, tasa de impuesto (configuración). |
| Clientas activas | Clientas con una suscripción vigente el último día del mes (o hoy), excluyendo congeladas. Variante «activas de verdad»: además con al menos una reserva en los últimos 30 días. | `Subscription`. | Congelamiento (entidad nueva, Parte 2). |
| Clientas nuevas por canal | Clientas cuyo **primer** pago confirmado cae en el mes, agrupadas por canal («¿cómo nos conociste?», código de referencia, invitación de amiga, instructora, coordinadora, Instagram, etc.). | `Payment` (primer pago por clienta). | `ClientAcquisition` (canal, referente, código) capturado en el registro o por recepción. |
| Conversión de clase de regalo o invitación a plan | Invitadas que compraron un plan dentro de 30 días de su clase gratis ÷ invitadas que asistieron a su clase gratis. Lo mismo para la clase de regalo de clientas nuevas (que ya compraron: ahí la métrica útil es «segunda compra»). | Pagos. | `GuestPass` (invitación) con asistencia registrada. |
| Activación | Clientas nuevas del mes M con ≥ 4 asistencias en sus primeros 30 días ÷ clientas nuevas del mes M. | `AttendanceRecord`, primer pago. | Ninguno; sólo la definición de «nueva» (primer pago confirmado). |
| Retención a 90 días | Clientas de la cohorte M (primer pago en M) que tienen una suscripción vigente, o compraron una, en el día 90 ÷ cohorte M. | Suscripciones. | Ninguno. |
| Porcentaje de renovación | Clientas cuyo plan venció en el mes y compraron otro dentro de 7 días (la ventana de fundadoras; configurable) ÷ clientas cuyo plan venció en el mes. Es la misma base del bono de la coordinadora. | Suscripciones, pagos. | Renovación anticipada (hoy sólo se puede comprar tras el vencimiento; la métrica debe contar también la compra previa al vencimiento cuando exista). |
| Fundadoras vendidas y su costo | Nº de membresías fundadoras activas (tope 40); costo = Σ (precio de lista − precio pagado) en el período y acumulado; costo proyectado = descuento promedio × planes esperados. | — | `FounderMembership` y la columna de descuento en `Payment`. |
| Ingreso promedio por clienta (ARPC) | Ingreso devengado del mes ÷ promedio de clientas activas del mes. Variante por cobro: ingreso cobrado ÷ clientas que pagaron. | Pagos, suscripciones. | Devengado (3.1). |
| Complementarios recomendados | **No-show**: no-shows ÷ reservas vigentes al inicio. **Cancelación tardía**: cancelaciones dentro de la ventana ÷ reservas. **Clases perdidas por vencimiento** (breakage): Σ `remainingClassAllowance` de suscripciones vencidas ÷ Σ `originalClassAllowance`. **Demanda insatisfecha**: entradas de lista de espera cerradas sin promoción. **Ingreso por clase dictada**. **Valor de vida estimado**: ARPC × meses promedio de permanencia. | Todos existen. | Ninguno. |

### 3.3 Gráficos

| Qué mostrar | Tipo de gráfico | Fuente |
| --- | --- | --- |
| Evolución mensual: ingreso cobrado, ingreso devengado, costos totales y resultado | Líneas (ingresos, resultado) sobre barras apiladas (costos fijos, instructoras, comisiones, impuestos); línea punteada del punto de equilibrio | Estado mensual (3.1) |
| Ocupación por horario y día de la semana | Mapa de calor día × hora con el promedio de alumnas por clase de las últimas 4 u 8 semanas; celdas bajo el mínimo en el tono de advertencia | `session_facts` |
| Mezcla de planes | Barras apiladas al 100 % por mes (planes vendidos por tipo) y anillo del mes actual por ingreso | Pagos |
| Embudo de clientas nuevas | Embudo: registradas → clase de regalo o invitación asistida → primer plan → activadas (4+ clases) → renovaron → activas a 90 días | Cohortes |
| Cohortes de retención | Tabla de calor: mes de alta en filas, meses 1, 2, 3 en columnas, % que sigue activa | Suscripciones |
| Clientas activas frente al punto de equilibrio | Área (activas) con línea objetivo (clientas necesarias) y mini-gráfico de alumnas por clase frente a 3,6 | KPIs |
| Clientas nuevas por canal | Barras apiladas por mes | `ClientAcquisition` |
| Pago a instructoras | Barras agrupadas por instructora y mes (base, extras, cancelaciones, comisiones) | Statements |
| Devengado vs cobrado y pasivo diferido | Barras agrupadas por mes (cobrado, devengado) con línea del pasivo diferido | Vista de devengo |
| Caja diaria del mes | Barras diarias apiladas (QR, efectivo) con el cierre de caja marcado | Pagos, `CashClose` |
| Clases llenas y lista de espera por horario | Barras horizontales por franja: veces llena, personas en espera no atendidas | Sesiones, lista de espera |
| Vencimientos de los próximos 14 días | Tabla ordenada por fecha con clases restantes y estado de contacto (no es gráfico, pero acompaña al panel) | Suscripciones |

Hoy la web no tiene una librería de gráficos: el reporte AW16 dibuja su escala mensual con CSS. Para esta capa hace falta agregar una (Recharts es la opción más simple con React 19 y Tailwind; visx si se quiere control total). Todos los colores salen de los tokens del sistema de diseño.

### 3.4 Proyecciones y simulador

**Proyecciones por tendencia (3, 6 y 12 meses).** Un modelo deliberadamente simple, explicable y calculable en el navegador con los datos agregados:

1. Entradas medidas de los últimos 3 meses (media móvil) y su tendencia lineal: clientas nuevas por mes y por canal, porcentaje de renovación, ARPC, alumnas promedio por clase, mezcla de planes.
2. Cada mes proyectado: activas(t+1) = activas(t) × renovación + nuevas(t+1); ingreso = activas × ARPC; costos según el simulador; resultado.
3. Tres escenarios: base (tendencia), pesimista (nuevas −20 %, renovación −10 puntos), optimista (nuevas +20 %, renovación +10 puntos). Se muestra el mes en que cada escenario cruza el punto de equilibrio y el acumulado de caja.
4. Con menos de 3 meses de datos (los primeros meses del estudio) la proyección parte de los supuestos del simulador y lo dice en pantalla.

Cuando haya 12 meses o más, se puede agregar estacionalidad (vacaciones, inicio de año) con un factor por mes aprendido de los propios datos; antes de eso cualquier modelo más complejo sería ruido.

**Simulador.** Una pantalla con controles y resultado inmediato, sin llamadas al servidor salvo para cargar la línea base real:

| Entradas (editables) | Salidas |
| --- | --- |
| Precio de cada plan (los 8), % de fundadoras y su descuento | Ingreso mensual bruto, impuestos, ingreso neto |
| Clases por semana (6 L–V, 3 sábado) y semanas por mes | Capacidad mensual (clases × 8) |
| Ocupación objetivo o alumnas por clase | Alumnas-clase por mes, clientas activas equivalentes |
| Mezcla de planes (qué % de clientas compra cada plan) | Ingreso por alumna-clase |
| Costos fijos por línea (prellenados con el presupuesto) | Pago a instructoras (65 + 8 por alumna desde la 5.ª, 25 por cancelada) |
| Tarifas de instructoras y de la coordinadora | Comisiones |
| Tasa de impuestos | Resultado, margen, **punto de equilibrio en alumnas por clase, ocupación y clientas** |

Comprobación con los números de la dueña: con 143 clases, 65 Bs por clase (9.295 Bs), costos fijos 21.175 Bs y 16 % de impuestos, el ingreso de equilibrio es (21.175 + 9.295) ÷ 0,84 ≈ 36.270 Bs, es decir unas 515 alumnas-clase al mes a ≈ 70 Bs por clase, o 3,6 alumnas por clase: coincide con el cálculo del plan de negocio. El simulador debe mostrar esa derivación para que cualquier cambio de precio o de costo se entienda.

La lógica del simulador y de las proyecciones conviene escribirla como funciones puras en un paquete compartido (`packages/studio-economics`), con pruebas unitarias sobre estos mismos ejemplos, para que la web, el worker (recomendaciones) y una futura IA usen el mismo cálculo.

### 3.5 Recomendaciones inteligentes

**Etapa 1: reglas simples.** Un motor de reglas que corre en el worker (cada noche y al cerrar el día) y deja una fila por hallazgo (`Recommendation`: regla, sujeto, período, datos de respaldo, estado: nueva, vista, descartada, resuelta). La web las lista en un «Panel» con el dato que las justifica. Las reglas iniciales, con sus datos:

| Regla | Condición (umbrales configurables) | Acción sugerida | Datos necesarios |
| --- | --- | --- | --- |
| Horario débil | Una serie semanal promedia < 3 alumnas en sus últimas 4 ocurrencias dictadas (y al menos 3 se dictaron) | «Mueve o elimina el horario de las martes 20:00» con el historial | `session_facts` (existe el insumo) |
| Horario saturado | Ocupación ≥ 90 % y ≥ 2 personas en lista de espera en 3 de las últimas 4 semanas | Abrir una clase contigua o subir ese horario | Sesiones, lista de espera (existen) |
| Distancia al equilibrio | Cada semana | «Te faltan X clientas activas (o Y alumnas por clase) para el punto de equilibrio» | KPIs + presupuesto |
| Clienta inactiva | Plan vigente, sin reserva futura y sin asistencia en 7 días | Lista para contactar desde recepción, con botón «contactada» | Reservas, asistencias (existen) |
| Activación en riesgo | Clienta nueva con < 2 asistencias a los 15 días | Contactar antes del día 30 | Asistencias, fecha de primer pago (existen) |
| Vence pronto / venció sin renovar | Vence en ≤ 3 días con clases restantes; venció hace 1–7 días sin compra; fundadora en el día 5 del plazo | Ofrecer renovación; recordar el beneficio fundadora | Suscripciones (existen), fundadoras (nuevo) |
| Clases perdidas por vencimiento | > 25 % de clases sin usar al vencer en un tipo de plan | Revisar vigencia o tope semanal de ese plan | Suscripciones (existen) |
| No-shows repetidos | ≥ 2 no-shows en 30 días | Recordar la política de 12 horas | Asistencia (existe) |
| Invitada sin compra | Invitada que asistió hace ≥ 14 días y no compró | Seguimiento con oferta de clienta nueva | `GuestPass` (nuevo) |
| Caja sin cerrar o con diferencia | Día con cobros en efectivo sin cierre, o cierre con diferencia ≠ 0 | Revisar con recepción | `CashClose` (nuevo) |
| Gasto fuera de presupuesto | Gasto real de una categoría > presupuesto + 15 % | Revisar la categoría | Gastos (existen), presupuesto (nuevo) |
| Fundadoras | Cupo restante y ritmo de venta; costo acumulado del descuento frente al ingreso que trajeron | Cerrar o extender la promoción | Fundadoras (nuevo) |
| Capacidad reducida | Equipo fuera de servicio con clases programadas a capacidad completa | Bajar la capacidad de esas sesiones | `Equipment` (nuevo) |
| Pago a instructora listo | Statement del mes generado y no aprobado al día 3 | Revisar y aprobar | Statements (nuevo) |

**Etapa 2: IA sobre los datos.** Cuando las reglas funcionen y haya al menos 3 meses de operación:

1. **Informe mensual narrado.** El worker arma un resumen estructurado (KPIs del mes, variaciones, reglas disparadas, proyección base) y se lo pasa a un modelo de lenguaje (por ejemplo la API de Claude) con instrucciones de redactar un informe corto en español con 3 a 5 acciones priorizadas, citando siempre el dato que las sostiene. Costo marginal despreciable a este volumen. Datos necesarios: el estado mensual completo y las reglas.
2. **Preguntas en lenguaje natural** sobre los datos agregados («¿qué horario de la tarde rinde menos desde agosto?»). Se implementa con herramientas restringidas: el modelo sólo puede llamar funciones de lectura predefinidas sobre las vistas analíticas (nunca SQL libre ni datos personales), y la web muestra la tabla que respalda cada respuesta.
3. **Ajuste de umbrales y detección de anomalías.** Comparar cada KPI con su propia historia (desviaciones de más de 2 desviaciones estándar) y explicar la anomalía con los factores disponibles (feriado, instructora distinta, campaña). Datos necesarios: 6 meses o más de `session_facts` y un calendario de eventos (feriados, campañas) que hoy no existe.
4. **Riesgo de abandono por clienta.** Un puntaje simple (regresión logística o árbol) con frecuencia, recencia, clases restantes, no-shows y canal; útil sólo con unas 100 clientas y 3 ciclos de renovación de historia. Hasta entonces, las reglas de inactividad cumplen la misma función.
5. **Recomendación de horario y de precios.** Sugerir mover horarios según el mapa de calor y la lista de espera, y evaluar escenarios de precio con el simulador. Datos necesarios: 6 a 12 meses de ocupación por franja y la elasticidad observada (cambios de precio reales), que al inicio no habrá.

Principios: la IA **propone, nunca ejecuta**; cada sugerencia muestra sus datos; los datos personales no salen del sistema (se envían agregados y, si hace falta nombrar clientas, se hace con identificadores internos que la web resuelve al mostrar).

### 3.6 Arquitectura y modelo de datos

**Dónde vive.** Un cuarto contexto, «Gestión del estudio» (`studio-management`), con su propio esquema `studio` en PostgreSQL, su módulo NestJS y su carpeta en la web, siguiendo el patrón ya establecido (ADR-0005, ADR-0011): sólo el Administrador accede; el contexto **lee** Booking & Membership y Back Office a través de sus interfaces y **escribe** únicamente sus propias tablas. Lo que son reglas de negocio operativas (planes por días, tope semanal, congelamiento, fundadoras, clase de regalo, invitaciones, mínimo de reservas, canal de adquisición, equipos, cierre de caja) pertenece a Booking & Membership o Back Office y se detalla en la Parte 2; aquí se lista lo que el contexto analítico necesita de ellas.

**Flujo de datos.**

```text
apps (clientas, staff, admin) ──► tablas transaccionales (booking, back_office, system)
                                        │
                     worker: job nocturno + bajo demanda («recalcular»)
                                        ▼
                      esquema studio: hechos y snapshots
                        session_facts        (1 fila por sesión dictada o cancelada)
                        client_month_facts   (1 fila por clienta y mes)
                        subscription_revenue (devengo por mes)
                        kpi_month            (1 fila por KPI y mes, con su fórmula versionada)
                        recommendations      (reglas disparadas)
                        pay_statements       (instructoras, coordinadora)
                                        │
                        API /administrator/analytics/* , /administrator/finance/*
                                        ▼
                     admin web: Panel · Finanzas · Equipo · Proyecciones · Recomendaciones
```

Las tablas de hechos se recalculan desde cero para el mes en curso y los 2 anteriores en cada corrida (idempotente, al estilo de los reconciliadores de ADR-0058), y quedan congeladas para meses cerrados salvo recálculo manual. Así las pantallas consultan tablas pequeñas y los KPIs no cambian de definición sin que quede registro (`kpi_month.formula_version`).

**Entidades nuevas (resumen).**

| Entidad | Contexto | Campos principales | Para qué |
| --- | --- | --- | --- |
| `StudioSettings` | studio | tasa de impuesto, ventana de cancelación (h), mínimo de reservas por período, horas de antelación del chequeo, umbrales de reglas, tope de fundadoras | Una sola fila versionada; evita constantes en el código |
| `CostBudgetLine` | studio | categoría de gasto, monto mensual, vigencia | Presupuesto vs real; punto de equilibrio |
| `PayRateRule` | studio | tarifa por clase, alumnas incluidas, extra por alumna, tarifa por cancelación, % comisión, vigencia | Pago a instructoras |
| `CommissionRule` | studio | monto por plan mensual / bimestral / trimestral, umbral y monto del bono, ventana de renovación | Coordinadora |
| `InstructorPayStatement` + líneas | studio | instructora, mes, líneas (sesión, alumnas, monto; cancelación; comisión), total, estado, `salaryPaymentId` | Nómina calculada; vista en la app de staff |
| `CoordinatorPayStatement` | studio | mes, base, clientas nuevas por tipo de plan, % renovación, bono, total | Nómina de la coordinadora |
| `session_facts` | studio | sesión, fecha, día, hora, tipo, instructora, capacidad, reservadas al inicio, asistieron, no-shows, cancelaciones tardías, lista de espera, estado, causa | Ocupación, mapa de calor, reglas |
| `client_month_facts` | studio | clienta, mes, cohorte, canal, plan vigente, clases usadas, asistencias, última reserva, activa, activada, renovó | KPIs de clientas, cohortes, alertas |
| `subscription_revenue` | studio | suscripción, mes, devengado, cobrado, diferido | Devengado vs cobrado |
| `Recommendation` | studio | regla, sujeto (sesión, clienta, categoría…), período, datos JSON, estado, quién la cerró | Panel de recomendaciones |
| `CashClose` | back_office | fecha, sucursal, efectivo esperado (Σ pagos en efectivo), contado, diferencia, nota, quién cerró | Cierre de caja diario |
| `Equipment`, `EquipmentIssue` | back_office | equipo (tipo reformer/cadillac/mat, número), falla (fecha, descripción, fuera de servicio, resuelta) | Registro de fallas; capacidad |
| `ClientAcquisition` | booking | clienta, canal, referente (clienta / instructora / coordinadora), código, fecha | Nuevas por canal, comisiones |
| `FounderMembership` | booking | clienta, nº (1–40), desde, estado (vigente, perdida), motivo | Fundadoras |
| `AllowanceAdjustment` | booking | suscripción, ± clases, motivo (regalo clienta nueva, invitación convertida, campaña, cortesía), quién | Clases extra sin tocar el pago |
| `SubscriptionFreeze` | booking | suscripción, desde, hasta (≤ 15 días), quién | Congelamiento; corre la fecha de fin |
| `GuestPass` | booking | clienta anfitriona, invitada (nombre, teléfono, luego clienta), mes, sesión, asistió, convertida | Invita a una amiga |
| `LifecycleMessage` | booking | clienta, hito (día 2, semana 1, día 30, día 90), enviado, canal | Seguimiento de 90 días |

Cambios en entidades existentes: `Plan` gana `durationDays` y `weeklyClassCap` (y `durationMonths` queda deprecado); `Payment` gana `discountCentavos` y `discountReason`; `Session` gana `minimumBookings` y la causa de cancelación `minimum_not_met`; `Client` gana el enlace a `ClientAcquisition`; `StaffRole` gana `coordinator` (sin acceso a la app, sólo nómina) si se decide así.

**API.** Endpoints de lectura paginados bajo `/api/v1/administrator/analytics/*` (kpis, heatmap, cohorts, funnel, forecast) y `/administrator/finance/*` (monthly-statement, revenue-recognition, pay-statements, budget), más los comandos de aprobar statements, cerrar caja y resolver recomendaciones, todos con `requireAdministrator` y registros de auditoría como los existentes.

**Web.** Una sección nueva en la barra lateral: **Panel** (KPIs del mes, recomendaciones, vencimientos), **Finanzas** (estado mensual, devengado, presupuesto), **Equipo** (statements de instructoras y coordinadora), **Proyecciones** (escenarios y simulador). Se reutilizan los controles Desde/Hasta y Sucursal del reporte AW16, las tablas TanStack, el formato de moneda en centavos y los paneles laterales. El reporte AW16 actual pasa a ser una pestaña de Finanzas.

**Qué no hace falta construir.** Ninguna nueva captura de asistencia, reservas o pagos: ya se registran. Ningún almacén de datos externo: el volumen (unas 143 sesiones y algunos cientos de pagos al mes) cabe de sobra en PostgreSQL con tablas de hechos. Ninguna herramienta de BI: la web ya tiene la autenticación, el proxy, el sistema de diseño y las pruebas para alojar estas pantallas.

## Hoja de ruta en fases

Unidad de esfuerzo: **d = día de trabajo** de una persona con asistencia de IA, con el ritmo y los estándares de este repositorio (pruebas primero, glosario y ADR cuando cambia una regla, prompt de diseño cuando cambia una pantalla, verificación en simuladores y navegador). Los rangos no incluyen los tiempos de espera de terceros (revisión de Google Play, Apple, trámites). El orden dentro de cada fase es el recomendado.

### Fase 0: terminar lo que ya está en marcha (1–2 semanas de calendario, 5–8 d)

Lo que la cola actual ya tiene definido y hace falta para que alguien instale las apps:

- REL-003 a REL-007 y REL-009: fichas de la tienda, Data safety, contenido, íconos finales, prueba cerrada de 14 días y publicación en Android. Esfuerzo propio 3–4 d; el resto es espera de Google.
- UX-002, UX-003, UX-004: hojas de confirmación propias, rechazos tempranos en los flujos de la asistente y refresco al volver a una pestaña (hoy una reserva hecha en recepción no aparece en la app hasta reiniciarla). 2–3 d.
- Decidir el gate 9 (Apple Developer, 99 USD al año): sin él no hay app en iPhone ni push en iOS.

### Fase 1: abrir el estudio con las reglas de Emma (30–42 d)

Todo lo que una clienta o la recepción notaría el primer día. Casi todo empieza por el glosario y una migración.

| Orden | Trabajo | Esfuerzo |
| --- | --- | --- |
| 1 | Planes por días (30/60/90), clase suelta, tope semanal; carga de los 8 planes | 3–4 d |
| 2 | Ventana de cancelación de 12 h y la política dentro de la ventana (textos en apps, diseño y glosario) | 1–2 d |
| 3 | Mínimo de reservas por período (2 → 3), chequeo 3 h antes, devolución de la clase, aviso y causa «mínimo no alcanzado» | 2–3 d |
| 4 | Renovación anticipada (comprar el siguiente plan antes de vencer) | 3–4 d |
| 5 | Clases extra con motivo (`AllowanceAdjustment`) y la clase de regalo a clientas nuevas | 2–3 d |
| 6 | Membresía fundadora: cupo, 15 %, pérdida a los 7 días, pantallas | 3–4 d |
| 7 | Canal de adquisición y referente («¿cómo nos conociste?», código de instructora o coordinadora) en registro y recepción | 2–3 d |
| 8 | Congelamiento (una vez, hasta 15 días) | 3–4 d |
| 9 | Cierre de caja diario en la app de staff y lista en la web | 3–4 d |
| 10 | Pago a instructoras calculado: tarifas, statement mensual, aprobación, «Mis pagos» en la app | 4–6 d |
| 11 | Equipos y registro de fallas (básico) | 2–3 d |
| 12 | Impuestos del 16 % y presupuesto de costos fijos en el reporte actual; resultado mensual simple | 2–3 d |
| 13 | Ocultar nutricionista y evaluaciones si se decide; sucursal única configurada | 0,5–1 d |

Al final de la fase el estudio puede vender los planes reales, cobrar, cerrar caja, pagar a las instructoras con un cálculo verificable y ver su resultado del mes.

### Fase 2: crecer y retener (22–31 d)

| Orden | Trabajo | Esfuerzo |
| --- | --- | --- |
| 1 | Recordatorios de clase (24 h y 2 h antes) | 1–2 d |
| 2 | Seguimiento de 90 días: hitos, mensajes, alertas de 7 días y de < 4 clases, lista «para contactar» | 4–5 d |
| 3 | Invita a una amiga (pase de invitada, una por mes, clase extra al convertir) y el destino del crédito en dinero | 4–5 d |
| 4 | Coordinadora: comisiones por clienta nueva y bono de renovación; rol de nómina | 3–4 d |
| 5 | Devengado vs cobrado | 2–3 d |
| 6 | Panel de KPIs y gráficos v1: tablas de hechos en el worker, endpoints, Panel con los 12 KPIs, mapa de calor, evolución mensual, mezcla de planes, embudo, cohortes | 8–12 d |

### Fase 3: dirigir con datos (14–20 d)

| Orden | Trabajo | Esfuerzo |
| --- | --- | --- |
| 1 | Paquete de cálculo compartido (`studio-economics`) con el simulador y su pantalla | 3–4 d |
| 2 | Proyecciones a 3, 6 y 12 meses con tres escenarios | 3–4 d |
| 3 | Motor de recomendaciones por reglas (las 14 de la Parte 3) y su panel | 4–6 d |
| 4 | IA: informe mensual narrado y preguntas en lenguaje natural sobre las vistas analíticas | 4–6 d |

### Fase 4: según decisiones (sin orden)

- Facturación electrónica (SIAT): 10–20 d más el trámite y la homologación; depende de la pregunta 6.
- Mensajes por WhatsApp (proveedor, plantillas aprobadas, costo por mensaje): 5–8 d.
- Beneficio de catering como entidad propia (convenios, vigencia, cómo se acredita): 1–2 d.
- iOS (gate 9) y las tareas REL-010 y LNK-001 que dependen de Apple.
- Cola de pulido UX-005 a UX-013 y accesibilidad.

**Total orientativo** sin la fase 4: 71–101 d de trabajo. La Fase 1 es la que decide la fecha de apertura; las fases 2 y 3 pueden empezar con el estudio ya operando, porque leen datos que la Fase 1 ya habrá empezado a producir.

## Preguntas antes de empezar a construir

Reglas de reservas y planes:

1. **Dentro de las 12 horas**, ¿la clienta pierde la clase sin más, o mantenemos la reprogramación al mismo día que existe hoy (dentro de las 2,5 h)? Y la lista de espera, ¿hasta qué hora antes de la clase puede promover a alguien (hoy se detiene al entrar en la ventana; con 12 h dejaría cupos vacíos la misma mañana)?
2. **Tope semanal**: ¿la semana va de lunes a domingo? ¿El tope aplica también a la clase suelta, al plan de 4 y a las clases extra (regalo, invitación)? ¿En los planes de 60/90 días el tope es 3 (24 clases) y 4 (36 clases) por semana?
3. **Vigencia**: ¿los 30/60/90 días cuentan desde el pago confirmado o desde la primera clase? ¿Se puede comprar el siguiente plan antes de que venza el actual (empezaría al terminar)? Hoy no se puede.
4. **Congelamiento**: ¿quién lo pide y aprueba (la clienta sola desde la app, o recepción)? ¿Puede empezar en el pasado? ¿Corre la fecha de fin exactamente los días congelados?
5. **Mínimo de reservas**: los «primeros 2 meses» ¿se cuentan desde la apertura (fecha fija) y luego pasa a 3 para siempre? Si una clase se cancela por mínimo, ¿la clase vuelve al plan de cada reservada sin excepción? ¿La instructora recibe los 25 Bs también si la cancelación la hizo la administración por otra causa?

Dinero:

6. **Factura**: ¿hace falta emitir facturas electrónicas por SIAT desde el sistema, o el contador factura aparte y el sistema sólo calcula el 16 %? Cambia el esfuerzo en más de dos semanas.
7. **Cobro por QR en recepción**: ¿la asistente debe poder registrar una transferencia que vio en el momento (confirmada al instante, como el efectivo), o toda transferencia sigue pasando por la clienta y la revisión de la administración?
8. **Crédito en dinero por referidos (Bs 60)**: ¿se elimina, se mantiene junto a las clases extra, o se convierte a clases? ¿Hay clientas ya referidas en producción que haya que respetar? (Hoy producción no tiene clientas reales, según el backlog.)
9. **Pago a instructoras**: la clase cuenta «hasta 4 alumnas» por **reservas** al inicio de la clase o por **asistencias** registradas? ¿Una clienta con no-show cuenta? ¿La comisión del 10 % es sobre el precio pagado (con descuento fundadora y crédito) o sobre el precio de lista, y se paga cuando el pago se confirma?
10. **Coordinadora**: ¿usa alguna app (alta de clientas, lista para contactar) o sólo aparece en la nómina? Para el bono del 80 %, ¿«renovó» es comprar cualquier plan dentro de cuántos días del vencimiento? ¿La comisión por clienta nueva se paga cuando la clienta paga, o al mes siguiente?
11. **Fundadoras**: ¿la pérdida del beneficio (más de 7 días sin plan) es automática y definitiva? ¿El 15 % aplica también a la clase suelta? ¿Las 40 se cuentan por clientas distintas que compraron al menos una vez con el beneficio?
12. **Devengado**: ¿reconocemos el ingreso por días de vigencia (contable) o por clase consumida? Afecta el resultado mensual que verá la dueña.
13. **Costos fijos**: ¿la coordinadora (3.500) y la recepción (3.400) se registran como pagos de salario reales (ya existe `SalaryPayment`) y el presupuesto sólo sirve para comparar? ¿Los imprevistos del 10 % son sobre el subtotal de 19.250?

Promociones y seguimiento:

14. **Invita a una amiga**: ¿la amiga necesita cuenta en la app antes de venir, o recepción la registra con nombre y teléfono? «Horarios con cupos libres» ¿significa cupo libre al momento de invitar, o un mínimo de cupos (por ejemplo, nunca ocupar el último)? ¿La clase extra de la anfitriona se suma al plan vigente o al siguiente?
15. **Clase de regalo**: ¿sólo con el primer plan de la vida de la clienta? ¿Se suma al plan o es una clase de prueba previa a la compra (eso sería otra cosa: una clase gratis para prospectos)?
16. **Canal de adquisición**: ¿qué lista de opciones de «¿cómo nos conociste?» quieres (Instagram, recomendación, pasé por la puerta, Google, instructora, coordinadora…)? Si una clienta trae código de instructora y dice «Instagram», ¿cuál manda?
17. **Mensajes de los 90 días**: ¿por push e inbox de la app basta, o deben salir por WhatsApp? Si WhatsApp, ¿quién los envía (automático con la API de WhatsApp Business, que tiene costo por conversación, o la coordinadora a mano desde una lista)? ¿Me pasas los textos o los redacto?
18. **Catering**: ¿qué convenio es, cómo se acredita la clienta (mostrar la app, un código) y tiene vigencia?

Alcance:

19. **Nutricionista y evaluaciones**: ¿se ocultan, se eliminan o se mantienen para más adelante? Está construido y probado; ocultarlo es barato, retirarlo no aporta.
20. **Sucursales**: ¿se confirma una sola sucursal para el lanzamiento? El selector de sucursal de la web y los filtros pueden quedarse con un único valor.
21. **iOS**: ¿se abre el Apple Developer Program antes de la apertura, o se lanza sólo en Android?
22. **IA**: ¿la dueña acepta que un resumen mensual **agregado** (sin nombres de clientas) se envíe a un proveedor externo de IA? Si no, la etapa 2 de recomendaciones se limita a reglas y cálculos locales.
23. **Prioridad entre fases**: ¿prefieres abrir con la Fase 1 completa, o abrir antes con un subconjunto (planes, 12 h, mínimo de reservas, fundadoras, cierre de caja) y seguir con congelamiento, equipos y nómina ya operando?
