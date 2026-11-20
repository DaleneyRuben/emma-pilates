# Follow-up — Rosa Emma type scale: 13 text styles for web and apps

Una sola escala para la web y las dos apps, con los mismos nombres. Sale de las dos auditorías
(`AUDITORIA-WEB.md`, `AUDITORIA-APPS.md`) y reemplaza los tamaños de la nota 284.

Con una sola tinta (#93615D, y blanco sobre 600), la jerarquía depende solo del tamaño, el peso y la
fuente. Por eso cada texto usa uno de estos estilos y nada más.

## Los estilos

| Estilo | Fuente | Web | Apps | Peso | Interlineado | Extra | Para qué |
|---|---|---|---|---|---|---|---|
| `titulo-pagina` | Lora | 34 (30 a 420 px) | 30 | 500 | 1.1 | | El título grande de la banda; uno por pantalla |
| `titulo-seccion` | Lora | 28 | 24 | 500 | 1.15 | | Secciones de la página, títulos de panel, diálogo y hoja |
| `titulo-bloque` | Lora | 22 | 22 | 500 | 1.2 | | El título dentro de una tarjeta o del bloque destacado |
| `cifra-grande` | Lora | 34 (28 a 420 px) | 34 | 500 | 1.1 | cifras tabulares | La cifra de un KPI o del bloque 600 |
| `cifra` | Lora | 24 | 24 | 500 | 1.2 | cifras tabulares | Cifras y horas dentro de tarjetas y filas |
| `destacado` | Work Sans | 19 | 19 | 700 | 1.3 | | La bajada bajo el título, la palabra del bloque 500, las horas de la rejilla. Es el único Work Sans permitido sobre 100, 200 y 500 |
| `titulo-fila` | Work Sans | 16 | 16 | 600 | 1.35 | | La primera línea de una fila o tarjeta |
| `boton` | Work Sans | 16 (14 el chico) | 16 | 700 | 1 | | Todos los botones |
| `cuerpo` | Work Sans | 15 | 15 | 400 | 1.5 | | Frases y párrafos, el texto de los campos, los mensajes vacíos y de error |
| `compacto` | Work Sans | 14 | 14 | 400 | 1.45 | | Celdas de tabla, chips, filas de menú y la etiqueta de un campo (en 600) |
| `secundario` | Work Sans | 13 | 13 | 400 | 1.45 | | La segunda línea de una fila, ayudas y errores de campo, paginación |
| `etiqueta` | Work Sans | 12 | 12 | 700 | 1.2 | MAYÚSCULAS, espaciado 0.12em | Rótulos de tarjeta, KPI, encabezados de tabla y grupos |
| `pastilla` | Work Sans | 12 | 12 | 700 | 1.2 | | Estados, insignias de conteo y la etiqueta de la pestaña |

Enlaces (20/11, unificado):
- **Enlace suelto** (una acción sola, como «Ver horario», «Volver» o «¿Olvidaste tu contraseña?»): estilo `enlace`, Work Sans 14 · 700, siempre subrayado.
- **Enlace dentro de una frase o de una fila:** el tamaño del texto que lo rodea, en 700 y subrayado (15 · 700 en `cuerpo`, 13 · 700 en `secundario`).

La **etiqueta de un campo** usa `compacto` en 600 (14 · 600). Es la única variante de peso permitida fuera de la tabla.

## Reglas

1. **Lora solo para títulos y cifras.** Nunca para frases, pistas, mensajes vacíos ni errores: esos van en `cuerpo`.
2. **Ningún texto por debajo de 12 px.**
3. **Texto chico solo sobre blanco, 50 o 600.** Sobre el fondo 100, la banda 200 o un bloque 500 solo van `titulo-*`, `cifra*` y `destacado`. Cualquier otro texto va dentro de una tarjeta blanca.
4. **Un peso por estilo, y el peso no cambia con el estado.** Un chip, una pestaña o un segmento elegido cambia de fondo, no de peso.
5. **Sin transparencia en el texto.** Un elemento deshabilitado se ve como contorno y lo explica con texto, nunca atenuado.
6. **Pasar el cursor no cambia el color del texto.** Un enlace engrosa su subrayado. Un botón cambia de sombra: el fondo 600 se queda en 600.
7. **El texto de ejemplo de un campo** usa el mismo color en cursiva, para que no se confunda con lo escrito.
8. **Las mayúsculas salen solo del estilo `etiqueta`**, nunca escritas a mano con `.toUpperCase()` ni con una clase suelta.
9. **El interlineado viene con el estilo.** En las apps, el texto puede crecer con el tamaño de letra del teléfono hasta 1,3 veces.

## Cómo se hace cumplir

- **Web:**
  - las 13 clases `tipo-*` en `index.css`, con la escala cerrada (`--text-*: initial`);
  - un ESLint que prohíba tamaños, familias, pesos, interlineados, mayúsculas y colores sueltos;
  - una prueba de contraste con axe en Playwright, a 1440 y a 420 px.
- **Apps:**
  - un componente `Text` en `mobile-core` con `variant` (los 13 estilos) y `tone` (`ink` / `onDark`), que no acepta tamaño ni color en `style`;
  - un ESLint que prohíba `Text` de react-native, `fontSize`, `fontFamily`, `fontWeight` y `color` en las apps.
- **Piezas únicas:** mensaje vacío, error en línea, enlace, cifra (KPI) y título de hoja.

## Decisiones tomadas (20/11)

- Las etiquetas en mayúsculas pasan a 12 px. La prueba de FIX-090 ya prohibía bajar de 12.
- Los mensajes de error y de vacío dejan Lora y pasan a `cuerpo`.
- El texto de ejemplo de los campos va en cursiva.

## Checking it

`design/v3/sistema/revisor/revisar.cjs` opens each board in a real browser and measures every
visible text: family, size, weight, colour, opacity, uppercase and the background under it. It fails
on anything outside the scale. `cortes.cjs` flags text that falls outside a clipping box.

Run them like this:

    node design/v3/sistema/revisor/revisar.cjs app 390 design/v3/cliente/*.dc.html
    node design/v3/sistema/revisor/revisar.cjs web 1440 design/v3/admin/<1440 boards>

Approved by the owner on 2026-11-20. At export, all 556 boards measured 0 problems across 23,710
texts. The coding PRs must enforce the same rules with lint rules and an automated contrast test.
Read [284](./284-rosa-emma-redesign.md) first.
