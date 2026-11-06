# Recorrido a mano de Emma Pilates

Esta guía recorre todo lo que una persona puede hacer en el software, a mano,
empezando con la base de datos vacía. No carga datos de ejemplo y no usa
Swagger. Cada cosa que aparece en una pantalla la creaste tú en un paso
anterior.

Sirve para aprender el producto, no para probar el código. La guía técnica
en inglés, con cuentas de ejemplo y pruebas automáticas, sigue en
[`testing-guide.md`](./testing-guide.md).

El recorrido usa tres personas inventadas. Cámbiales el nombre si quieres.
Usa correos que puedas abrir, o el buzón local del paso 0.

| Quién | Dónde entra | Para qué está |
| --- | --- | --- |
| Ana | Web de administración | Dueña. Crea el estudio, aprueba pagos y ve el dinero. |
| Camila | App del equipo | Recepcionista. Atiende a las clientas y cobra en el estudio. |
| Daniela | App del equipo | Instructora. Ve su agenda y pasa lista. |
| Gabriela | App del equipo | Nutricionista. Publica sus turnos. |
| Lucía | App de clientas | La primera clienta. Compra, reserva y usa su plan. |
| Valeria | App de clientas | La amiga que Lucía invita. |

La coordinadora entra al final, cuando ya hay operación que mirar. No hace
falta crearla para entender el resto.

## Cómo leer cada paso

- Los nombres entre comillas angulares, como **Horario**, son lo que dice el
  botón o el menú.
- En el teléfono, la barra de abajo de la app de clientas tiene cuatro
  pestañas: **Inicio**, **Reservar**, **Mis Reservas** y **Perfil**.
- En la web, el menú es un riel de íconos a la izquierda con nueve destinos:
  **Inicio**, **Horario**, **Clientas**, **Promociones**, **Comentarios**,
  **Dinero**, **Estudio**, **Informes** y **Ajustes**. Cada destino tiene
  pestañas arriba. La guía los escribe así: **Ajustes › Planes** es el
  destino **Ajustes**, pestaña **Planes**. En una ventana angosta el riel se
  abre con **Abrir menú**.
- Un panel se abre por la derecha. **Guardar** lo cierra cuando los datos
  sirven. **Cerrar** o Escape lo cierra sin guardar.
- Las fechas se escriben `dd/mm/aaaa` y las horas `HH:mm`, en 24 horas. El
  reloj del estudio es el de La Paz.
- El dinero de la web muestra centavos (`Bs 560,00`). Las apps muestran
  bolivianos enteros (`Bs 560`), salvo el cierre de caja y **Mis pagos**, que
  muestran centavos.
- Nada se borra de verdad. Archivar, anular, desactivar y cerrar una cuenta
  esconden el registro y dejan el rastro.

## Qué no vas a encontrar

- No hay tarjeta de catering en **Mi plan**. El convenio todavía no está
  definido.
- La factura se emite fuera del sistema. Aquí solo se anota el NIT o CI y se
  marca **Factura emitida**.
- Un enlace de correo abre la app en un teléfono Android con la app
  instalada. En el simulador de iPhone el enlace no abre la app: copia el
  enlace del correo, o del archivo del buzón local, y ábrelo en el navegador
  de la web o pégalo donde el paso lo diga.
- El enlace «Confirma tu correo» de la clienta tampoco abre la app en el
  simulador de iPhone con Expo Go: el navegador solo dice «Abre este enlace en
  la app». Copia el `token=…` del enlace y confírmalo contra la API:

  ```sh
  curl -X POST http://localhost:3100/api/v1/client-email-verifications \
    -H 'Content-Type: application/json' \
    -d '{"verificationToken": "EL_TOKEN_DEL_ENLACE"}'
  ```

  Vuelve a la app: la pantalla **Revisa tu correo** pasa a **Inicio**.

## Paso 0. Dejar el estudio vacío y encendido

Hazlo una vez. Si la base ya tiene el estudio de ejemplo, usa otra base con
otro nombre. No apuntes estos comandos a producción ni a una base
compartida.

1. Instala PostgreSQL 18 y déjalo en el puerto 5433, como explica el Test 2
   de [`testing-guide.md`](./testing-guide.md). En cada Terminal:

   ```sh
   export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"
   export PGPORT=5433
   ```

2. Crea la base vacía y copia la configuración local:

   ```sh
   createdb emma_vacia
   cp -n apps/backend/.env.example apps/backend/.env
   ```

   En `apps/backend/.env`, `DATABASE_URL` debe terminar en `/emma_vacia` y
   `PORT` debe ser `3100`. Si el archivo ya existía y apunta a otra base,
   cámbialo antes de seguir. No ejecutes `db:fixtures`.

3. Crea las tablas y genera el cliente de la base de datos:

   ```sh
   pnpm --filter @pilates/backend db:migrate:deploy
   pnpm --filter @pilates/backend prisma:generate
   ```

   El primer comando actualiza la base de datos. El segundo crea el código
   que el backend usa para leerla (`apps/backend/src/generated/prisma`), a
   partir del esquema. Ese código no se guarda en el repositorio, así que
   corre los dos comandos otra vez después de cada `git pull`. Sin el
   segundo, el backend no compila: dice que no existen campos o tablas que
   sí están en el esquema, como `periodStart` o `referralCode`.

4. Abre tres Terminales y deja cada una abierta:

   ```sh
   pnpm dev:backend
   ```

   ```sh
   cd apps/backend
   pnpm build
   node --env-file=.env dist/src/worker-main.js
   ```

   Si saltaste el paso 3 después de un `git pull`, el build falla con
   errores de tipos y el worker arranca el `dist/` viejo: vuelve al paso 3.

   `pnpm start:worker` no lee `apps/backend/.env`. Sin `--env-file` el
   worker se detiene al validar `DATABASE_URL` y no escribe los correos.

   ```sh
   pnpm dev:admin
   ```

   La web queda en `http://localhost:5173`. La API queda en
   `http://localhost:3100`.

5. Abre la app de clientas y la app del equipo en el simulador o en el
   teléfono, cada una apuntando a `http://127.0.0.1:3100/api/v1`. El Test 1
   de la guía técnica dice cómo levantarlas. No inicies sesión todavía:
   no hay cuentas.

El worker, en local, escribe cada correo como un archivo JSON en
`apps/backend/.data/email-capture/`. El archivo tiene `subject`, `text`,
`html` y `link`. Si el correo no llega a una bandeja real, abre el archivo
más nuevo y usa su `link`. Puedes borrar esa carpeta cuando quieras: no es
parte del estudio.

## Paso 1. Crear a la dueña

Nadie puede registrarse como administradora desde la web. La primera cuenta
nace con un comando, una sola vez por base. El comando no inventa una
contraseña y no la imprime.

Desde `apps/backend`, con el `.env` que usa la API:

```sh
cd apps/backend
BOOTSTRAP_ADMINISTRATOR_EMAIL=ana@example.com \
BOOTSTRAP_ADMINISTRATOR_NAME="Ana Méndez" \
node --env-file=.env dist/src/administrator-bootstrap-main.js
```

Si esa ruta no existe, corre antes `pnpm build` en `apps/backend`. El
script `pnpm admin:bootstrap` no lee el `.env`.

La línea que imprime dice `administrator_bootstrap_completed` y
`status: created`. Si lo corres otra vez con el mismo correo, renueva el
enlace. Si lo corres con otro correo mientras Ana no ha activado, se niega.
Cuando Ana ya activó, se niega siempre: las siguientes personas se crean
desde la web.

El worker deja el correo «Activa tu cuenta en Emma Pilates Studio». Ábrelo,
o abre el archivo `activation` del buzón local. En local el enlace del correo
(`https://links.emmapilates.test/…/activate-account?token=…`) no abre nada:
copia lo que va después de `token=` y ábrelo en la web como
`http://localhost:5173/crear-contrasena?token=EL_TOKEN`. Pegar la ruta del
enlace en `localhost:5173` da «Página no encontrada». Llegas a **Crear
contraseña**. Escribe una contraseña y confírmala. El enlace dura siete días
y sirve una vez.

Entra a la web con el correo de Ana y esa contraseña. La primera pantalla es
**Inicio**: lo que hay por resolver, el día en el estudio y el dinero. Con
el estudio vacío no hay nada que mostrar todavía.

Antes de seguir, abre **Ajustes › Reglas del estudio**. Ahí viven las reglas
que el resto del recorrido va a obedecer. Déjalas como vienen, y léelas:

- Cancelación sin costo hasta 2 h 30 antes de la clase.
- Una clase se dicta si tiene al menos 2 reservas. El sistema lo revisa 3 h
  antes.
- La fecha de inicio de un plan puede ser hoy o hasta 14 días después.
- Hay 40 lugares de fundadora, con 15 % de descuento, y se pierden si pasan
  más de 7 días entre un plan y el siguiente.
- La consulta nutricional suelta cuesta Bs 70. La nutricionista cobra
  Bs 50 al estudio.
- El impuesto es 16 %.

Lo que sí puedes cambiar ahí, y solo la dueña, es el mínimo de reservas, los
días adelante que una clienta puede reservar (7, de 1 a 30, contando hoy), el
impuesto, las metas de renovación y la fecha de apertura. La fecha se escribe
como `dd/mm/aaaa`, sea cual sea el idioma del navegador. Guarda un cambio y
vuelve a entrar: el número nuevo es el que usan las apps, sin reinstalarlas.
Vuelve a dejar los valores de arriba si los cambiaste para probar.

## Paso 2. Armar el catálogo

Sin esto no hay clase que reservar ni plan que vender. El orden importa:
primero la sede, después el tipo de clase, después el plan.

Antes de vender, sube el QR de transferencia del estudio en **Ajustes › QR
del estudio**: es el que la clienta ve al pagar en la app, y la app usa el
nuevo apenas lo subes. Mientras no subas ninguno, la página dice «Es el QR de
prueba del servidor».

### Sucursales

1. **Ajustes › Sucursales**. La lista está vacía. Pulsa **Nueva sucursal**.
2. Nombre `Centro`. Dirección, la de verdad o `Av. San Martín 1120`.
   **Guardar**.
3. La fila aparece en la lista. Ábrela: puedes corregir el nombre. No la
   archives todavía. Archivar una sede la esconde de las apps y cierra los
   horarios de nutrición que dependan de ella.

Arriba a la derecha está el selector de sede. Con una sola sede no hay nada
que elegir. Cuando crees una segunda, todo lo que depende de una sede
(horario, caja, insumos, equipos, gastos) cambia al cambiar el selector.
Clientas, pagos, sueldos, promociones y comentarios son del estudio entero:
en esas pantallas el selector se reemplaza por **Todo el estudio**.

### Tipos de clase

1. **Ajustes › Tipos de clase**, **Nuevo tipo de clase**.
2. Crea tres. La descripción es obligatoria: es el texto que la clienta lee
   al abrir la clase.

   | Nombre | Descripción | Capacidad | Equipo necesario |
   | --- | --- | --- | --- |
   | Mat Pilates | Clase de mat en grupos pequeños. | 12 | Mat |
   | Reformer Pilates | Clase de reformer, un equipo por persona. | 8 | Reformer |
   | Pilates Prenatal | Clase de mat para el embarazo. | 8 | Mat |

3. Abre **Mat Pilates** y cambia la capacidad a 10. El aviso dice que las
   clases ya creadas no cambian. Todavía no hay ninguna, así que el cambio
   aplica a todo lo que crees después.
4. No archives un tipo que ya use un horario semanal vigente: el sistema se
   niega.

### Planes

**Ajustes › Planes**, **Nuevo plan**. Crea los ocho de la tabla del estudio, en
este orden, para que la app los muestre así. **Vigencia** es 30, 60 o 90
días. **Tope semanal** solo existe en 60 y 90 días; en un plan de 30 días el
campo está apagado. **Orden en la app** es el número de la fila.

| Nombre | Vigencia | Tope semanal | Clases incluidas | Precio | Orden |
| --- | --- | --- | --- | --- | --- |
| Clase suelta | 30 días | Sin tope | 1 | 80,00 | 1 |
| 4 clases | 30 días | Sin tope | 4 | 290,00 | 2 |
| 8 clases | 30 días | Sin tope | 8 | 590,00 | 3 |
| 12 clases | 30 días | Sin tope | 12 | 820,00 | 4 |
| Bimestral 16 clases | 60 días | 3 clases por semana | 16 | 1120,00 | 5 |
| Bimestral 24 clases | 60 días | 4 clases por semana | 24 | 1560,00 | 6 |
| Trimestral 24 clases | 90 días | 3 clases por semana | 24 | 1590,00 | 7 |
| Trimestral 36 clases | 90 días | 4 clases por semana | 36 | 2190,00 | 8 |

Ocultar un plan lo quita del catálogo de la clienta. No toca un plan que
alguien ya compró. El precio que guardas tampoco reescribe una venta ya
hecha.

## Paso 3. Invitar al equipo

**Estudio › Personal**. Ana ya está en la lista, con rol **Administración** y
estado **Activo**. Pulsa **Nuevo miembro** para cada persona.

| Nombre | Correo | Celular | Rol | Sucursales |
| --- | --- | --- | --- | --- |
| Camila Rojas | camila@example.com | 🇧🇴 +591 · 70000001 | Asistente | Centro |
| Daniela Ortiz | daniela@example.com | 🇧🇴 +591 · 70000002 | Entrenadora | Centro |
| Gabriela Flores | gabriela@example.com | 🇦🇷 +54 · 91123456789 | Nutricionista | Centro |

**Celular** es obligatorio. A la izquierda del campo está el país, con
**🇧🇴 +591** ya elegido: para Bolivia escribes solo los 8 dígitos. Un celular
de Bolivia empieza con 6 o 7, y lo puedes escribir con espacios o guiones.
Para Gabriela, pulsa **🇧🇴 +591**, busca `Argentina` (o `+54`) en la lista y
elígelo; después escribe sus 11 dígitos. Al guardar, la lista muestra cada
número con su bandera: `🇧🇴 +591 70000001`, `🇦🇷 +54 91123456789`.

- Vacío: «Escribe tu celular. Lo necesitamos para escribirte por WhatsApp.»
- Un número de Bolivia de 7 dígitos, o que empieza con otro número: «Un
  celular de Bolivia tiene 8 dígitos y empieza con 6 o 7.»
- Con otro país, la regla de ese país, por ejemplo «Un celular de Perú tiene
  9 dígitos y empieza con 9.»

En los tres casos no se guarda nada. El campo es el mismo en **Nuevo
cliente** de la app del equipo, en **Regístrate** y **Editar perfil** de la
app de la clienta, y en **Editar perfil** de la ficha de una clienta en la
web.

**Guardar** manda el correo de activación. La fila queda **Pendiente**.
Ábrela y verás **Reenviar enlace**, **Cambiar correo** y **Cancelar
invitación**. Reenviar demasiado seguido muestra el aviso de límite, con la
cuenta atrás.

Cada persona abre su correo, entra al enlace y crea su contraseña. Ese
enlace abre la web, no la app. En local, igual que en el paso 1, copia el
`token=` del enlace y ábrelo como
`http://localhost:5173/crear-contrasena?token=EL_TOKEN`. Cuando termina, su
fila pasa a **Activo**.

Abre a Daniela. Una entrenadora recibe su código de referido sola, al
crearla: sale de su nombre, en mayúsculas y sin tildes (`DANIELA`; si ya
existe, su apellido, y después `DANIELA2`). Anótalo: lo va a usar Lucía.
Daniela puede cambiarlo en la app del equipo, desde **Perfil** → **Tu código
de referido**, una vez cada 30 días. Los otros roles no tienen código.

Una persona con rol **Administración** o **Coordinador** no elige sede: ve
todas. Las demás solo ven las sedes que marques.

**Editar miembro.** Abre a Camila (o a cualquier otra persona, activa o
pendiente). **Nombre** y **Celular** son campos: corrige el nombre, escribe
`70000001` si le falta el celular y pulsa **Guardar**. La lista muestra el
nombre nuevo y `🇧🇴 +591 70000001`, con el aviso «Guardamos los cambios de
…». El celular es el mismo campo de arriba, con su país; si no lo tocas, el
que estaba (aunque sea de antes de la regla, o ninguno) se guarda igual. Un
celular que cambias tiene que ser válido, y no se puede borrar. El correo de una
persona **activa** se ve pero no se edita: es con el que entra, y cambiarlo
necesita que el correo nuevo lo confirme (todavía no está). El de una
**pendiente** se cambia con **Cambiar correo**. Tu propia fila sigue de solo
lectura, y la coordinadora solo puede cambiar las sucursales de una
entrenadora.

**Foto de perfil.** En el mismo panel, arriba, está el círculo de la
persona con **Cambiar foto**. Elige una foto JPG, PNG o WebP de hasta 5 MB:
aparece al momento con «Subiendo foto…» y queda guardada sin pulsar
**Guardar**. **Quitar foto** la saca y vuelven las iniciales. Un PDF o una
imagen más pesada dice «Elige una foto JPG, PNG o WebP de hasta 5 MB.». La
coordinadora también puede cambiar la foto de cualquiera. La foto se ve en la
lista de **Personal**, en **Horario** junto al nombre de la entrenadora y,
la tuya, arriba a la derecha.

## Paso 4. El equipo entra a su app

Abre la app del equipo. La pantalla es **Acceso del equipo**. No hay
**Regístrate**: el equipo no se crea solo.

Cada rol tiene su barra de abajo, y todas terminan en **Perfil**. En la
primera pestaña de cada rol, arriba a la derecha, está la campana de
**Notificaciones**, con el número de avisos sin leer.

| Rol | Barra de abajo |
| --- | --- |
| Entrenadora | **Agenda** · **Mis pagos** · **Perfil** |
| Asistente | **Clientes** · **Horario** · **Caja** · **Perfil** |
| Nutricionista | **Agenda** · **Disponibilidad** · **Perfil** |
| Administración | **Pagos** · **Clientes** · **Horario** · **Perfil** |
| Coordinación | **Clientes** · **Para contactar** · **Horario** · **Perfil** |

1. Daniela entra con su correo y la contraseña que acaba de crear. Llega a
   **Agenda**: arriba «Entrenadora · » y la fecha, `Hola, Daniela`, y la tira
   **Esta semana** con **Hoy** y los seis días siguientes. Si todavía no
   publicaste clases, el día está vacío; si la semana ya tiene clases, las
   ves aquí.
2. Abre **Perfil**. Muestra su nombre, su correo y su celular, con la nota
   «Tu nombre y tu correo los actualiza administración.». Debajo, **Tu
   cuenta** con **Rol** y **Sucursal**, y **Ajustes** con **Mis pagos**, **Tu
   código de referido**, **Notificaciones**, **Cambiar contraseña**,
   **Enviar comentarios** y **Cerrar sesión**. Su círculo tiene sus iniciales y **Cambiar foto**: elige una
   foto de la galería y queda puesta («Subiendo foto…» mientras sube); con
   foto aparece también **Quitar foto**.
3. Cierra sesión. Camila entra y llega a **Clientes**, con **+ Nuevo
   cliente**: la búsqueda pide al menos dos letras o números. **Cerrar caja**
   vive en la pestaña **Caja**. Gabriela entra y llega a su **Agenda** de
   nutrición; vacía dice «No tienes evaluaciones», con **Ver mi
   disponibilidad**.
4. Ana también puede entrar a la app del equipo. Llega a **Pagos**: **Pagos
   pendientes** vacío dice «Todo al día», con **Ver el horario**, y debajo
   **Accesos**: **Cancelar una clase**, **Congelamientos** y **Cerrar caja**.
   Su perfil dice «Tus datos se editan en la web de administración.»,
   **Sucursales** «Todas las sucursales» y, en **Ajustes**, además **Ver la
   app como…**.
   Déjalo para el paso 16.

Si alguien olvida la contraseña, en el acceso del equipo está **¿Olvidaste
tu contraseña?**. El correo «Crea una contraseña nueva» dura 30 minutos.

## Paso 5. Publicar la semana

Vuelve a la web como Ana. **Horario › Clases**. Elige la sede **Centro** si el
selector ya tiene más de una.

1. Pulsa **Nueva sesión**. El foco cae en **Una sola vez**.
2. Tipo de clase **Mat Pilates**. Entrenadora **Daniela Ortiz**. Si Daniela
   no aparece, no está asignada a esta sede: vuelve a **Estudio › Personal** y
   márcala.
3. Para aprender el horario de verdad, cambia la frecuencia a **Cada
   semana**. Elige el lunes, la hora `09:00` y deja la duración que propone
   el tipo. **Vigente desde** es hoy, escrito `dd/mm/aaaa`. **Guardar**.
4. El sistema crea las clases de los próximos 30 días y sigue creándolas
   cada hora. En la grilla de la semana ves el bloque con el tipo, la hora y
   la entrenadora. En una ventana de 1024 px el bloque usa tres líneas para
   que el nombre no se corte.
5. Repite **Cada semana** para un reformer: miércoles `18:30`, **Reformer
   Pilates**, Daniela, capacidad 8.
6. Crea también una clase **Una sola vez**, para mañana, de **Pilates
   Prenatal**, a la hora que quieras. Esa no se repite.

El riel de la izquierda empieza en **Inicio**, sin la «E» arriba; la marca
queda en «Emma Pilates Studio» de la barra de arriba.

Abre una clase de la grilla. Arriba, **Reservaron (n)** con el botón chico
**Reservar** al lado y, debajo, la lista simple de quienes reservaron y la
lista de espera. Después, **Aplicar cambios a** (**Solo esta sesión** o
**Esta y las futuras**) justo encima de los campos que cambia: entrenadora,
fecha, hora, duración y capacidad. Abajo, **Guardar** y **Cancelar esta
clase**. Al final, la fila «Serie semanal · cada miércoles 18:30» con
**Pausar la serie** y **Terminar la serie**, en los dos modos. Una clase
pasada solo se lee. Cancelar una clase sin reservas es directo. Cancelar una
con reservas avisa a las clientas y devuelve la clase a cada una. Hazlo
cuando Lucía ya tenga una reserva, en el paso 9.

Las clases canceladas no desaparecen: quedan en su lugar, apagadas, con un
borde punteado y el motivo: **Cancelada · mínimo** (no llegó al mínimo en la
revisión de las 3 h), **Cancelada · estudio** (la cancelaste tú o la
coordinadora) o **Serie en pausa**. El subtítulo las cuenta aparte
(«5 sesiones esta semana · 2 canceladas»). Al tocar una se abre **Clase
cancelada**, solo para leer: el motivo, cuándo pasó y cuántas reservas tenía.
Una clase que se quitó porque cambiaste o terminaste la serie no se muestra:
la clase nueva ocupa su lugar.

En la app del equipo, Daniela abre **Agenda**. La tira **Esta semana**
muestra **Hoy** y los días siguientes (`lun 9`, `mié 11`, y así), y el botón
**Hoy** vuelve al día de hoy. Al tocar el lunes aparece la clase de las 09:00,
con `0 de 12 reservados` si dejaste la capacidad en 12, o `0 de 10` si
guardaste el cambio del paso 2. Toca la clase: la lista de asistencia está
vacía, dice «Podrás marcar asistencia cuando empiece la clase.» y
**Guardar asistencia** está apagado. Arriba está **Reportar una falla**, para
avisar de un equipo que no funciona. Si una de sus clases del día se canceló, sigue en la lista, apagada,
con «Cancelada · mínimo no alcanzado» o «Cancelada por el estudio» y sin
flecha: no se abre. El título lo cuenta («Hoy · 2 clases · 1 cancelada»), y
un día con todas canceladas dice «Hoy · 5 canceladas» en vez de «Hoy no
tienes clases».

## Paso 6. Lo que la clienta ve antes de comprar

Abre la app de clientas. La primera pantalla es el acceso, con **Regístrate**.

1. Pulsa **Regístrate**. El formulario pide nombre, correo, contraseña y
   confirmar contraseña, y el **Celular**, que es obligatorio: con **🇧🇴
   +591** ya elegido, escribe `70712345`. Si lo dejas vacío, **Crear cuenta**
   muestra «Escribe tu celular. Lo necesitamos para escribirte por
   WhatsApp.» y no crea nada. Abre **¿Cómo nos
   conociste?** y elige **Una instructora**. En el código de referido escribe
   el código de Daniela. **Crear cuenta**.
2. La pantalla pasa a **Revisa tu correo**. El enlace dura 24 horas. Si
   cierras la app y la vuelves a abrir, sigues en esa pantalla hasta que
   confirmes, canceles el registro o pasen 7 días.
3. Abre el correo «Confirma tu correo para activar tu cuenta» y pulsa
   **Confirmar mi correo**. Entras a **Inicio**.
4. **Inicio** saluda `Hola, Lucía`. No hay plan. La tarjeta grande dice
   «Elige tu plan y empieza a moverte», con **Comprar un plan**. Debajo, en
   **Accesos rápidos**, **Reservar una clase** está con candado y dice
   «Necesitas un plan activo»; al lado, **Evaluación nutricional** e
   **Invita a una amiga**. El carrusel de promociones está vacío hasta el
   paso 14.
5. **Reservar** muestra la semana, pero al abrir una clase **Reservar** está
   apagado y el aviso dice «Necesitas un plan para reservar.», con **Comprar
   un plan** debajo. La fila del plazo dice el día, en hora de La Paz:
   «Cancela sin costo hasta hoy a las 05:30», «hasta mañana a las 05:30» o
   «hasta el sáb 7 a las 05:30». (A quien le quedan 0 clases de su plan le dice, en
   cambio, «No te quedan clases en tu plan.».)
6. **Mis Reservas** tiene dos pestañas, **Próximas** e **Historial**.
   **Próximas** dice «Aún no tienes reservas», con **Reservar una clase**;
   **Historial** dice «Todavía no tomaste clases».
7. **Perfil** muestra el nombre, el correo y **Editar**, en tres grupos:
   **Tu plan y tus clases** (**Mi plan**, **Evaluación nutricional**, **Mis
   evaluaciones**, **Invita a una amiga**), **Preferencias**
   (**Notificaciones** y **Recibir promociones**) y **Cuenta** (**Cambiar
   contraseña** y **Enviar comentarios**). Al final, **Cerrar sesión** y
   **Cerrar mi cuenta**.

Si el correo tarda, el archivo del buzón local tiene el mismo enlace.

## Paso 7. Lucía compra su primer plan

Quédate en la app de clientas, como Lucía.

1. **Inicio**, **Comprar un plan**. Los ocho planes aparecen en el orden que
   les diste, de menor a mayor. Arriba, la franja dice «Oferta por tiempo
   limitado · 15 % en tu plan». Mientras queden lugares de lanzamiento, toda
   primera compra lleva el 15 %, redondeado al boliviano: el de 8 clases
   muestra `Bs 502` y, tachado, `Bs 590`. Con 10 lugares o menos, la franja dice «¡Quedan solo N lugares con
   15 % de descuento!». La clienta nunca ve la palabra «fundadora» ni el total
   de lugares.
2. Abre **8 clases**. La vigencia dice 30 días. Elige la fecha de inicio:
   hoy, o cualquier día de los próximos 14. Más lejos no se puede.
3. En la pantalla de pago, abre **¿Necesitas factura?** y completa **NIT o
   CI** y el nombre o la razón social. La factura se emite fuera del sistema.
   Esto solo la deja anotada. Mientras la factura está abierta y le falta un
   dato, **Enviar comprobante** se apaga y encima dice qué falta: «Completa
   el NIT o CI, o cierra la factura» (o «Completa el nombre o razón social, o
   cierra la factura»). Si la cierras, se envía sin factura.
4. La pantalla de pago muestra el monto y el QR del estudio. No muestra
   número de cuenta ni banco. Transfiere el monto de mentira, o usa cualquier
   imagen como comprobante, y súbela. El estado pasa a **Pago en revisión**.
5. **Volver al inicio**. **Inicio** ya no ofrece **Comprar un plan**: la
   tarjeta grande dice «En revisión · Tu pago está en revisión», con
   «Paquete de 8 clases · Bs 502» y **Ver estado del pago**, que abre
   **Estado del pago**. El atajo **Reservar una clase** sigue con candado y
   dice «Tu pago está en revisión».
6. Mientras está en revisión, **Reservar** no deja tomar un lugar: el detalle
   de la clase dice «Tu pago está en revisión. Podrás reservar cuando el
   estudio lo confirme.», con **Ver estado del pago**. Cualquier camino a
   **Elegir plan** (Mi plan, Evaluación nutricional › **Ver planes**) abre
   **Estado del pago** en vez de empezar otra compra.

En la app del equipo, Ana (o la dueña desde la web) recibe la novedad.

1. Entra a la app del equipo como Ana. **Pagos pendientes** muestra el pago
   de Lucía. Ábrelo. La foto del comprobante se puede ampliar. **Confirmar
   pago** permanece apagado hasta que la foto cargó. Confírmalo.
2. Lo mismo se puede hacer en la web, en **Dinero › Pagos**, o desde la fila
   del pago en **Inicio**: abre la fila, mira el
   comprobante y confirma. Si el comprobante no sirve, rechaza y escribe el
   motivo. Lucía lo ve en la app: **Inicio** dice «Pago rechazado · No
   pudimos confirmar tu pago», con el motivo, el plan y el monto, y **Subir
   otro comprobante**, que abre de nuevo el pago del mismo plan (no deja
   elegir otro plan). El atajo dice «Tu pago no se confirmó», el detalle de
   una clase dice «No pudimos confirmar tu pago.» con **Subir otro
   comprobante**, y **Elegir plan** lleva a ese pago rechazado. La tarjeta
   sigue en **Inicio** hasta que envíe otro comprobante.

Cuando el pago queda confirmado:

- El plan de Lucía empieza en la fecha que eligió. Si es hoy, ya puede
  reservar.
- Como es su primer plan y quedan lugares, Lucía queda fundadora sola, con el
  15 %. Una fundadora no recibe la clase de regalo: en **Mi plan** las clases
  son 8, sin extra.
- Daniela queda como quien trajo a Lucía, por el código. Esa comisión aparece
  en el paso 15.

Vuelve a **Dinero › Pagos** en la web. La fila de Lucía muestra el NIT y el nombre.
Pulsa **Marcar emitida** cuando la factura ya salió del sistema de
facturación. El filtro **Sin factura emitida** esconde las que ya marcaste.
**Anular venta** deshace una venta confirmada por error. No devuelve dinero.
Solo la dueña puede anular. La recepcionista no.

## Paso 8. La primera reserva

En la app de clientas, como Lucía, con el plan ya vigente.

1. **Reservar**. Elige la sede si hay más de una. La tira de días y la tira
   de tipos se desplazan de lado. Elige el día del mat de las 09:00.
2. Abre la clase. Ves el tipo, la hora, la sede, **Daniela Ortiz** con
   **Entrenadora** (con su foto si ya puso una; si no, sus
   iniciales), los cupos y la descripción que escribiste. En la lista de
   **Reservar**, en **Mis Reservas** y en el historial su foto chica va antes
   de su nombre.
   Si Lucía pone su foto en **Editar perfil**, el equipo la ve en lugar de
   sus iniciales: en la lista de la clase, al buscarla, en su ficha, en
   Pagos pendientes y en la web (Clientas, Dinero › Pagos, «Reservaron»).
3. **Reservar**. La clase pasa a **Mis Reservas**, con la fecha, la hora y la
   sede, y el aviso «Reserva confirmada · Te quedan N clases en tu plan».
   **Mi plan** baja una clase. Toca la pestaña **Reservar**: vuelve a la
   tira de días, no al detalle de la clase. Cada pestaña abre siempre su
   primera pantalla.
4. Reserva también el reformer del miércoles, para tener dos reservas y
   poder probar la lista de espera con una segunda clienta más adelante.
5. En la misma clase, **Cancelar** abre la hoja de confirmación. Léela y
   pulsa **Volver**. La reserva sigue. Si cancelas de verdad fuera de las
   2 h 30, la clase vuelve al plan y aparece el aviso «Reserva cancelada ·
   La clase volvió a tu plan · Te quedan N clases». Dentro de las 2 h 30 el botón de cancelar
   no está, y en su lugar está **Reprogramar**, que solo ofrece otro horario
   del mismo día.
6. Si la clase está llena, el botón es **Unirme a la lista de espera**.
   Dentro de las 2 h 30 esa lista ya cerró y el botón no aparece.

En la app del equipo, Camila puede hacer lo mismo por una clienta: **Clientes**,
el nombre de Lucía, toca su fila y **Reservar clase**. Si
Lucía ya tiene esa clase, la fila dice **Ya reservada** y el detalle no
ofrece **Reservar**. Si Camila cancela una reserva de Lucía, aparece «Reserva
cancelada · La clase volvió a su plan». Como en la app de clientas, cada
pestaña de la app del equipo vuelve a su primera pantalla.

Daniela, en **Agenda**, abre la clase de mañana. Ahora hay una reserva.
Antes de que empiece, la lista se lee y dice «Podrás marcar asistencia
cuando empiece la clase.». Desde que la clase empieza, marca asistió o no
asistió y pulsa **Guardar asistencia**.

## Paso 9. Lo que hace la recepcionista

Cierra la sesión de Ana en la app del equipo y entra como Camila.

1. **Buscar cliente**. Escribe `Lucía`. El resultado se anuncia como **Ver
   cliente Lucía Fernández** si ese es el nombre completo que registró.
   Ábrelo. Ves el plan, la próxima reserva y el historial.
2. **+ Nuevo cliente**. Crea a una clienta que llega al estudio sin la app:
   nombre, correo, **Celular** (obligatorio, con su país), **¿Cómo nos
   conociste?** y, si trae un código,
   el código. **Guardar** le manda un enlace para que cree su contraseña.
   Mientras no lo abre, su ficha dice **Cuenta pendiente de activación**, con
   **Reenviar enlace** y **Cancelar invitación**.
3. Si esa clienta ya se había registrado sola y no confirmó el correo, la
   ficha no le manda un enlace de activación. Le ofrece **Enviar enlace de
   verificación**, que es el mismo correo de 24 horas.
4. Con una clienta sin plan vigente, **Registrar pago en efectivo** abre la
   lista de planes. Elige **4 clases**, la fecha de inicio, el NIT o CI y el
   nombre. **Confirmar pago en efectivo**. El plan queda activo en el acto,
   sin pasar por la dueña. El efectivo entra en la caja de la sede.
5. Si la clienta paga por QR en el mostrador, Camila sube la foto del
   comprobante. Ese pago sí queda en **Pagos pendientes** hasta que Ana lo
   confirma. En la app de desarrollo, fotografiar el comprobante necesita un
   build que incluya el módulo de la cámara. Elegir una imagen de la galería
   recorre el mismo camino.
6. Mientras el plan sigue vigente y todavía tiene clases o una reserva
   futura, **Registrar pago en efectivo** está apagado y la nota dice que
   podrá comprar otro cuando este termine. Una renovación anticipada, el
   plan siguiente que empieza el día después de que vence el actual, se
   compra desde la app de la clienta, no como un segundo efectivo del mismo
   periodo.
7. En la ficha, **Reservas de la clienta** cancela una reserva o la
   reprograma el mismo día, con la misma hoja de confirmación. **Historial
   de clases** lista lo ya pasado, en filas, sin tarjetas.

**Cerrar caja**, al final del turno:

1. Pulsa **Cerrar caja** en la búsqueda. El sistema muestra el efectivo que
   debería haber, según los pagos en efectivo confirmados hoy en esta sede.
2. Cuenta el cajón y escribe el monto contado. Si no coincide, escribe la
   nota. **Cerrar caja**.
3. La pantalla queda en **Caja cerrada**. Cerrar otra vez el mismo día, en la
   misma sede, no crea un segundo cierre.
4. Ana ve el historial en la web, en **Dinero › Caja**, y puede cambiar de sede con
   el selector. Un pago anulado o registrado después del cierre aparece como
   un ajuste al lado del cierre. El cierre en sí no se edita.

## Paso 10. La dueña mueve la operación desde el teléfono

Entra a la app del equipo como Ana.

1. **Cancelar una clase**. Elige la sede, el día y la clase de prenatal que
   creaste para una sola vez. Si no tiene reservas, la confirmación es corta.
   Si Lucía está anotada, el texto dice cuántas reservas se cancelan, que la
   clase se devuelve aunque ya no pudieran cancelar solas, y que se avisa a
   la clienta y a la entrenadora. Confirma solo si quieres perder esa clase.
2. **Pagos pendientes** ya lo usaste. Una fila vacía dice que no hay nada en
   revisión.
3. **Ver la app como…** está en el perfil de Ana. El paso 16 lo recorre
   cuando las otras roles ya tienen algo que ver.

En la web, abre la ficha de Lucía desde **Clientas › Todas**. Tiene cuatro
pestañas: **Resumen**, **Reservas**, **Pagos** y **Evaluaciones**. Además de
sus datos:

- **Editar perfil** cambia nombre y teléfono. El correo de acceso lo cambia
  ella, desde su app.
- **Devolver una clase** suma una clase con un motivo. Es una cortesía. Solo
  la dueña la ve y la guarda. La recepcionista no tiene ese botón.
- **Acceso de prueba** otorga el plan oculto de 16 clases a Bs 0, hasta la
  fecha que elijas. Es para las testers de la tienda y las cuentas de
  revisión. No cuenta como ingreso, ni como fundadora, ni como comisión.
  No se lo des a Lucía si quieres seguir el recorrido de una clienta real.

## Paso 11. Fundadoras, congelamiento e invitación

Estos tres viven de un plan ya pagado. Hazlos en este orden.

### Fundadora

En la web, **Clientas › Todas** con el filtro **Fundadora**. Lucía aparece
como **Fundadora n.º 1**: su
primer pago confirmado la hizo fundadora sola en el paso 7. Nadie la marca a
mano.

1. El descuento es 15 % en cualquier plan menos la clase suelta, y queda en
   la persona, no en el plan. La siguiente compra de Lucía, que no sea la
   clase suelta, lo muestra en el pago. En **Dinero › Pagos** la fila guarda el monto
   descontado.
2. El lugar 41 se niega: la clienta número 41 paga el precio de lista y sí
   recibe la clase de regalo. Si Lucía deja pasar más de 7 días entre el fin
   de un plan y el inicio del siguiente, el beneficio se pierde solo y no
   vuelve. Congelar no lo quita.

Una fundadora nunca recibe la clase de regalo ni las clases de campaña.

### Congelamiento

Solo un plan de 90 días se puede congelar, una vez, hasta 15 días. Lucía
tiene un plan de 30 días, así que este paso necesita un trimestral.

1. En la app de Lucía, compra **Trimestral 24 clases** como renovación
   anticipada. Elige la fecha de inicio que el sistema ofrece: el día
   siguiente al fin del plan actual. Sube el comprobante y Ana lo confirma.
2. En **Mi plan**, pide el congelamiento: fecha de inicio, fecha de fin
   dentro de los 15 días, y un motivo. No puede empezar ayer.
3. Ana lo ve en la app del equipo, en **Congelamientos**, y en la web en
   **Clientas › Congelamientos** y en **Inicio**. Lo aprueba (la
   coordinadora también puede). El fin del plan se corre exactamente
   esos días.
4. Durante esos días, Lucía no puede reservar. Al aprobar, ella recibe el
   aviso.

### Invita a una amiga

1. Lucía abre **Perfil**, **Invita a una amiga**. Ahí está su código. Lo
   comparte.
2. Valeria se registra en la app de clientas con ese código y confirma el
   correo. Queda en la base. Lucía solo puede invitar a una amiga por mes.
   Valeria solo puede recibir la clase de invitada una vez en su vida.
3. Valeria, sin plan, reserva una clase con cupo libre que no sea el último
   cupo. Esa es su clase de invitada. Si la clase está en el último cupo, no
   puede tomarlo como invitada.
4. Cuando Valeria compra su primer plan y Ana lo confirma, Lucía gana 1 clase
   extra en su plan vigente. Si Lucía no tuviera plan ese día, la clase
   esperaría al siguiente.

No hay crédito en dinero. La pantalla vieja de «Mi crédito» no existe.

## Paso 12. La nutricionista

Entra a la app del equipo como Gabriela.

1. En su agenda, pulsa **Mi disponibilidad** y **+ Nuevo horario**.
2. Elige la sede **Centro**, el día y la hora de inicio y de fin. Cada turno
   que la clienta ve dura 45 minutos, recortados de ese bloque. **Guardar**.
3. El bloque aparece como `Lunes, 9:00 – 13:00`, o la hora que hayas puesto.
   Ábrelo. **Quitar horario** pide confirmación y dice desde qué fecha deja
   de existir. **Volver** lo deja como está. **Aplicar cambio** solo aparece
   si ese bloque ya tiene una evaluación reservada y quieres moverlo sin
   perderla.

En la app de Lucía:

1. **Perfil**, **Evaluación nutricional**. Solo aparecen días con un turno
   todavía abierto. Un turno desaparece 3 horas antes de empezar.
2. Con el plan de 30 días, la consulta se paga: Bs 70, por QR en la app o en
   efectivo en el estudio. Con el trimestral ya confirmado, la primera
   consulta del trimestre es gratis. La segunda, en el mismo trimestre, se
   paga.
3. Reserva un turno. **Mis evaluaciones** lo muestra. Cancelarlo abre la hoja
   de confirmación. Si faltan menos de 3 horas, cancelar o no asistir consume
   la consulta igual.
4. Gabriela ve la reserva en su agenda, con el nombre de Lucía. Puede
   cancelarla desde ahí. La nota dice que se le avisará a Lucía.

En la web, **Horario › Nutrición** lista las mismas reservas. Es una
lectura. El costo de Bs 50 por consulta entra al resultado del mes como costo
de la nutricionista, no como un gasto que tengas que tipear.

## Paso 13. El día a día de la clienta

Con Lucía todavía en la app, recorre lo que no es comprar ni reservar.

1. **Perfil**, **Editar**. Cambia el **Celular** y guarda: pulsa **🇧🇴 +591**,
   elige **Perú** y escribe `912345678`. **Perfil** lo muestra como
   `🇵🇪 +51 912345678`. Vaciarlo no se puede: el celular es obligatorio. Para cambiar el
   correo, escribe uno nuevo y guarda. La pantalla queda en **Revisa tu
   correo nuevo**. El enlace llega al correo nuevo y dura 24 horas. El correo
   viejo recibe un aviso, sin enlace. Hasta que abre el enlace, sigue
   entrando con el correo viejo. **Cancelar cambio** retira la solicitud.
2. En **Editar**, la foto de perfil se elige de la galería. Mientras sube,
   dice **Subiendo foto**. Si la quitas, vuelven las iniciales.
3. **Cambiar contraseña** pide la actual y la nueva. Al guardar, la sesión
   sigue abierta.
4. **Notificaciones** separa **Sin leer** y **Anteriores**. Al tocar una, se
   marca leída. Si el conteo es mayor que cero, la pestaña **Perfil** muestra
   el número. Con cero, no hay pastilla.
5. **Enviar comentarios** manda un texto a la dueña. Puedes mandar hasta 10
   en 24 horas. El undécimo se niega.
6. Vuelve a **Inicio** y arrastra hacia abajo. La lista se refresca y el
   indicador es color palo de rosa. Sal de **Mis Reservas**, reserva algo
   desde la web o desde Camila, y vuelve a entrar: la reserva nueva aparece
   sin cerrar la app.
7. **Cerrar mi cuenta** explica que se borran el nombre, el correo, el
   teléfono y la foto, y que el historial queda anónimo. Confírmalo solo
   cuando ya no necesites a Lucía. Después de cerrarla no puede entrar, y su
   correo queda libre para un registro nuevo. El historial de clases no se
   borra.

**Cerrar sesión** abre la hoja **¿Cerrar sesión?**. **Cancelar** se queda.
**Cerrar sesión** vuelve al acceso.

## Paso 14. Promociones, campañas y comentarios

En la web, como Ana.

### Promociones

1. **Promociones › Carrusel**. Pulsa la acción de crear. Una promoción nueva nace
   como **Borrador**.
2. Escribe el título y el texto, y sube la imagen. Guárdala. Sigue en
   borrador: la app no la muestra.
3. Publícala, o prográmala con una fecha de inicio. Cuando está **Activa**,
   Lucía la ve en el carrusel de **Inicio**. El orden de las tarjetas en la
   web es el orden del carrusel.
4. Finalízala. Desaparece de la app y queda **Finalizada** en la lista.
5. **Promociones › Contactos**: las clientas que aceptaron
   recibir promociones. Lucía tiene ese interruptor en su **Perfil**.
   Apágalo y vuelve a la web: su fila deja de estar disponible para un envío.

### Referidos

**Promociones › Referidos**. Cuando Valeria se registró con el código de
Lucía, la fila aparece aquí: quién invitó a quién, y si la invitada ya
compró. Es una lectura. En **Clientas › Todas**, la columna **Invitada por**
de Valeria dice Lucía. El premio, la clase extra, ya se sumó sola en el paso 11.

### Campaña

**Promociones › Clases de campaña**. Escribe un motivo, por ejemplo `Inicio de año`, y **Clases extra**
`1`. Elige a las clientas con plan vigente. Guardar suma la clase a cada una,
con ese motivo, sin cambiar ningún precio. Una fundadora no acumula la
campaña con su descuento: el descuento ya está en el precio, y la clase extra
es otra cosa. El sistema no deja usar la campaña como un descuento.

### Comentarios

**Comentarios**, en el riel. El texto que Lucía envió desde la app está
aquí, con la app, el tipo y la versión. Ábrelo, escribe **Qué cambiamos** y
márcalo revisado. Puedes filtrar por estado y por app, y exportar el CSV. Un
comentario nuevo también aparece en **Inicio**. La coordinadora también
abre esta lista.

## Paso 15. Dinero, equipo y el mes

**Dinero** es solo de la dueña. **Estudio › Insumos** y **Estudio ›
Equipos** también los usa la coordinadora, sin montos.

### Equipos

1. **Estudio › Equipos**, con la sede **Centro**. **Nuevo equipo**. Crea 8
   reformers y 8 cadillacs, numerados, y los mats que uses. El número se
   repite dentro de la sede y el sistema lo rechaza.
2. Daniela, en la app, abre una clase de reformer y **Reportar una falla**.
   Elige el equipo y describe la falla. En la web, la falla aparece en el
   equipo. Márcala resuelta cuando corresponda.
3. Si una clase de reformer tiene más cupos que equipos en servicio, el
   horario la marca. Baja la capacidad de esa clase o saca el equipo de
   servicio para ver la marca aparecer y desaparecer.

### Insumos

**Estudio › Insumos**. Crea un insumo con su stock mínimo. Registra una
entrada y una salida; **Retiros del mes** lista las salidas. Cuando el stock
baja del mínimo, el riel muestra un número en **Estudio** e **Inicio** lo
lista en **Por resolver**.

### Gastos

1. **Dinero › Gastos**, **Editar categorías**. Crea `Alquiler`, `Luz` y
   `Limpieza`. Son del estudio, no de una sede.
2. **Nuevo gasto**: categoría, monto, fecha y sede.
   Un gasto de `300,50` se guarda como `Bs 300,50`.

### Sueldos

1. **Dinero › Sueldos**, vista **Por aprobar**. Elige el período: **Día**,
   **Semana**, **Rango** o **Mes**, y la fecha. **Calcular**. Un período no
   se cruza con otro ya liquidado de la misma persona: una clase nunca se
   paga dos veces.
   Daniela aparece si ya dictó una clase cuyo cierre de ventana ya pasó, o
   si ya se confirmó el primer plan de Lucía.
2. Lee las líneas. Una clase con hasta 4 reservas al cierre de la ventana
   paga Bs 65. Desde la quinta reserva, suma Bs 8 por cada una. Quien no
   asistió cuenta igual, porque se cuenta la reserva, no la asistencia. Una
   clase cancelada por no llegar al mínimo de 2 paga Bs 25 a la instructora.
   El primer plan de Lucía paga el 10 % de lo que ella realmente pagó, una
   sola vez, en el mes en que se confirmó el pago.
3. **Aprobar**. La tarjeta pasa a **Aprobado** y la vista **Pagados** gana
   una fila por ese monto. Calcular el período otra vez no duplica el pago.
4. La coordinadora cobra por mes: su tarjeta aparece en **Por aprobar** solo
   con el período **Mes**. Sin coordinadora, el mes no tiene a quién
   liquidar. Cuando la invites, el cálculo es Bs 3.500 de base, más
   Bs 50 por cada clienta nueva en un plan de 30 días y Bs 80 en uno de 60 o
   90, más Bs 400 si la renovación del mes llega a la meta. La clase suelta,
   el regalo y la invitada no generan esa comisión. Si la clienta llegó por
   una instructora, cobra la instructora y no la coordinadora.
5. La vista **Pagados** lista los sueldos registrados, también los de
   recepción y limpieza. **Registrar pago** anota
   un pago ya hecho, con persona, monto y fecha. **Comprobante** es
   opcional: sube la foto de la transferencia (JPG, PNG o WebP, hasta 10 MB).
   Para agregarla a un pago ya anotado, ábrelo, sube la foto y **Guardar**.
   La columna **Comprobante** muestra **Ver** cuando el pago tiene foto.
6. En la app del equipo, Daniela abre la pestaña **Mis pagos**.
   Ve una tarjeta por liquidación, la más nueva arriba, con **Borrador** o
   **Aprobado**, el total y la suma por concepto: clases dictadas,
   canceladas por mínimo y comisiones. **Ver cada clase** abre una línea por
   clase con sus alumnas y extras. Un borrador avisa que puede cambiar hasta
   que administración lo apruebe. Abajo, **Pagos recibidos** lista lo
   que **Dinero › Sueldos › Pagados** registró para ella, con fecha y monto. Un pago con foto
   muestra **Ver** y la abre a pantalla completa. Solo ve lo suyo. La
   coordinadora, la recepcionista y la nutricionista no tienen esa fila.

### El mes

1. **Informes › Dinero**. Elige el período y la sede, o todas. Ves el ingreso en
   efectivo de la sede, y el ingreso por transferencia en la vista de todas
   las sedes. Los gastos de la sede están al lado. Un pago a personal es del
   estudio: aparece en todas las sedes, no dentro de una sola. Más abajo
   están las finanzas del mes: resultado, impuesto, punto de equilibrio y el
   presupuesto frente a lo gastado.
2. **Informes › El mes**. Pide recalcular si el mes todavía no tiene cifras.
   Son cantidades y montos del estudio: ocupación, clientas nuevas,
   renovación, ingreso cobrado e ingreso devengado por los días de vigencia.
   La coordinadora, cuando entre, ve las cantidades y no los montos.
3. Más abajo en **El mes** están las **Recomendaciones**, que también se
   ven en **Inicio**. Son reglas sobre el mes ya calculado: una clase
   que no llena, un horario flojo, un gasto por encima del presupuesto. Con
   pocos días de datos la lista puede estar vacía. Eso es un mes joven, no
   un fallo.
4. **Informes › Simulador**. No lee la sede ni las ventas. Cambias precios, metas
   y costos y ves un mes hipotético. Nada de lo que guardes aquí modifica un
   plan ni un pago.

La fecha de apertura, en **Ajustes › Reglas del estudio**, decide en qué tramo de meta
está el mes: 80 % los primeros seis meses, 85 % los siguientes seis, 90 %
después.

## Paso 16. Ver el estudio con otros ojos

### Como otra persona del equipo

En la app del equipo, como Ana, abre **Perfil** y **Ver la app como…**.
Elige a Camila. La hoja pide confirmación. Al confirmar, una franja arriba
dice que estás viendo la app como Camila.

Recorre **Buscar cliente** y la ficha de Lucía. No confirmes un pago ni
mandes un comentario desde ahí: un comentario se niega mientras suplantes, y
un pago en efectivo quedaría a nombre de la acción que confirmes. Sal de la
suplantación por la franja. Repite con Daniela, para ver **Mi agenda** con
sus clases, y con Gabriela, para ver **Mi disponibilidad**.

### Como coordinadora

En la web, **Estudio › Personal**, **Nuevo miembro**. Rol **Coordinador**.
No elige sede. Invítala y deja que active su cuenta.

Entra a la web con ella. Es el contacto con clientas y equipo, sin dinero:

- El riel no tiene **Dinero**. **Inicio** muestra un resumen de clientas en
  lugar del dinero, y sus pendientes no incluyen pagos ni sueldos.
- Ve **Horario** (clases y nutrición, y puede reservar a una clienta),
  **Clientas** (todas, para contactar y congelamientos, que puede aprobar o
  rechazar), **Promociones** (puede crear y publicar en el carrusel; no ve
  **Clases de campaña**), **Comentarios**, **Estudio** (personal solo para
  asignar sedes, insumos y equipos), **Informes › El mes** sin montos y
  **Ajustes › Reglas del estudio** solo para leer.
- En la ficha de Lucía no tiene la pestaña **Pagos**, ni **Clase de
  cortesía**, ni **Devolver una clase**: esas se las pide a la dueña.
- Una dirección de **Dinero**, escrita a mano, la devuelve con el aviso de
  que no tiene permiso.

En la app del equipo entra a **Buscar cliente**. Tiene **+ Nuevo cliente**,
el mismo formulario de la recepcionista: crea una clienta con un correo
nuevo, y su ficha muestra la tarjeta **Cuenta pendiente de activación** con
**Reenviar enlace**, sin **Registrar pago en efectivo** (el cobro sigue en
recepción). Tiene **Cancelar una clase** y **Para contactar**. **Para
contactar** lista a quien el seguimiento de los primeros 90 días marcó: día
2, semana 1, día 30, día 90, una alerta de 7 días sin venir, o menos de 4
clases usadas. Con una sola clienta recién llegada, la
lista puede tener una fila o ninguna, según el día.

### Los primeros 90 días

**Clientas › Para contactar** en la web, como Ana. Es la misma lista, con el motivo
al lado de cada nombre. Contactar a alguien no se anota solo: cuando la
llames, registra el contacto si la fila ofrece marcarlo. Si no ofrece la
marca, la lista es una lectura y el registro queda en tu propia nota.

## Paso 17. Lo que el sistema hace solo

No hay un botón para estos. Pasan porque el worker está encendido. Para
verlos, deja la semana creada y espera, o acepta leerlos al día siguiente.

- Cada hora, el horario semanal gana las clases que entran en la ventana de
  30 días. Si el lunes que viene todavía no está, espera a la hora siguiente
  o reinicia el worker.
- Tres horas antes de una clase, si tiene menos de 2 reservas, se cancela
  sola. Cada clienta recibe la clase de vuelta y un aviso para elegir otro
  horario del mismo día. La instructora suma Bs 25 en la liquidación de ese
  mes. Si tiene 2 o más, la clase se dicta y el sistema guarda cuántas
  reservas había al cierre. Ese número es el que cobra la instructora.
- La lista de espera corre cuando se libera un cupo, hasta que cierra la
  ventana de 2 h 30. La primera de la fila que todavía puede reservar recibe
  el lugar y el aviso.
- Un pago en revisión que nadie confirma ni rechaza vence solo. Lucía ve el
  rechazo y puede subir otro comprobante.
- Una cuenta que nunca activó el correo se retira a los 30 días. Un registro
  de clienta sin confirmar se retira a los 7 días.
- Los recordatorios de una clase salen 24 horas antes y 2 horas antes. El
  recordatorio del plan sale cuando la fecha de fin está cerca. Hace falta
  que el teléfono tenga permiso de avisos. En Expo Go los avisos push no
  llegan. Llegan en un build de desarrollo o en la app de la tienda.
- Una vez por noche se recalculan los indicadores del mes. **Informes › El
  mes** también tiene la acción de recalcular ahora, si no quieres esperar.

## Paso 18. Segunda sede, archivo y recuperación

Cuando el recorrido de una sede ya se entiende:

1. Crea **Norte** en **Ajustes › Sucursales**. Asígnale a Daniela también,
   o invita a otra entrenadora y asígnale solo Norte.
2. Cambia el selector a Norte. **Horario**, **Dinero › Caja**, **Estudio ›
   Equipos** y **Dinero › Gastos** están vacíos. **Clientas** sigue
   mostrando a Lucía: las clientas son del estudio.
3. Publica una clase en Norte y reserva desde la app eligiendo esa sede.
4. Archiva un tipo de clase que ninguna semana vigente use. Desaparece del
   alta de sesiones y sigue en las clases ya creadas.
5. En **Estudio › Personal**, abre a una persona de prueba y **Desactivar cuenta**. No
   puede entrar a la app. Sus clases pasadas siguen en el historial.
6. En el acceso de la app, **¿Olvidaste tu contraseña?** con el correo de
   Lucía manda el enlace de 30 minutos. Abrirlo deja crear otra contraseña.
   Pedirlo para un correo que no existe responde lo mismo, para no contar
   quién está registrado.

## Mapa de pantallas

Úsalo para saber si te saltaste algo. Si una fila no tiene cómo llegar, el
paso de arriba todavía no creó lo que esa pantalla necesita.

### Web de administración

| Destino › pestaña | Qué haces ahí | Paso |
| --- | --- | --- |
| Inicio | Por resolver, el día, el dinero y las recomendaciones | 1, 7, 11, 15 |
| Horario › Clases | Publicar, mover y cancelar clases; quién reservó; reservar a una clienta | 5, 10 |
| Horario › Nutrición | Lectura de las consultas | 12 |
| Clientas › Todas | Ficha con pestañas, filtro Fundadora, «Invitada por», cortesía, acceso de prueba | 10, 11 |
| Clientas › Para contactar | Seguimiento de los primeros 90 días | 16 |
| Clientas › Congelamientos | Aprobar el congelamiento de un trimestral | 11 |
| Promociones › Carrusel | Borrador, publicar, finalizar | 14 |
| Promociones › Clases de campaña | Clases extra para las clientas con plan | 14 |
| Promociones › Referidos | Quién invitó a quién | 14 |
| Promociones › Contactos | Quién acepta recibir promociones | 14 |
| Comentarios | Lo que llega de las apps | 14 |
| Dinero › Pagos | Confirmar, rechazar, anular, marcar factura | 7 |
| Dinero › Caja | Historial del cierre diario por sede | 9 |
| Dinero › Sueldos | Calcular y aprobar por período; sueldos pagados y su comprobante | 15 |
| Dinero › Gastos | Gastos de la sede y sus categorías | 15 |
| Estudio › Personal | Invitar, cambiar rol y sede, desactivar | 3, 16 |
| Estudio › Insumos | Stock, entradas, salidas, mínimo, retiros del mes | 15 |
| Estudio › Equipos | Reformers, cadillacs, mats y fallas | 15 |
| Informes › El mes | Cantidades y montos del mes, informe y recomendaciones | 15 |
| Informes › Dinero | Ingreso, gasto y finanzas del período | 15 |
| Informes › Simulador | Un mes hipotético, sin tocar ventas | 15 |
| Ajustes › Tipos de clase | Nombre, descripción, capacidad, equipo | 2 |
| Ajustes › Planes | Los ocho planes, vigencia, tope, precio | 2 |
| Ajustes › Sucursales | Sedes y su archivo | 2, 18 |
| Ajustes › Reglas del estudio | Las reglas que puedes cambiar y las fijas | 1 |
| Ajustes › QR del estudio | El QR de transferencia que ven las clientas | 2 |
### App de clientas

| Dónde | Qué haces ahí | Paso |
| --- | --- | --- |
| Acceso y Regístrate | Crear la cuenta y confirmar el correo | 6 |
| Inicio | Saludo, plan, atajos, carrusel, comprar | 6, 7, 14 |
| Reservar | Semana, filtros, detalle, reserva, lista de espera | 8 |
| Mis Reservas | Próximas, cancelar, reprogramar, historial | 8 |
| Perfil | Datos, foto, plan, evaluaciones, invitación, avisos | 6, 13 |
| Mi plan | Clases, vigencia, regalo, extras, congelar | 7, 11 |
| Evaluación nutricional | Turnos y pago de la consulta | 12 |
| Invita a una amiga | Código, una amiga al mes | 11 |
| Pago | QR, comprobante, en revisión, confirmado, rechazado | 7 |
| Enviar comentarios | Texto a la dueña | 13 |
| Cerrar mi cuenta | Borrado de los datos personales | 13 |

### App del equipo

| Rol | Primera pantalla | Qué más hace | Paso |
| --- | --- | --- | --- |
| Administración | Pagos | Clientes, Horario, cancelar una clase, congelamientos, caja, ver como otra persona | 4, 7, 10, 16 |
| Asistente | Clientes | Alta, efectivo, comprobante de mostrador, reservas, Horario, Caja | 9 |
| Entrenadora | Agenda | Pasar lista, reportar una falla, Mis pagos | 5, 8, 15 |
| Nutricionista | Agenda | Disponibilidad, cancelar una consulta | 12 |
| Coordinador | Clientes | Alta, Para contactar, Horario, cancelar una clase, sin dinero | 16 |
| Todas | Perfil | Foto de perfil, avisos, contraseña, comentarios, cerrar sesión | 4 |

## Cuando algo no aparece

- La grilla no tiene entrenadoras en el alta: esa persona no está asignada a
  la sede seleccionada, o su cuenta sigue **Pendiente**.
- La app no muestra clases: el horario semanal todavía no corrió, o la app
  apunta a otra API. Arrastra hacia abajo en **Reservar**.
- El correo no llega: mira `apps/backend/.data/email-capture/`. Si tampoco
  hay archivo, el worker no está encendido o no usa la misma base.
- Un botón de guardar se queda pensando: la API del puerto 3100 no está
  respondiendo. Vuelve a la Terminal de `pnpm dev:backend`.
- La recepcionista no puede cobrar en efectivo: el plan vigente todavía
  tiene clases o una reserva futura.
- La consulta sale pagada cuando esperabas gratis: el plan no es de 90 días,
  o la consulta gratis del trimestre ya se usó.
- El congelamiento no se ofrece: el plan vigente no es de 90 días, ya se usó
  el único congelamiento, o la fecha empieza en el pasado.
