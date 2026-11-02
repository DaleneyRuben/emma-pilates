# Recorrido a mano del 2026-11-02

Notas de la dueña y hallazgos tomados mientras se recorría
[`docs/guia-de-recorrido.md`](../guia-de-recorrido.md) a mano, sobre una base vacía
(`emma_vacia`), del Paso 0 al Paso 10. El recorrido se detuvo en el Paso 10 a pedido de la
dueña para empezar el rediseño. Cada punto tiene su fila en
[`BACKLOG.md`](../implementation/BACKLOG.md), sección «Walkthrough queue (2026-11-02)».
Los números de abajo son los que usan esas filas («recorrido n.º N»).

Regla de la dueña (2026-11-02): todo rediseño pasa primero por Claude Design (prompt de
follow-up en `docs/design/prompts/followups/`, export a `design/`) y recién después se
cambia el código.

Desde el Paso 10 (decisión de la dueña): el recorrido anota solo bugs y reglas de negocio;
el diseño ya está cubierto por el rediseño completo de la mejora 0.

## Hallazgos del arranque

- La guía no dice que después de `git pull` hay que correr
  `pnpm --filter @pilates/backend prisma:generate` antes de `pnpm build`; sin eso
  el build del backend falla con 76 errores de tipos y el worker arranca el `dist/` viejo.
- Al invitar a Camila con teléfono `70000001`, la fila quedó sin teléfono. Revisar si el
  formulario de **Nuevo miembro** lo descarta.

- La guía (Paso 3) dice que una entrenadora «tiene» un código de referido, pero nace sin
  código: la dueña lo escribe a mano en **Personal** → Daniela → **Código personal**.
  Corregir el texto de la guía. El cambio de fondo está en la mejora 4.

- En el simulador de iPhone con Expo Go, el enlace «Confirma tu correo» de la clienta no
  abre la app, y en el navegador solo muestra «Abre este enlace en la app». La guía no da
  una salida que funcione. Lo resolví con
  `POST /api/v1/client-email-verifications {"verificationToken": …}`. Agregar a la guía
  un comando así (o un `xcrun simctl openurl` que funcione con Expo Go).

- El QR de transferencia sale de un archivo del servidor (`TRANSFER_QR_IMAGE_PATH`, en
  `booking.module.ts:628`); en local es un dibujo de prueba. Cambiar el QR del estudio
  obliga a tocar la configuración y reiniciar. Evaluar que la dueña lo suba desde la web.

## Mejoras pedidas

0. **Primero: revisión visual de todo el sistema en Claude Design (antes que cualquier
   pantalla).** La dueña, después de recorrer las dos apps: «horrible la combinación de
   colores… demasiado texto simple, los espacios se ven mal», en casi todas las pantallas.
   Hacer una sola pasada de sistema que defina: paleta de superficies y énfasis (reemplaza
   el blanco, mejora 14), escala de espaciado única, jerarquía de textos (menos párrafos,
   más filas con ícono), estilos de botón primario, secundario y de texto (sin links
   sueltos), estados vacío, pendiente y de éxito, y avisos (toast de la mejora 8). Con eso
   aprobado, recién se redibujan las pantallas de las mejoras 2, 5, 6, 8, 10, 11, 14, 15,
   17, 19 y 20.
   Aprobado por la dueña el 2026-11-02: primero el sistema, después las pantallas.
   **Alcance ampliado (dueña, 2026-11-02, al cerrar caja en el Paso 9): «hay que hacer
   redesign de toda la app».** Ya no es una lista de pantallas sueltas: es un rediseño
   completo de la app de clientas y de la del equipo sobre el sistema nuevo. Las mejoras de
   pantalla de esta lista quedan como requisitos de ese rediseño. Incluye **Cerrar caja** /
   **Caja cerrada** (check verde de sistema, tarjeta blanca, «Diferencia redondeo» sin
   tilde ni mayúscula en la nota que escribió la recepcionista). Decidir si la web de
   administración entra en el mismo rediseño.
   El sistema tiene que definir también los colores de **aviso** y de **acción
   destructiva**: en **Cancelar sesión** (app del equipo, Paso 10) el bloque ámbar «Esto no
   se puede deshacer» junto al botón rojo ladrillo y la tarjeta blanca chocan entre sí.

1. **Serie semanal sin fecha de fin a la vista.** «Cada semana» crea clases 30 días adelante
   y sigue cada hora sin límite. Hoy se termina abriendo una clase de la serie →
   **Terminar la serie** (ADR-0059: cancela solo las futuras sin reservas). Falta:
   - un campo opcional **Vigente hasta** al crear o editar la serie;
   - una forma de **pausar** la serie (por ejemplo, vacaciones) sin terminarla;
   - que el formulario diga explícitamente que la serie no tiene fin hasta que la termines.
2. **App del equipo sin barra de pestañas abajo (todas las roles).** Mi agenda de la
   entrenadora es la única pantalla visible y **Tu cuenta** solo está en el avatar; lo
   mismo en **Buscar cliente** de la recepcionista (visto en el Paso 9), donde
   **Cerrar caja** es una pastilla chica arriba. Va por Claude Design. Propuesta de
   pestañas por rol (a validar en el diseño):
   - Entrenadora: **Agenda**, **Mis pagos**, **Perfil**.
   - Asistente: **Clientes**, **Horario**, **Caja**, **Perfil**.
   - Nutricionista: **Agenda**, **Disponibilidad**, **Perfil**.
   - Administración: **Pagos**, **Clientes**, **Horario**, **Perfil** (cancelar clase,
     congelamientos y caja como accesos dentro).
   - Coordinadora: **Clientes**, **Para contactar**, **Horario**, **Perfil**.
   - **Perfil** reemplaza al avatar en todas las roles.
   Aprobado por la dueña el 2026-11-02.
3. **Días pasados en la agenda.** La app de entrenadora deja ir a días anteriores y luego
   cuesta volver a hoy; el **Horario** de la web también navega a semanas pasadas.
   Decidido por la dueña:
   - App de entrenadora: abre siempre en hoy y no muestra días pasados (la asistencia no
     se corrige, así que no hay para qué volver). Botón **Hoy** visible.
   - Horario de la web: abre en la semana actual; las semanas pasadas solo en lectura.
4. **Códigos de referido automáticos y personalizables** (decisión de la dueña, cambia
   BKM-011, que hizo el código de entrenadora manual y solo de la dueña).
   - Toda entrenadora recibe un código al crearse o activarse su cuenta, sin que la dueña
     haga nada. Hoy solo la clienta recibe uno automático (`REF-…`).
   - Cada usuaria (clienta y entrenadora) puede cambiar su código desde su app, por uno
     personalizado. La dueña sigue pudiendo cambiarlo desde la web.
   - El código es único entre clientas y entrenadoras (hoy ya se rechaza un código en uso:
     «Ese código ya lo tiene otra clienta o instructora»). La app tiene que avisar en vivo.
   - Decidir: si al cambiar el código el viejo sigue funcionando o deja de valer, cada
     cuánto se puede cambiar, palabras prohibidas, y si se relaja la regla «no empezar con
     `REF-`» para las clientas. Una clienta ya registrada con el código viejo conserva su
     entrenadora (la atribución ya queda guardada), así que la comisión no se pierde.
   - **Código legible desde el nombre (dueña, 2026-11-02).** Hoy la clienta recibe
     `REF-<uuid>` (`system-identity.module.ts:267` y `:299`), ilegible e imposible de
     dictar. Generar todos los códigos (clientas y entrenadoras) desde el nombre o el
     apellido, en mayúsculas, sin tildes ni espacios (Lucía Fernández → `LUCIA`); si ya
     existe, probar el apellido (`FERNANDEZ`) y después añadir un número (`LUCIA2`,
     `LUCIA3`…). La unicidad se resuelve en la base, no solo en la app.
   - Esto obliga a revisar el prefijo `REF-`, que hoy separa los códigos de clienta de
     los de entrenadora; la atribución tiene que salir del dueño del código, no del texto.
   - Hay que resolver la falta de código para las entrenadoras que ya existen y los `REF-<uuid>` de las clientas que ya existen (backfill).
5. **Texto de la tarjeta sin plan en Inicio (app de clientas).** «Elige tu plan y vuelve al
   mat» no suena bien, y «vuelve» no aplica a una clienta nueva. Decidido por la dueña:
   título **«Elige tu plan y empieza a moverte»**; el subtítulo «Paquetes desde Bs 80…»
   se queda igual. El texto vive en `apps/client-mobile/src/home/home-screen.tsx:152` y en
   el diseño `design/02 Inicio.dc.html` (no se edita a mano: va con un prompt de follow-up
   de Claude Design).
   **Rediseño de la tarjeta (dueña, 2026-11-02): se ve fea.** Va por Claude Design.
   Propuesta: «Comprar un plan» como botón de verdad (píldora blanca con texto palo de
   rosa) en vez de texto suelto; «Desde Bs 80» como chip destacado; una línea con lo que
   incluye (clases de Mat y Reformer, paga por QR o en el estudio); un ícono o ilustración
   suave a la derecha para que no sea un bloque plano. Aprobado por la dueña el 2026-11-02.
6. **Reservar sin clases: empty state de verdad (app de clientas).** Hoy
   `apps/client-mobile/src/booking/browse-sessions-screen.tsx:218` muestra solo un texto
   («No hay clases con este filtro» / «No hay clases este día.»). El diseño
   `design/03 Reservar.dc.html` ya dibuja ícono de calendario + título + nota, así que
   la app no sigue el diseño (gap de implementación). Usar el `EmptyState` de
   `packages/mobile-core/src/ui/empty-state.tsx`, con acción. Decidido por la dueña (A):
   - Con un tipo de clase elegido: título «Hoy no hay {tipo}» (o «El {día} no hay {tipo}»
     si no es hoy), nota «Prueba otro día o mira todas las clases de este día.», botón
     **Ver todas las clases** (quita el filtro).
   - Con «Todas» y el día vacío: título «Este día no hay clases», nota «Elige otro día de
     la semana para reservar.», botón **Ver mañana**.
   - Extra sugerido: si el tipo elegido tiene clase otro día de la semana, el botón ofrece
     ese día («Ver el jueves 5»).
   Revisar también el mismo caso en S07 (Reservar del Asistente). El diseño se actualiza
   con un prompt de follow-up de Claude Design.
7. **Selector de sucursal con una sola sede.** Con una sola sucursal activa, el selector
   abre una lista de una opción. Decidido por la dueña: mostrar la sede fija, sin flecha
   y sin poder tocarla; el selector aparece solo desde la segunda sede. Aplica a
   **Reservar** en la app de clientas, a **Reservar una clase** del Asistente (visto de nuevo
   en el Paso 8: abre una lista con una sola opción, Achumani) y a las otras pantallas con
   selector (app del equipo,
   y el selector «Sucursal» de la barra superior de la web, que también muestra flecha
   con una sola sede, aunque la guía dice «no hay nada que elegir»).
8. **Rediseño de Mis reservas (app de clientas).** «Ver historial» como link suelto y el
   vacío con texto plano se ven mal. El diseño `design/05 Mis Reservas.dc.html` también usa
   el link, así que esto es un rediseño (prompt de follow-up de Claude Design, después el
   código). Propuesta:
   - Control segmentado arriba: **Próximas | Historial** (el historial deja de ser otra
     pantalla y se vuelve una pestaña; `07 Historial de Clases` entra ahí).
   - Vacío de Próximas con el mismo `EmptyState` de la mejora 6: ícono de calendario,
     «Aún no tienes reservas», «Cuando reserves una clase, aparecerá aquí.», botón
     **Reservar una clase**.
   - Vacío de Historial: «Todavía no tomaste clases», sin botón.
   - Revisar el par del Asistente (S21 y S22) para que se vean igual.
   - La dueña insiste (2026-11-02, Paso 8): «Ver historial» como link «se ve horrible».
     Lo resuelven las pestañas de arriba.
   - **Aviso verde «Reserva confirmada»** (la dueña: feo, y desaparece solo). Hoy es una
     tarjeta verde arriba de la lista que se va sola tras unos segundos. Pasar
     a un aviso tipo toast abajo, sobre la barra, con ícono de check, en el tono de la
     marca (no verde de sistema), y que se quede hasta que la clienta lo cierre o cambie
     de pantalla. Unificar todos los avisos de confirmación de las dos apps con ese mismo
     componente.
   Aprobado por la dueña el 2026-11-02.
9. **Falta el avatar de perfil en Inicio (app de clientas).** El diseño
   `design/02 Inicio.dc.html` lo dibuja arriba a la derecha como atajo a Perfil, pero
   `home/home-screen.tsx` no lo muestra (gap de implementación, no rediseño). Decidido
   por la dueña: solo en Inicio, como el diseño; Reservar y Mis reservas quedan sin
   avatar porque la barra ya ofrece Perfil. Ojo en desarrollo: la rueda de Expo cae en
   esa misma esquina y tapa los toques.
10. **Rediseño de Invita a una amiga (app de clientas).** Va por Claude Design (el diseño
    actual es `design/16 Mis Referidos.dc.html`). Propuesta:
    - El código en una tarjeta compacta de una línea, letra grande con espacio entre
      letras, y un botón **Copiar** al lado (con aviso «Código copiado»).
    - **Compartir** como botón ancho debajo; el mensaje que se comparte ya trae el
      código y un enlace a la app.
    - «Cómo funciona» en tres pasos con ícono: compartes tu código → tu amiga toma una
      clase gratis → cuando compra su primer plan, tú ganas una clase.
    - Una línea de límites: una amiga por mes, y la clase gratis es una sola vez para ella.
    - Vacío de «tus invitadas» con el mismo `EmptyState` de la mejora 6; con invitadas,
      una fila por amiga con su estado (registrada, tomó su clase, compró).
    - Cuando exista la mejora 4, un **Editar código** junto al código.
    Aprobado por la dueña el 2026-11-02.
11. **Campana de notificaciones en Inicio y tamaño de íconos (app de clientas).** Va por
    Claude Design. Hoy **Notificaciones** solo se abre desde Perfil, y la pastilla con el
    número vive en la pestaña **Perfil**. Propuesta:
    - Una campana arriba a la derecha de Inicio, al lado del avatar de la mejora 9, con
      la pastilla de no leídas encima; abre **Notificaciones**. La fila de Perfil se queda.
    - La pastilla de no leídas pasa solo a la campana; la pestaña Perfil deja de mostrarla.
    - Revisar el tamaño de los íconos en toda la app: el de los vacíos (hoy 34 pt, línea
      fina y color apagado, se pierde en la pantalla de Notificaciones) y los de los
      accesos rápidos de Inicio, para que tengan un tamaño y grosor coherentes.
    Aprobado por la dueña el 2026-11-02.
12. **Bug: las pantallas se cortan antes de la barra de pestañas (las dos apps).** Se ve en
    Reservar, Perfil y Elige tu plan: el contenido que se desplaza termina unos 40 pt arriba
    de la barra, con una franja vacía. Causa probable:
    `packages/mobile-core/src/ui/screen.tsx` envuelve todo en un `SafeAreaView` con todos
    los bordes y además `padding: spacing.lg`. Dentro de las pestañas, la barra ya cubre la
    zona inferior segura, así que el borde de abajo se aplica dos veces y el padding lo
    agranda. Arreglo: que `Screen` no aplique el borde inferior dentro de las pestañas
    (`edges={["top","left","right"]}`) y que el `ScrollView` llegue hasta la barra, con el
    espacio de abajo como `contentContainerStyle` en vez de padding del contenedor. Lo usan
    unas 160 pantallas: verificar en iPhone, iPad y Android, en las dos apps. No es
    rediseño: no pasa por Claude Design.
13. **Urgencia en el precio de lanzamiento (Elige tu plan, app de clientas).** El sistema ya
    cuenta los lugares: `priceFounderPlanList` en
    `apps/backend/src/booking/payments/prisma-founder-membership.ts` muestra el 15 % solo
    si la clienta no tiene un plan pagado antes, no perdió el beneficio, y los lugares
    ocupados (activos + reservados) son menos que los de **Reglas del estudio** (40). Falta
    decirlo en la pantalla. Va por Claude Design. Decidido por la dueña (2026-11-02):
    - La palabra «Fundadora» y el total de lugares son internos: la clienta no los ve.
    - Franja arriba de la lista: «Oferta por tiempo limitado · 15 % en tu plan».
    - Con 10 lugares o menos, la franja cambia a «¡Quedan solo N lugares con 15 % de descuento!», en un
      tono más fuerte. Con más de 10, no se muestra ningún número.
    - La API devuelve los lugares que quedan solo cuando son 10 o menos, para no exponer
      el número interno.
    - Revisar los otros textos que hoy digan «fundadora» a la clienta (app de clientas,
      notificaciones, correos).
- **Guía desactualizada sobre fundadoras (Pasos 7 y 11).** Confirmado en la base: al
  confirmarse su primer pago, Lucía quedó fundadora n.º 1 (`active`) sola, pagó con 15 %
  y **no** recibió la clase de regalo (12 de 12, sin `allowance_adjustments`), porque el
  regalo no se suma a una fundadora. La guía dice lo contrario en el Paso 7 («no es
  fundadora, el sistema le suma 1 clase de regalo… Mi plan dice 9») y en el Paso 11 («la
  dueña la marca a mano»). Reescribir los dos pasos: mientras queden lugares, toda primera
  compra es fundadora y no lleva regalo. El código es correcto: lo dice
  `docs/decisiones-emma-pilates.md` §16, decisión 1 (addendum del 2026-10-28, gana sobre
  todo lo anterior): «Una fundadora nunca recibe la clase de regalo ni las clases de
  campaña», y §5.1. Solo la guía está mal.
14. **Rediseño del detalle del plan (app de clientas) y de las pantallas de texto con el
    mismo estilo.** Va por Claude Design. La dueña: mucho texto, simple pero desordenado;
    la tarjeta blanca de arriba no llama la atención ni destaca el descuento. Y hay varias
    pantallas así.
    - **Detalle del plan.** Tarjeta de arriba en palo de rosa (como la de Inicio), con el
      precio grande, el precio tachado y una pastilla «15 % de descuento»; «Qué incluye»
      como tres filas con ícono (clases, cancelación, vigencia) en vez de párrafos; la
      fecha de inicio en su propio bloque con título; el desglose que muestre el descuento
      (hoy dice «Precio del plan Bs 697», sin decir que era Bs 820 menos Bs 123);
      «Siguiente paso» corto y el botón de pagar fijo abajo.
    - **Sistema.** Antes de redibujar pantalla por pantalla, definir en Claude Design un
      patrón común para las pantallas de detalle y de texto: tarjeta de cabecera con
      énfasis, filas con ícono, títulos de sección, el desglose de dinero y el botón fijo.
      Después aplicarlo a las que se vean así (detalle del plan, pago, Mi plan, evaluación,
      detalle de clase, y las que vayamos encontrando).
    - **Pago por transferencia** (la dueña: igual de fea). Monto, QR y comprobante con el
      patrón común; el botón **Enviar comprobante** fijo abajo.
    - **Factura como desplegable** (decidido por la dueña): quitar la pregunta «Con factura
      / Sin factura». Por defecto la compra va sin factura; una fila plegable
      «¿Necesitas factura?» abre el NIT o CI y el nombre. Aplica también al pago en el
      mostrador del Asistente si pregunta lo mismo.
    - **Detalle de la clase** (la dueña: no le gusta el blanco). Mismo patrón: cabecera
      con énfasis, datos de sede/fecha/hora/duración en filas con ícono, cupos más
      visibles, botón **Reservar** fijo.
    - **Color de las tarjetas en toda la app** (la dueña: «no me gusta nada el color
      blanco en esta página ni en otras»). Hoy todas las tarjetas son blancas
      (`cardBox` → `colors.white` en `packages/mobile-core/src/ui/tokens.ts:130`) sobre el
      fondo crema `#FAF7F2`. Revisar en Claude Design la paleta de superficies: tarjetas
      en un tono cálido (arena o palo de rosa muy claro) en vez de blanco, y un tono más
      fuerte para la tarjeta principal de cada pantalla. Es un cambio de tokens, así que
      alcanza a las dos apps a la vez.
    Aprobado por la dueña el 2026-11-02: primero el patrón común, después las pantallas.
15. **Pantallas informativas centradas (las dos apps).** Va por Claude Design, dentro del
    patrón común de la mejora 14. «Tu pago está en revisión» y las parecidas (pago
    confirmado o rechazado, revisa tu correo, cuenta cerrada, errores) centradas horizontal
    y verticalmente; ícono más grande; botón de verdad en vez del link «Volver al inicio».
    Incluye **¡Pago registrado!** del cobro en el mostrador (visto en el Paso 9): check
    verde de sistema fuera de la marca, «8 clases» repetido dos veces, tarjeta blanca.
    Texto de «Tu pago está en revisión», decidido por la dueña (opción B): «Nuestro equipo
    está revisando tu comprobante. Suele tomar unos minutos en horario de atención. Te
    avisaremos apenas esté listo.» (Se descartó un tiempo fijo de 5 minutos.)
16. **Texto de la hoja «¿Te avisamos?» (permiso de notificaciones, app de clientas).** Hoy
    nombra solo tres casos (la clase cambia, se libera un cupo, la evaluación). La app
    avisa de más: recordatorio 24 h y 2 h antes de la clase, clase cancelada por no llegar
    al mínimo, cupo de la lista de espera, pago confirmado o rechazado, plan por vencer,
    congelamiento aprobado y evaluación. La dueña quiere un mensaje más global. Decidido
    (opción B): título «No te pierdas ninguna clase», texto «Te avisamos antes de cada
    clase y cuando haya novedades sobre tus reservas, tu plan o tus pagos.» Los botones
    **Activar notificaciones** y **Ahora no** se quedan.
    - La hoja es compartida (`packages/mobile-core/src/notifications/push-permission-sheet.tsx:26`)
      y la app del equipo muestra el mismo texto. El texto B es de clienta, así que la hoja
      tiene que recibir el título y el texto por app. Texto para el equipo: pendiente (se
      propone en el recorrido de la app del equipo).
    - Los subflujos de Maestro `apps/*/.maestro/subflows/dismiss-push-permission.yaml`
      buscan «¿Te avisamos?»: actualizarlos, o mejor que busquen un `testID`.
17. **Rediseño de la ficha de la clienta en la app del equipo (Asistente, S21/S22).** Va por
    Claude Design, con el patrón común de la mejora 14 y los colores nuevos. Hoy: tarjetas
    blancas apiladas, dos botones grandes seguidos, y dos links sueltos («Ver reservas»,
    «Ver historial completo»). Propuesta:
    - Cabecera con avatar o iniciales, nombre, correo y teléfono, y la etiqueta del plan.
    - Tarjeta del plan con énfasis: clases restantes en grande y barra de progreso, como
      la de Inicio de la clienta.
    - Una sola acción principal (**Reservar clase**); **Registrar pago en efectivo** como
      acción secundaria, y mostrarla solo cuando la clienta puede comprar (hoy aparece
      aunque Lucía tiene 9 clases; la guía dice que el efectivo se niega mientras el plan
      tenga clases o reservas futuras: revisar que no se ofrezca para que luego falle).
    - Próximas reservas e historial como pestañas o secciones con lista, en vez de links,
      igual que la mejora 8 de la clienta.
    - Estado **Cuenta pendiente de activación** (visto con Sofía, Paso 9): la dueña dice
      «horrible la combinación de colores». Bloque arena + tarjeta punteada rosada + botón
      apagado, con cinco frases sueltas. Reducir a una línea de estado con la fecha de
      vencimiento, **Reenviar enlace** y un menú con **Cambiar correo** y **Cancelar
      invitación**; el vacío «Sin plan activo» con el `EmptyState` común y **Registrar
      pago en efectivo** como acción, en vez de un **Reservar clase** apagado.
    Aprobado por la dueña el 2026-11-02.
18. **Bug: en Reservar del Asistente (app del equipo) los días salen cortados y los
    filtros de tipo de clase salen vacíos.** Causa encontrada: en
    `apps/staff-mobile/src/assistant/browse-sessions-screen.tsx:295` el estilo `strip` es
    `{ flexGrow: 0 }`, sin `flexShrink: 0`. Cuando la lista de clases ocupa el alto, las dos
    tiras horizontales se aplastan: los números de los días quedan cortados y las pastillas
    de tipo pierden el texto. La app de clientas ya lo resolvió
    (`apps/client-mobile/src/booking/browse-sessions-screen.tsx:290`,
    `{ flexGrow: 0, flexShrink: 0 }`). Arreglo: lo mismo en la app del equipo, con una
    prueba, y verificar en iPhone, iPad y Android. Mejor aún: extraer las dos tiras a un
    componente compartido en `mobile-core`, porque las dos pantallas son casi iguales.
19. **Rediseño del final de Perfil (app de clientas, y revisar el del equipo).** Va por
    Claude Design. La dueña: mucho espacio entre los componentes. Hoy hay cuatro bloques
    sueltos con espacios grandes entre ellos: la tarjeta de promociones, «Cerrar sesión»
    como botón ancho, «Cerrar mi cuenta» en rojo y la versión. Propuesta:
    - «Recibir promociones» como una fila más con interruptor dentro de una sección
      **Preferencias**, junto a **Notificaciones**; el texto legal en una línea debajo.
    - **Cerrar sesión** como última fila de la lista, no como botón aparte.
    - **Cerrar mi cuenta** en una sección final **Cuenta**, discreta, con la versión justo
      debajo y en letra chica.
    - Un solo espaciado entre secciones en toda la pantalla.
    Aprobado por la dueña el 2026-11-02.
20. **Rediseño de Nuevo cliente (app del equipo, Asistente).** Va por Claude Design, con el
    patrón común de la mejora 14. Propuesta:
    - Los campos agrupados en dos bloques: **Datos** (nombre, correo, teléfono) y
      **¿Cómo nos conoció?**.
    - Las ocho opciones de canal ocupan cuatro filas de pastillas: pasarlas a una cuadrícula
      de dos columnas con ícono, o a un selector.
    - **Código de referido** solo aparece al elegir «Una instructora» o «Recomendación de
      una amiga» (hoy se muestra siempre).
    - **Crear cuenta** fijo abajo, con la nota del enlace de 7 días encima.
    - Revisar si el teléfono valida los 8 dígitos de un celular de Bolivia (en el
      recorrido se aceptó `7000004`, de 7). Revisar lo mismo en el registro de la clienta.
    - Revisar también el registro de la app de clientas, que tiene los mismos campos.
    Aprobado por la dueña el 2026-11-02.
21. **Cobro en el mostrador: efectivo y QR mezclados en una sola pantalla (app del equipo,
    Asistente).** `apps/staff-mobile/src/assistant/confirm-cash-payment-screen.tsx` se
    titula «Confirmar pago en efectivo», pero tiene dos caminos:
    - **Efectivo:** **Confirmar pago recibido** → el plan se activa al instante y el monto
      entra en la caja de la sede.
    - **QR:** la tarjeta **Comprobante de transferencia** → **Fotografiar comprobante**
      envía la venta apenas se toma la foto (`recordFrontDeskTransfer`, línea 123), sin
      otro botón, y queda pendiente hasta que la dueña la aprueba. No entra en la caja.
    La dueña no supo cómo se diferencian. Además, después de enviar la foto,
    **Confirmar pago recibido** sigue activo (solo se apaga sin sucursal o con factura
    incompleta, línea 276): riesgo de registrar la misma venta dos veces. Propuesta (va
    por Claude Design, con la mejora 0):
    - Arriba, un selector **¿Cómo paga?**: **Efectivo** | **QR**.
    - Efectivo: monto a cobrar y **Confirmar pago en efectivo**.
    - QR: el QR del estudio para mostrar, **Fotografiar comprobante** y un botón
      **Enviar comprobante** (la foto sola no envía).
    - Título neutro: «Registrar pago».
    - Después de enviar uno, el otro camino se apaga. Verificar en el backend si hoy se
      puede crear una venta en efectivo encima de una transferencia pendiente.
    - La factura, como desplegable (mejora 14).
    Aprobado por la dueña el 2026-11-02.
22. **Bug: el 15 % deja centavos y las apps los redondean.** Sofía compró **8 clases** en
    efectivo: Bs 590 − 15 % = **Bs 501,50**. La base guarda `50150` centavos, pero la app
    del equipo mostró «Cobrado en efectivo: Bs 502» (las apps muestran bolivianos enteros).
    Camila cobra 502 y la caja espera 501,50: el cierre va a salir con 0,50 de diferencia.
    Confirmado en **Cerrar caja**: «Efectivo esperado Bs 501,50», mientras la pantalla de
    cobro decía Bs 502. La misma venta aparece con dos montos en la misma app.
    Con Lucía no se notó porque 820 − 15 % da 697 exacto. Hay que decidir la regla:
    - redondear el precio con descuento a bolivianos enteros al calcularlo (recomendado:
      el estudio cobra en enteros), y decidir hacia dónde (arriba, abajo o al más cercano);
    - o mostrar centavos en las apps cuando el monto los tenga.
    **Decidido por la dueña (2026-11-02): redondear al boliviano entero más cercano al
    calcular el precio con descuento; ,50 sube (501,50 → 502, 246,50 → 247).** Así el
    precio que ve la clienta, el que cobra la recepcionista, el de la caja y el guardado
    son el mismo. Las ventas ya hechas no se reescriben.
    Revisar también los planes de 4 clases (290 → 246,50), 12 (820 → 697), bimestrales y
    trimestrales, y el pago por QR, donde la clienta transfiere «el monto exacto».
23. **Las apps solo muestran 7 días adelante, aunque el horario se publica a 30.** La tira
    de días es `upcomingCivilDates(today, 7)` en tres pantallas:
    `apps/staff-mobile/src/administrator/cancel-class-screen.tsx:71` (Cancelar una clase de
    la dueña), `apps/staff-mobile/src/assistant/browse-sessions-screen.tsx:79` (Reservar del
    Asistente) y `apps/client-mobile/src/booking/browse-sessions-screen.tsx:76` (Reservar de
    la clienta). Ningún documento de decisiones fija una ventana de 7 días; la serie semanal
    crea clases a 30. Consecuencia vista en el Paso 10: Ana no puede cancelar desde el
    teléfono la Prenatal del martes 10 (8 días adelante); tiene que ir a la web. Decidir:
    - Cancelar una clase (dueña): mostrar los 30 días, o un selector de fecha.
    - Reservar (clienta y Asistente): ¿cuántos días adelante se puede reservar? Si es una
      regla del estudio, va a **Reglas del estudio** y el backend la hace cumplir (hoy solo
      la limita la tira de la app, así que la API acepta reservas más lejanas).
    **Decidido por la dueña (2026-11-02): la clienta reserva solo 7 días adelante.** Pasa
    a ser regla del estudio: un valor en **Reglas del estudio** (7 por defecto), que el
    backend hace cumplir al reservar, sumarse a la lista de espera y reprogramar (por la
    clienta y por el Asistente), y que las apps leen para armar la tira en vez del 7 fijo.
    Cancelar una clase (dueña) no tiene ese límite: muestra los 30 días o un selector de
    fecha. Agregarlo a `docs/decisiones-emma-pilates.md`.
24. **Web, Editar sesión: una clase sin reservas no se puede cancelar a mano, y la nota da
    la regla mal.** `apps/admin-web/src/schedule/cancel-session-action.tsx:54`: con
    `bookedCount === 0` no se muestra **Cancelar sesión**, solo la nota «Sin reservas: si
    sigue vacía, el sistema la cancela sola 2 horas antes de empezar.» Dos problemas:
    - **La nota está mal.** El backend revisa a las **3 h** (lead time de **Reglas del
      estudio**, ADR-0007) y cancela con **menos del mínimo** (2 reservas), no solo vacía.
      El texto está fijo en el código aunque el componente ya carga `studioRules`: tiene
      que leer el mínimo y las horas de ahí.
    - **La dueña no puede cancelar una clase vacía** (feriado, instructora enferma). La
      app del equipo sí deja (Paso 10 de la guía). Agregar **Cancelar sesión** también sin
      reservas, con una confirmación corta. Vale lo mismo para la app del equipo si tiene
      la misma condición.
    **Ampliado en el Paso 10 (app del equipo):** cancelar el Reformer vacío del martes 3
    falla con «No pudimos cancelar la sesión. Inténtalo de nuevo.». Causa: el backend lo
    prohíbe a propósito, `apps/backend/src/booking/commands/cancel-session.ts:49`
    (`Session has no Bookings` → 409 `session_has_no_bookings`; el comentario dice que es
    una cancelación «de último recurso… que todavía tiene reservas»). Pero la app del
    equipo ofrece la pantalla de confirmación para una clase vacía, y
    `apps/staff-mobile/src/administrator/cancel-session-screen.tsx:47` traga el código y
    muestra un error genérico que invita a reintentar. La guía (Paso 10) dice que con cero
    reservas «la confirmación es corta», o sea, que debería funcionar. Decidir la regla:
    - permitir cancelar una clase vacía (recomendado: feriados, instructora enferma), y
      quitar la condición en el backend, la web y la app; o
    - mantener la prohibición, y entonces no ofrecer la clase vacía en **Cancelar una
      clase** ni en la web, y corregir la guía.
    En cualquier caso, la app tiene que mostrar el motivo real de cada código de error.
    **Decidido por la dueña (2026-11-02): permitir cancelar una clase futura aunque no
    tenga reservas.** Quitar la condición `liveBookingCount === 0` del backend (con su
    prueba y el código `session_has_no_bookings`), mostrar **Cancelar sesión** en la web
    también sin reservas, y dejar la confirmación corta de la app del equipo. Actualizar el
    comentario de `cancel-session.ts` y anotar la regla en `docs/decisiones-emma-pilates.md`.
