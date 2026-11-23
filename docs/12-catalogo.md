# 12. El catálogo: de BoardGameGeek a la aplicación

## 12.1 Lo que se comprobó antes de decidir

El 23 de noviembre de 2026 se probó el acceso desde un servidor:

| Intento | Resultado |
|---|---|
| `GET boardgamegeek.com/collection/user/…` con un navegador simulado | **403** de Cloudflare («Attention Required!») |
| `GET boardgamegeek.com/profile/…` | **403** de Cloudflare |
| `GET boardgamegeek.com/xmlapi2/collection?username=…` | **401**: exige token de aplicación registrada |

Conclusión: **el scraping no es viable desde un servidor**. No es cuestión de cortesía ni de frecuencia: Cloudflare bloquea la petición antes de que llegue a la página. Diseñar el sistema alrededor de un scraper sería diseñarlo alrededor de algo que ya no funciona.

## 12.2 Tres caminos y el elegido

| Camino | Ventaja | Inconveniente | Decisión |
|---|---|---|---|
| **CSV exportado de BGG** | Fiable, sin credenciales, sin límites, dos minutos de trabajo | Manual y hay que repetirlo cuando cambie la colección | **Principal** |
| API XML con token | Automática y con datos completos | Registro de aplicación, aprobación de días o semanas, límites de uso | Opcional, ADR-004 |
| Scraping de la página | Sin trámite | Bloqueado por Cloudflare | **Descartado** |

## 12.3 Importación por CSV

**Cómo se obtiene el fichero:** en BGG, perfil → colección → «Export collection» → CSV. Se descarga y se sube a la aplicación desde «Catálogo → Importar».

**Qué columnas se usan:**

| Columna del CSV | Campo | Obligatoria |
|---|---|---|
| `objectid` | `bgg_id` | Sí |
| `objectname` | `name` | Sí |
| `yearpublished`, si está | `year` | No |
| `comment` | `notes` | No |
| `image_url`, si está | `image_path` (se descarga) | No |

El importador acepta cualquier CSV que contenga al menos `objectid` y `objectname`; las demás columnas se ignoran salvo `image_url`, que si viene se usa como origen de la imagen. Así el sistema sigue funcionando aunque BGG cambie el formato de su exportación.

**Proceso:**

1. Se sube el fichero y se valida: codificación, columnas mínimas, duplicados y filas vacías.
2. Se muestra una previsualización con tres grupos: **altas** (no existían), **cambios** (nombre o año distintos) y **desaparecidos** (estaban y ya no están).
3. El administrador confirma. Las altas entran como Disponibles para el próximo evento; los desaparecidos pasan a **Retirados** si tienen historial y se ofrecen para eliminar si no lo tienen.
4. Cada importación deja un asiento en la auditoría con el recuento de cada grupo.

**Cuándo se puede importar:** solo si no hay evento abierto y no hay ningún juego prestado (RN-24). Es la «ventana de mantenimiento» y no necesita ninguna pantalla adicional: el botón se desactiva y explica por qué.

## 12.4 Imágenes

El jugador elige mirando. Sin imagen, un catálogo de 600 nombres es una lista de texto y la decisión se toma por lo que ya conoce. Las imágenes son parte del MVP, no un adorno.

**De dónde salen.** El CSV no las trae. Se obtienen de la API de BGG (`/xmlapi2/thing?id=…`), que **exige el token de aplicación** del apartado 12.1. Se usa **solo la miniatura** (`<thumbnail>`): la imagen grande no se descarga en esta versión porque pesa veinte veces más y el catálogo se consulta en un móvil.

**Cómo se descargan:**

1. El administrador de aplicación pulsa «Descargar imágenes» en «Catálogo → Imágenes».
2. El trabajo recorre los juegos con `bgg_id` y `image_status` en `pending` o `error`, a **una petición por segundo**.
3. Guarda el fichero en `/data/images/{bgg_id}.{ext}` —la extensión sale del tipo de contenido— y marca `image_status = ok`.
4. Si BGG responde que ese juego no tiene imagen, marca `none` y **no vuelve a intentarlo**. Si falla la red, marca `error` y lo reintenta en la siguiente pasada.
5. Al terminar informa: descargadas, sin imagen, fallidas y juegos sin `bgg_id`.

Con 600 juegos son unos diez minutos. El trabajo es reanudable y **solo puede haber uno en marcha**: mientras corre, el botón está deshabilitado y se muestra el progreso. Se puede lanzar con el evento abierto, porque no toca el estado de ningún juego: solo escribe ficheros y marcas.

**Duplicados.** Dos ejemplares del mismo título comparten `bgg_id`, así que **comparten fichero**: se descarga una vez y las dos fichas apuntan a la misma imagen.

**Si no hay token o la descarga falla:** el juego se muestra con un marcador —la inicial del título sobre el color del estado—. El sistema funciona; se pierde la ayuda visual, no la operación.

**Respaldo manual.** El importador acepta una columna opcional `image_url` en el CSV. Si viene, se descarga al mismo sitio que las demás —nunca se enlaza en caliente— y pasa por la misma validación de host que la API. Si la URL falla, `image_status = error` y marcador. Sirve para una colección pequeña o para imágenes propias.

**En el servidor** no se redimensiona ni se convierte nada: se sirve el fichero tal cual, con caché de un año en el navegador. Cada imagen lleva `alt` con el nombre del juego y, en la ficha, la atribución a BoardGameGeek.

**Limpieza.** Al eliminar un juego se borra su imagen si ningún otro ejemplar la usa. Un trabajo semanal retira de `/data/images` los ficheros que no referencia ningún juego.

## 12.5 Ejemplares duplicados

- Si la exportación trae dos filas con el mismo `objectid`, se crean **dos juegos** con el mismo `bgg_id`: «Catan» y «Catan (2)».
- Cada uno tiene su historial, su estado y su préstamo. Se pueden prestar los dos a la vez, a personas distintas.
- El botón «Duplicar ejemplar» crea una copia desde la ficha, para cuando la segunda caja no está en BGG o se añade después.
- En el catálogo del jugador se ven como dos fichas con la misma imagen y distinto sufijo.

## 12.6 Exportaciones

| Formato | Contenido | Para qué |
|---|---|---|
| CSV de catálogo | Identificador, nombre, año, estado y etiqueta de ejemplar | Respaldo y revisión en hoja de cálculo |
| CSV de préstamos | Juego, jugador seudonimizado, horas, estado, cierre | Análisis propio |
| PDF de resumen | Métricas y gráficos del evento | Memoria de la asociación |
