# Decisiones de negocio: Emma Pilates

Fecha: 22 de octubre de 2026. Responde al diagnóstico `docs/diagnostico-emma-pilates.md` y a sus 23 preguntas. **Cuando este documento contradiga al prompt original del diagnóstico, manda este documento.**

Apertura estimada: **diciembre de 2026**. Una sola sucursal.

## 1. Cambios respecto al prompt original

| Tema | Prompt original | Decisión final |
| --- | --- | --- |
| Ventana de cancelación | 12 h | **Se mantiene 2,5 h** con la reprogramación al mismo día que ya existe. Hacerla configurable (`StudioSettings`). La lista de espera sigue como hoy |
| Mínimo de reservas | 2 los primeros 2 meses, luego 3 | **2 reservas de forma permanente**, configurable desde la web |
| Facturación | Sin definir | **No se emite por SIAT.** Se factura por fuera. El sistema solo guarda los datos (ver 4.5) |
| Nutricionista | Propuesta de ocultarla | **Se mantiene**, con reglas nuevas (sección 6) |
| Coordinadora | Rol solo para nómina, sin acceso | **Rol nuevo con acceso**: operación sí, dinero no (sección 7) |
| Referidos | Crédito de Bs 60 | **Se elimina el crédito en dinero** y se reemplaza por "invita a una amiga" (sección 5.3) |

## 2. Planes y vigencias

### 2.1 Catálogo

Mismo precio para reformer, cadillac y mat.

| Plan | Clases | Vigencia | Precio (Bs) | Tope semanal |
| --- | --- | --- | --- | --- |
| Clase suelta | 1 | 30 días | 80 | — |
| 4 clases | 4 | 30 días | 290 | — |
| 8 clases | 8 | 30 días | 590 | — |
| 12 clases | 12 | 30 días | 820 | — |
| Bimestral 16 clases | 16 | 60 días | 1.120 | 3 por semana |
| Bimestral 24 clases | 24 | 60 días | 1.560 | 4 por semana |
| Trimestral 24 clases | 24 | 90 días | 1.590 | 3 por semana |
| Trimestral 36 clases | 36 | 90 días | 2.190 | 4 por semana |

### 2.2 Vigencia y fecha de inicio

- La vigencia se cuenta en **días** (30, 60 o 90) desde la **fecha de inicio que elige la clienta**, no en meses calendario.
- Al comprar, la clienta elige su fecha de inicio: por defecto, el día de hoy; como máximo, **14 días** después de la compra.
- Una vez aprobado el pago, puede reservar clases **a partir de su fecha de inicio**.
- **Renovación anticipada:** la clienta puede comprar su siguiente plan antes de que venza el actual. El plan nuevo empieza el día siguiente al fin del actual.

### 2.3 Tope semanal

- Solo en planes bimestrales y trimestrales: 3 clases por semana en los de 16 y 24 clases (8 por mes), 4 en los de 24 y 36 clases (12 por mes). Ver la tabla 2.1.
- Semana de lunes a domingo.
- Las clases extra (regalo, invitación convertida, campaña, cortesía) **no cuentan** para el tope.
- Aplica al reservar (clienta, recepción y promoción de lista de espera). Mostrar "te quedan N clases esta semana".

### 2.4 Congelamiento

- **Solo en planes trimestrales** (y en planes más largos, si se agregan).
- Una vez por plan, hasta 15 días.
- La clienta lo solicita desde la app con fechas y motivo; **la administradora lo aprueba** (notificación push).
- No puede empezar en el pasado.
- La fecha de fin del plan se extiende exactamente los días congelados.
- Durante el congelamiento no se puede reservar.
- Las fundadoras no pierden su beneficio por congelar.

### 2.5 Otras reglas

- Planes intransferibles y no reembolsables.
- Las clases que no se usan dentro de la vigencia se pierden.

## 3. Reservas y clases

### 3.1 Cancelación y lista de espera

Sin cambios respecto a lo que existe: ventana de 2,5 h, reprogramación al mismo día dentro de la ventana, lista de espera automática hasta el inicio de la ventana. Solo centralizar la constante en `StudioSettings` y eliminar los textos fijos en las apps.

### 3.2 Mínimo de reservas

- Una clase se dicta solo si tiene al menos **2 reservas** (valor configurable desde la web).
- Revisión automática **3 h antes** del inicio (antes de que se cierre la ventana de 2,5 h).
- Si no llega al mínimo: se cancela, se devuelve la clase a cada reservada, se les avisa por push e inbox para que elijan otro horario del mismo día, y se registra la causa `minimum_not_met`.
- La instructora recibe **25 Bs** de compensación **solo** cuando la clase se cancela por no llegar al mínimo. Si la administradora cancela por otra causa, no hay compensación.
- El chequeo actual de "cero reservas 2 h antes" queda reemplazado por esta regla.

## 4. Cobros, caja y facturación

### 4.1 Pago por QR desde la app

- Funciona como hoy: la clienta paga por QR y sube el comprobante.
- **Solo la administradora** revisa y aprueba (notificación push al llegar cada comprobante; aprobación desde el celular).
- Mientras el pago está pendiente, la clienta no puede reservar. La app muestra "Pago en revisión".
- Si se rechaza, la administradora indica un motivo que la clienta ve.

### 4.2 Pago en el estudio

- **Clienta nueva:** la recepcionista crea su perfil (con canal de adquisición y código, si tiene) y registra el pago.
- **Efectivo:** el plan se activa en el momento.
- **QR en recepción:** la recepcionista sube el comprobante y el pago queda pendiente de aprobación de la administradora, igual que un QR desde la app.
- Una clienta que ya tiene la app paga por QR desde su app.

### 4.3 Controles

- La recepcionista **no puede borrar ni modificar** una venta. Solo la administradora puede anularla.
- **Cortesías, devolución de clases y ajustes: solo la administradora.**
- Todo queda registrado en auditoría (quién, qué, cuándo, a quién).

### 4.4 Cierre de caja diario

Al final del turno: efectivo esperado según ventas registradas, efectivo contado, diferencia y nota. Historial visible para la administradora.

### 4.5 Datos para la factura

En cada venta: NIT o CI, nombre o razón social, y una marca de "factura emitida" (con quién y cuándo la marcó). La factura se emite fuera del sistema. Permitir filtrar ventas sin factura emitida.

## 5. Promociones

### 5.1 Membresía fundadora

- Máximo **40 clientas distintas**.
- **15 % de descuento en cualquier plan**, excepto la clase suelta.
- Ligada a la persona, no al plan: si cambia de plan, el descuento sigue.
- Se pierde de forma **automática y definitiva** si pasan más de **7 días** entre el fin de un plan y el inicio del siguiente.
- No se acumula con la clase de regalo ni con campañas. Sí participa en "invita a una amiga".
- Guardar el descuento en el pago (`discountCentavos`, `discountReason`).

### 5.2 Clase de regalo para clientas nuevas

+1 clase sumada automáticamente al **primer plan de la vida** de la clienta, al aprobarse el pago. No aplica a fundadoras.

### 5.3 Invita a una amiga (reemplaza el crédito por referidos)

- Eliminar el crédito en dinero de Bs 60 y lo que dependa solo de él. Producción no tiene clientas reales.
- Cada clienta tiene un código de referido. La anfitriona lo comparte con su amiga.
- La amiga se registra en la app con ese código (o la recepcionista la registra con el código). Así queda en la base para promociones.
- La amiga recibe **una clase gratis, una sola vez en su vida**, en una clase con cupo libre que **no sea el último cupo**.
- Cada anfitriona puede invitar a **una amiga por mes**.
- Si la amiga compra un plan, la anfitriona gana **+1 clase** en su plan vigente (o en el siguiente, si no tiene uno activo).

### 5.4 Campañas

Inicio de año y vacaciones: clases extra con motivo "campaña". Solo la administradora las crea. Nunca descuentos en el precio.

### 5.5 Catering

Beneficio confirmado; convenio, porcentaje y forma de acreditación **por definir**. Dejar preparada una tarjeta informativa en "Mi plan". Prioridad baja.

### 5.6 Clases extra

Todas las clases extra (regalo, invitación, campaña, cortesía) se registran como ajustes con motivo y autor (`AllowanceAdjustment`), sin tocar el pago. La app muestra su origen.

## 6. Nutricionista

Las consultas gratis **solo se regalan en planes trimestrales en adelante**.

| Clienta | Beneficio |
| --- | --- |
| Plan trimestral (y planes más largos, si se agregan) | 1 consulta gratis por trimestre |
| Planes mensuales, bimestrales y clase suelta (incluidas fundadoras con esos planes) | Consulta pagada: **70 Bs** (QR en la app o efectivo) |

- La nutricionista cobra al estudio **50 Bs por consulta**: registrarlo como costo.
- La consulta incluida se usa dentro de la vigencia del plan; si no se usa, se pierde.
- Si la clienta no asiste o cancela con menos de 3 h, la consulta se da por usada.
- Se reemplaza la regla actual de "una por mes con plan activo".

## 7. Roles y permisos

| Persona | Rol |
| --- | --- |
| Dueña | Administradora |
| Recepcionista | Asistente |
| Instructoras | Trainer |
| Nutricionista | Nutricionista |
| Coordinadora de marketing y operaciones | **Coordinadora (rol nuevo)** |

La coordinadora **no puede ver nada relacionado con dinero**. Sí puede gestionar la operación del estudio.

| Acción | Administradora | Coordinadora |
| --- | --- | --- |
| Crear, modificar y cancelar clases y horarios | ✓ | ✓ |
| Asignar instructoras y reemplazos | ✓ | ✓ |
| Cancelar una clase con reservas | ✓ | ✓ |
| Ver y editar perfiles de clientas y sus reservas | ✓ | ✓ |
| Ver clases restantes y vencimientos de clientas | ✓ | ✓ |
| Ver asistencia, ocupación, clientas nuevas y renovación (en cantidades) | ✓ | ✓ |
| Gestionar personal (datos, horarios) | ✓ | ✓ |
| Lista "para contactar" del seguimiento de 90 días | ✓ | ✓ |
| Ver precios de los planes (públicos) | ✓ | ✓ |
| Ventas, ingresos, caja y cualquier monto | ✓ | ✗ |
| Aprobar comprobantes, anular ventas | ✓ | ✗ |
| Cortesías y devolución de clases | ✓ | ✗ |
| Crear promociones y campañas | ✓ | ✗ |
| Pagos y comisiones del equipo (incluidos los suyos) | ✓ | ✗ |
| Costos, resultados, proyecciones y recomendaciones financieras | ✓ | ✗ |

La coordinadora usa la web de administración (secciones operativas) y la app de staff.

## 8. Pago a instructoras

- **65 Bs por clase** con hasta 4 alumnas.
- **+8 Bs por cada alumna desde la quinta.**
- Las alumnas se cuentan con las **reservas confirmadas al cerrarse la ventana de cancelación** (2,5 h antes). Una alumna que no asiste cuenta igual.
- **25 Bs** por clase cancelada por no llegar al mínimo.
- **Comisión del 10 %** del **primer plan** de cada clienta que trajo la instructora, calculada sobre **lo que la clienta realmente pagó** (con descuento de fundadora, si aplica). Se liquida en el mes en que se aprueba ese pago.
- Statement mensual generado automáticamente; la administradora lo aprueba. Cada instructora ve solo el suyo en "Mis pagos".
- Tarifas configurables (`PayRateRule`).

## 9. Pago a la coordinadora (solo lo ve la administradora)

- Base: **3.500 Bs**.
- **50 Bs** por clienta nueva en plan mensual; **80 Bs** en bimestral o trimestral.
- **Bono de 400 Bs** si el porcentaje de renovación del mes alcanza la meta: 80 % (meses 1 a 6), 85 % (meses 7 a 12), 90 % (desde el mes 13). Metas configurables.
- **Renovó** = compró otro plan antes del vencimiento o hasta 7 días después.
- Una sola comisión por clienta: si la trajo una instructora, cobra la instructora y no la coordinadora.
- Clase suelta, clase de regalo y amigas invitadas no generan comisión.

## 10. Canal de adquisición

"¿Cómo nos conociste?" en el registro y en recepción: Instagram, TikTok, Facebook, Google, recomendación de una amiga, una instructora, pasé por el estudio, otro. **Si hay código de referencia, manda el código.**

## 11. Finanzas

- **Impuestos:** 16 % de las ventas (13 % IVA + 3 % IT), configurable.
- **Presupuesto de costos fijos** (mensual, para comparar con el gasto real): alquiler 8.500, coordinadora 3.500, recepción 3.400, luz/agua/internet 600, software 150, limpieza 800, contador 800, mantenimiento 100, anuncios 1.000, insumos 400. Imprevistos: 10 % sobre el subtotal (19.250). Total: 21.175 Bs.
- Los sueldos se registran como pagos reales (`SalaryPayment`).
- **Ingresos:** mostrar siempre las dos vistas: **caja** (lo cobrado) y **devengado por días de vigencia**, más las clases pendientes de dar.

## 12. Seguimiento de los primeros 90 días

- Mensajes por push e inbox de la app (día 2, semana 1, día 30, día 90).
- Alertas: 7 días sin reservar y menos de 4 clases en el primer mes.
- Lista "para contactar" para que la coordinadora escriba por WhatsApp a mano. Sin integración de WhatsApp por ahora.
- Claude Code redacta los textos; la dueña los aprueba.

## 13. Alcance

- **iOS:** sí. Se abre el Apple Developer Program.
- **IA:** se acepta enviar un resumen mensual agregado, sin nombres de clientas, a un proveedor externo.
- Una sola sucursal al abrir.

## 14. Plan de trabajo

- Empezar ya con la Fase 0 y la Fase 1, ajustadas a este documento.
- Ya no hace falta cambiar la ventana de cancelación a 12 h: solo centralizarla.
- Si a fines de noviembre no está todo listo, abrir con lo imprescindible: planes por días con fecha de inicio y renovación anticipada, mínimo de reservas, fundadoras, clase de regalo, canal de adquisición, cierre de caja y datos de factura. Terminar en diciembre congelamiento, equipos e impuestos. El pago a instructoras debe estar listo para el cierre del primer mes.

## 15. Pendientes que no bloquean

- Detalles del convenio de catering.
- Horarios exactos de las clases (se cargan desde la web).

## 16. Addendum del 2026-10-28

La dueña resolvió las preguntas abiertas de la revisión del lanzamiento. Estas seis decisiones ganan sobre cualquier lectura anterior de este documento.

1. **Descuento de fundadora desde el primer plan.** Una fundadora recibe el 15 % desde su primer plan, no desde el segundo. El lugar se decide, bajo el candado que ya existe, cuando se cotiza la venta (intención de compra, venta en efectivo o QR en recepción), mientras queden lugares. Se vuelve definitivo al confirmar el pago. Una fundadora nunca recibe la clase de regalo ni las clases de campaña.
2. **Clase de pase de invitada cancelada.** Si la amiga cancela a tiempo su clase gratis, puede reservar otra. Vuelven a aplicar las reglas del pase: una clase con cupo que no sea el último cupo.
3. **Qué deshace una anulación.** La anulación deshace todo lo que salió de esa venta: el lugar de fundadora, si esa venta lo otorgó (el lugar queda libre); la clase de regalo y la clase de recompensa de la anfitriona, si aún no se usaron; las consultas incluidas en la suscripción anulada (se cancelan, así que su costo de 50 Bs deja de contar); las entradas en lista de espera de la clienta atadas a esa suscripción; y las reservas futuras, como hoy. Cada reversión queda auditada.
4. **Cierre de caja y anulaciones.** Una venta en efectivo anulada sigue en el efectivo esperado del cierre de caja, porque no se devuelve dinero. Aparece en su propia línea: «Ventas anuladas (efectivo en caja): Bs N». Si alguna vez se devuelve dinero, la administradora lo registra como una salida.
5. **«Renovó» para el bono.** Se mide por la fecha de compra, como ya dice la sección 9. Una renovación es otro plan real cuyo pago se aprobó (fecha de Bolivia) antes del fin del anterior, o hasta 7 días después, sea cual sea la fecha de inicio que ella eligió. El bono y los indicadores usan esta única definición.
6. **Sucursales de una instructora.** La coordinadora puede asignar las sucursales de una instructora (`PUT /staff-members/{id}/branches` y el control de la web de administración). Cualquier otra escritura sobre el personal sigue siendo de la administradora.
