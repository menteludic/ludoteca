# Sistema de préstamo de juegos para eventos

**Documento de proyecto · versión 1.0 · 23 de noviembre de 2026**

Preparado por Hermes para Roberto M. · Base para el desarrollo del proyecto.

# 1. Control de versiones y aprobación

## 1.1 Historial

| Versión | Fecha | Autor | Contenido |
|---|---|---|---|
| 0.1 | 12/11/2026 | Roberto M. | Documento inicial: objetivos, actores y stack técnico. |
| 0.2 | 23/11/2026 | Hermes | Análisis crítico y decisiones D1–D12. |
| 1.0 | 23/11/2026 | Hermes | Documento de proyecto. Base para el desarrollo. |

## 1.2 Aprobación

| Rol | Nombre | Estado | Fecha |
|---|---|---|---|
| Promotor y responsable funcional | Roberto M. | Aprobado | 23/11/2026 |
| Asociación (titular del tratamiento de datos) | Junta directiva | Pendiente | Antes de la fase 2 |
| Sysop (infraestructura y despliegue) | Por designar | Pendiente | Antes de la fase 2 |
| Responsable de protección de datos | Por designar | Pendiente | Antes de la fase 4 |

Una aprobación pendiente no bloquea el desarrollo del núcleo, pero sí el tratamiento de datos reales y el despliegue en producción.

## 1.3 Convenciones

- **Código, base de datos y API en inglés** (`loan`, `game`, `event`, `returned_at`). **Interfaz y documentación en castellano.** El glosario del capítulo 4 da la correspondencia.
- Los textos de la interfaz viven en un único fichero `ui/es.json`, con claves estables, para poder traducir sin tocar código.
- Requisitos citables: `RF-101`, `RN-07`, `RNF-03`, `SEC-04`, `UC-02`, `ADR-003`.
- **Obligatorio** (MUST), **recomendado** (SHOULD), **opcional** (MAY).
- Solo queda una decisión abierta: el **día exacto** del evento de marzo de 2027. No bloquea el diseño.

# 2. Resumen ejecutivo, objetivos y KPIs

## 2.1 El problema

La asociación presta juegos durante un evento de uno a tres días. El control se lleva en papel o en una hoja de cálculo: al final del día nadie sabe con certeza qué juegos están fuera ni quién los tiene, y no queda registro de qué se jugó. Con 600 juegos y 1.500 visitantes al día, el mostrador se convierte en una cola si cada operación exige teclear.

## 2.2 La solución

Una aplicación web con tres pantallas:

- **El jugador**, desde su móvil: se registra una vez, completa su perfil, ve el catálogo con imagen y estado de cada juego, y pide uno. Recibe un QR que enseña en el mostrador.
- **El controlador**, desde una tablet: escanea ese QR, ve el nombre del jugador y el juego, y pulsa «Entregar». Para devolver, vuelve a escanear el QR del jugador o busca el juego por nombre.
- **El panel de sala**, en un monitor con sesión de analista: muestra a la gente los juegos que están fuera y el ranking de los más prestados.

Sin teclear nombres, sin papeletas y sin hojas de cálculo. Al cerrar el evento, el sistema ya tiene el registro completo y las estadísticas calculadas.

## 2.3 Indicadores de éxito

| ID | Indicador | Objetivo | Cómo se mide |
|---|---|---|---|
| KPI-01 | Entregas por debajo de 20 segundos | ≥ 95 % | La aplicación cronometra desde que el controlador abre el escáner hasta que confirma |
| KPI-02 | Incidencias sobre operaciones | ≤ 1 % | Se considera incidencia: QR ilegible, préstamo no encontrado, conflicto por juego ya prestado o corrección manual |
| KPI-03 | Altas completadas sin ayuda | ≥ 90 % | Prueba de usabilidad con cinco personas y observación en el evento piloto |
| KPI-04 | Catálogo utilizado | ≥ 60 % de los juegos prestados al menos una vez | MET-03 sobre el total del evento |

## 2.4 Qué no es este sistema

No es un sistema crítico y el documento no lo trata como tal. No hay compromiso de disponibilidad del 99,9 %, ni recuperación en minutos, ni plan de contingencia en papel. Si el servidor se cae un rato, el evento sigue: la gente sigue jugando y las operaciones se registran cuando vuelve. Lo que sí se exige es que **el registro sea fiel**: ni un préstamo inventado, ni uno perdido por un error de la aplicación.

# 3. Alcance

## 3.1 Dentro del MVP

| Área | Incluido |
|---|---|
| Cuentas | Registro local con correo y contraseña, o con Google o Facebook; perfil con nombre, apellidos, DNI y declaración de mayoría de edad. |
| Catálogo | Importación desde CSV de BGG, imágenes, alta manual, ejemplares duplicados, bloqueo y retirada. |
| Evento | Franjas horarias, apertura automática, cierre manual, un solo evento abierto a la vez. |
| Préstamo | Solicitud, QR, entrega por escaneo, devolución, cancelación, un juego por jugador. |
| Cierre | Aviso con la lista de juegos fuera y cierre forzoso que los da por devueltos. |
| Estadísticas | Panel de sala público durante el evento y, después, préstamos por juego, tiempo medio de uso, catálogo utilizado y uso por día; informe y CSV. |
| Administración | Roles, eventos, franjas, configuración de acceso por evento, listado de usuarios con DNI, auditoría. |

## 3.2 Fuera del alcance

| Excluido | Motivo |
|---|---|
| Cola de espera y avisos | Si está cogido, no está. |
| Reserva anticipada | No se contempla. |
| Duración máxima, prórrogas y devoluciones tardías | No hay plazo; se devuelve al terminar. |
| Gestión de incidencias, piezas y recuentos | Aceptar el juego es la revisión. |
| Sanciones, fianzas y cobros | La asociación no cobra. |
| Funcionamiento sin red | Se asume red durante el evento. |
| Plan de contingencia en papel | No procede en este documento. |
| Etiquetas QR en las cajas | No hay un sistema fiable de etiquetado; la devolución va por el QR del jugador o por búsqueda. |
| Reserva de mesas, torneos, aforo, entradas | Otros dominios. |
| Aplicación nativa | La web instalable cubre el caso. |
| Menores de edad | Solo pueden pedir juegos los mayores de 18 años. |

## 3.3 Supuestos

- Hay red wifi en el recinto y cubre el mostrador.
- El servidor está en un VPS y no en el recinto.
- La asociación tiene 4 a 6 tablets con cámara y Android 9 o superior, y una pantalla para el panel de sala.
- Los controladores son voluntarios con 15 minutos de formación.
- El catálogo está en el perfil público de BGG que indique la asociación.
- El evento dura entre uno y tres días y no hay dos eventos simultáneos.

## 3.4 Restricciones

- **Técnicas:** Node.js, SQLite con el fichero de datos fuera del contenedor, REST con OpenAPI, JavaScript con JSDoc, estilo funcional sin `class`, `new` ni `this` en el código propio.
- **Legales:** RGPD y LOPDGDD; solo mayores de edad; DNI como dato personal.
- **Económicas:** infraestructura ≤ 12 €/mes, sin licencias de pago.
- **De terceros:** el acceso automatizado a la página de BGG está bloqueado por Cloudflare; el catálogo se importa por CSV y las imágenes requieren la API con token de aplicación.

# 4. Glosario y estados del juego

Un concepto, un nombre, en la interfaz y en el código. El código usa el inglés; esta tabla da la correspondencia.

## 4.1 Términos

| Término (UI) | Identificador en código | Significado | No usar |
|---|---|---|---|
| Juego | `game` | Un ejemplar físico de la asociación. | «libro», «producto» |
| Ejemplar | `game` | Cada copia física de un mismo título. Dos copias son dos juegos y se prestan por separado. | «unidad» |
| Ficha de BGG | `bgg_id` | Identificador del título en BoardGameGeek. | — |
| Catálogo | `games` | El inventario completo de la asociación. | — |
| Imagen | `image_path` | Miniatura del juego guardada en el servidor, para reconocerlo de un vistazo. | «foto», «portada» |
| Evento | `event` | Actividad temporal con franjas durante las que se presta. | «feria», «jornada» |
| Franja | `time_slot` | Intervalo de un evento en el que está abierto. | «horario» |
| Abierto | `open` | El evento admite recogidas en este momento. | «activo» |
| Cerrado | `closed` | No admite recogidas; sí devoluciones. | «bloqueado» |
| Préstamo | `loan` | Cesión de un juego a un jugador, desde la solicitud hasta la devolución. | «alquiler» |
| Solicitud | `requested` | El jugador ha pedido el juego y aún no lo tiene. | «reserva» |
| Entrega | `delivered` | El controlador acepta el QR y pone el juego en manos del jugador. | — |
| Devolución | `returned` | El controlador recibe el juego y cierra el préstamo. | «retorno» |
| Bloqueo de solicitud | `request_ttl_minutes` | Minutos que una solicitud mantiene el juego apartado antes de caducar. Configurable por evento. | «timeout» |
| Jugador | `player` | Usuario registrado que puede pedir juegos. | «usuario» a secas |
| Controlador | `controller` | Usuario que entrega y recibe en el mostrador. | «operador» |
| Administrador de evento | `event_admin` | Coordina el evento y su catálogo. | «supervisor» |
| Administrador de aplicación | `app_admin` | Gestiona eventos, cuentas y catálogo global. | «administrador de sistema» |
| Analista | `analyst` | Consulta estadísticas y atiende el panel de sala; no opera. | «reportero» |
| QR del jugador | `player_qr` | Código temporal que identifica un préstamo solicitado. | — |
| Panel de sala | `room_panel` | Página pública, sin sesión, con los juegos fuera y los rankings del evento abierto. | «dashboard» |
| Auditoría | `audit_log` | Registro de solo anexión con quién hizo qué y cuándo. | «log» |
| Ventana de mantenimiento | — | Momento sin evento abierto ni juegos prestados en el que se actualiza el catálogo. | — |

## 4.2 Los cuatro estados del juego

Se muestran así en la interfaz y se calculan así en el código:

| Estado | Definición | Cómo se calcula |
|---|---|---|
| **Retirado** | No está en la lista de BGG, pero conserva su historial. | `games.retired = 1` |
| **Bloqueado** | Está en el catálogo y en el evento, pero un administrador no lo deja salir. | `event_games.blocked = 1` |
| **Prestado** | Está en el evento pero lo tiene un jugador, o un administrador lo ha marcado así. | Existe un préstamo activo **o** `event_games.manually_lent = 1` |
| **Disponible** | En el catálogo, en el evento, sin bloquear y sin préstamo. | Ninguna de las anteriores |

Cuando concurren varios, manda este orden: **Retirado → Prestado → Bloqueado → Disponible**. Un juego retirado nunca se muestra para pedir, aunque siga en un evento antiguo.

> El estado no se guarda: se calcula. Lo único que se guarda son las tres decisiones (`retired`, `blocked`, `manually_lent`) y los préstamos. Así no puede haber un juego «Disponible» que en realidad esté fuera.

## 4.3 Términos prohibidos

- **«No disponible»**: se sustituye por el estado concreto (Bloqueado, Prestado o Retirado).
- **«Borrado»**: un juego nunca se borra si tiene historial; se **retira**.
- **«Reserva»**: no existe. Existe **solicitud**, que caduca tras el bloqueo configurado.
- **«Devolución tardía»**: no hay plazo, así que no hay tardanza.

# 5. Roles, permisos y ciclo de vida de las cuentas

## 5.1 Los cinco roles

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Jugador** | Cualquier visitante registrado mayor de edad. | Completar su perfil, ver el catálogo, pedir un juego, cancelar su solicitud y devolverlo. |
| **Controlador** | Voluntario de la asociación en el mostrador. | Entregar y recibir juegos con la tablet; consultar la lista de juegos fuera. |
| **Administrador de evento** | Coordinador del evento. | Todo lo del controlador, más bloquear juegos, cerrar el evento, corregir préstamos, dar de alta controladores y consultar los usuarios del evento con su DNI. |
| **Administrador de aplicación** | Responsable técnico de la asociación. | Todo, en todos los eventos: crear eventos, importar el catálogo, gestionar cuentas y roles. |
| **Analista** | Persona que consulta resultados y atiende el panel de sala. | Ver y exportar estadísticas y dejar el panel de sala funcionando. Nada más. |

Los roles **se acumulan** sobre una misma cuenta: un controlador puede ser jugador y pedir un juego en su descanso. No hay jerarquía implícita: cada permiso se comprueba en el servidor.

## 5.2 Cómo se llega a cada rol

| Acción | Quién la hace | Sobre quién |
|---|---|---|
| Crear cuenta | La propia persona | — |
| Completar perfil (nombre, apellidos, DNI, edad) | La propia persona | Su cuenta |
| Nombrar controlador | Administrador de evento | Un usuario ya registrado |
| Nombrar administrador de evento | Administrador de aplicación | Un usuario ya registrado |
| Nombrar analista | Administrador de aplicación | Un usuario ya registrado |
| Retirar un rol | Administrador de aplicación | Cualquiera, salvo el último administrador de aplicación |

Un rol retirado surte efecto inmediato: las sesiones abiertas de esa cuenta se revocan en la siguiente petición.

## 5.3 Matriz de permisos

● permitido · ◐ con condición · — denegado.

| Operación | Jugador | Controlador | Adm. evento | Analista | Adm. app. |
|---|:--:|:--:|:--:|:--:|:--:|
| Registrarse e iniciar sesión | ● | ● | ● | ● | ● |
| Ver la página pública del evento | ● | ● | ● | ● | ● |
| Editar su perfil y su contraseña | ● | ● | ● | ● | ● |
| Ver su propio DNI | ● | ● | ● | ● | ● |
| Consultar los usuarios del evento con su DNI | — | — | ● | — | ● |
| Ver el DNI de un jugador en su ficha | — | — | ◐ solo desde el listado del evento | — | ● |
| Ver catálogo y estado de cada juego | ● | ● | ● | ● | ● |
| Solicitar un juego | ● | ● | ● | — | ● |
| Cancelar su solicitud | ● | ● | ● | — | ● |
| Ver su préstamo activo | ● | ● | ● | — | ● |
| Escanear el QR del jugador y entregar | — | ● | ● | — | — |
| Recibir una devolución | — | ● | ● | — | — |
| Buscar un jugador por nombre (alternativa al QR) | — | ● | ● | — | — |
| Ver la lista de juegos fuera del evento | — | ● | ● | ◐ solo agregados | ● |
| Bloquear o desbloquear un juego en el evento | — | — | ● | — | ● |
| Marcar un juego como Prestado a mano | — | — | ● | — | ● |
| Cerrar o reabrir el evento | — | — | ● | — | ● |
| Cierre forzoso con juegos fuera | — | — | ● | — | ● |
| Corregir un préstamo | — | — | ● | — | ● |
| Nombrar controladores | — | — | ● | — | ● |
| Nombrar administradores de evento y analistas | — | — | — | — | ● |
| Crear y editar eventos y franjas | — | — | — | — | ● |
| Configurar los métodos de acceso y el bloqueo de solicitud | — | — | — | — | ● |
| Importar o actualizar el catálogo y sus imágenes | — | — | — | — | ● |
| Retirar o reactivar un juego | — | — | — | — | ● |
| Ver estadísticas del evento | — | — | ● | ● | ● |
| Atender el panel de sala | — | — | ● | ● | ● |
| Exportar estadísticas | — | — | — | ● | ● |
| Ver la auditoría | — | — | ◐ solo su evento | — | ● |

Condiciones:

- **Solo desde el listado del evento**: el administrador de evento ve el DNI de quienes han pedido juegos en su evento, en la pantalla de usuarios; no lo ve en la ficha suelta de un jugador cualquiera, ni en eventos que no sean suyos.
- **Solo agregados**: el analista ve números, nunca nombres ni identificadores de jugador.

El administrador de aplicación ve cualquier DNI sin condición ni justificación previa.

## 5.4 Matriz por campo

| Campo | Su titular | Controlador | Adm. evento | Analista | Adm. app. |
|---|---|---|---|---|---|
| Nombre y apellidos | ● | ● al entregar | ● | — | ● |
| DNI | ● | ◐ enmascarado (`***123X`) | ● en el listado de su evento | — | ● |
| Correo | ● | — | — | — | ● |
| Contraseña | — | — | — | — | — |
| Historial de préstamos | ● | ● del evento | ● del evento | ◐ agregado | ● |
| Edad declarada | ● | — | ● | — | ● |

El controlador ve el nombre porque lo necesita para entregar el juego; no ve el correo, ni el DNI, ni el historial de otros eventos.

## 5.5 La pantalla de usuarios del evento

Es la única del sistema que muestra varios DNI a la vez, y por eso tiene reglas propias:

- La abren el administrador de evento (para su evento) y el de aplicación (para cualquiera).
- Lista a los jugadores que han **solicitado** al menos un juego en ese evento, con su DNI, sus préstamos y las horas.
- Cada apertura y cada exportación dejan una línea en la auditoría: quién y sobre qué evento. Es traza, no permiso: no hay que justificar nada para ver.
- No muestra contraseñas ni correos de terceros.

# 6. Flujos de uso

Los tiempos son objetivos de diseño y se miden en la prueba de usabilidad.

## UC-01 · Crear cuenta

- **Actor:** visitante.
- **Flujo:** abre la aplicación, elige «Entrar con Google», «Entrar con Facebook» o «Crear cuenta con correo». En el caso local: correo, contraseña y confirmación. Recibe el alta inmediata, sin verificación por correo.
- **Postcondición:** cuenta creada con rol jugador y sesión iniciada.
- **Errores:** correo ya registrado → se ofrece iniciar sesión o recuperar la contraseña (UC-16); contraseña débil → se explica el mínimo (10 caracteres).
- **Tiempo objetivo:** ≤ 40 s.

## UC-02 · Completar el perfil

- **Actor:** jugador.
- **Precondición:** sesión iniciada.
- **Flujo:** nombre completo, apellidos, DNI (o NIF o NIE) y casilla «declaro ser mayor de 18 años». La política de datos está enlazada en la misma pantalla.
- **Postcondición:** perfil completo; ya puede pedir juegos.
- **Regla:** sin perfil completo no se puede solicitar; la aplicación lo explica antes de que el jugador llegue al mostrador.

## UC-03 · Consultar el evento y el catálogo

- **Flujo:** al entrar, el jugador ve el estado del evento. Si está abierto: nombre, descripción, franjas y botón «Buscar juego». Si está cerrado: mensaje claro de que ahora no se pueden coger juegos, con la próxima franja.
- **Catálogo:** cada juego se muestra con su **imagen**, su nombre y su estado. Solo los **Disponibles** se pueden seleccionar; los demás se ven en gris con su motivo.
- **Búsqueda:** por nombre, tolerante a mayúsculas y acentos.

## UC-04 · Solicitar un juego

- **Actor:** jugador.
- **Precondiciones:** perfil completo, evento abierto, sin préstamo activo.
- **Flujo:** elige un juego disponible y pulsa «Pedir». La pantalla muestra un QR grande y un código de 6 caracteres, válidos durante el bloqueo configurado del evento (15 minutos por defecto).
- **Postcondición:** préstamo en estado `REQUESTED`.
- **Errores:** ya tiene un préstamo → se le indica cuál debe devolver; el juego acaba de ocuparse → se le avisa y se le propone otro.
- **Tiempo objetivo:** ≤ 15 s.

## UC-05 · Entregar en el mostrador

- **Actor:** controlador.
- **Precondición:** evento abierto; el jugador muestra su QR.
- **Flujo:** 1) abre «Mostrador» en la tablet; 2) pulsa «Escanear» y enfoca el QR del jugador; 3) la pantalla muestra en grande el nombre del jugador y la imagen y el nombre del juego; 4) pulsa «Entregar».
- **Postcondición:** préstamo `DELIVERED`, con controlador y hora del servidor.
- **Tiempo objetivo:** ≤ 20 s desde que abre el escáner.
- **Errores:** QR caducado → el jugador lo regenera desde su móvil; juego ya prestado → mensaje «lo tiene X desde las 17:04»; juego bloqueado → mensaje con el motivo; evento cerrado → no se permite.
- **Alternativa sin QR:** buscar al jugador por nombre y apellidos; la entrega exige confirmar la inicial del DNI que ve el jugador en su pantalla, para no equivocarse de persona.

## UC-06 · Devolver

- **Actor:** controlador.
- **Flujo:** el jugador deja los juegos en el mostrador y muestra su QR (o dice su nombre). El controlador pulsa «Devolver», escanea el QR del jugador —o busca el juego por nombre— y la pantalla muestra el préstamo abierto y el tiempo que ha estado fuera. Pulsa «Devolver».
- **Postcondición:** préstamo `RETURNED`; el juego vuelve a Disponible.
- **Regla:** se puede devolver siempre, aunque el evento esté cerrado.
- **Errores:** el jugador no tiene préstamo abierto → se muestra su último préstamo y se ofrece corregir; si no se le identifica, se busca el juego entre los préstamos abiertos.
- **Nota:** no hay etiquetas QR en las cajas. La identificación del préstamo va por el jugador; el juego, por nombre o por la lista de lo que tiene fuera.

## UC-07 · Cancelar o dejar caducar una solicitud

- El jugador puede cancelar desde su móvil. Si no se presenta en el tiempo de bloqueo configurado, la solicitud caduca sola.
- Al caducar, el juego vuelve a estar Disponible para cualquiera.

## UC-08 · Cerrar el evento con juegos fuera

- **Actor:** administrador de evento.
- **Flujo:** pulsa «Cerrar evento». Si hay juegos fuera, el sistema muestra la lista con jugador, juego y hora de salida, y ofrece dos caminos: esperar a que se devuelvan, o **cerrar de todos modos**, lo que marca esos préstamos como devueltos con la marca `forced_close`.
- **Regla:** el cierre forzoso no borra nada: queda registrado quién lo hizo, cuándo y qué préstamos se cerraron así.
- **Efecto:** el evento pasa a Cerrado; se calculan las estadísticas y se genera el informe.

## UC-09 · Bloquear un juego

- **Actor:** administrador de evento.
- **Flujo:** desde la ficha del juego, elige «Bloquear» y escribe el motivo (dañado, incompleto, reservado para una actividad). El juego sigue listado, pero no se puede pedir.
- **Regla:** no se puede bloquear ni retirar un juego con préstamo activo; primero se devuelve.

## UC-10 · Corregir un préstamo

- **Actor:** administrador de evento.
- **Casos:** el controlador entregó el juego a la persona equivocada, o devolvió una caja que no era.
- **Flujo:** busca el préstamo, elige «Corregir», indica qué cambia y por qué. La corrección se guarda como asiento nuevo en la auditoría; el préstamo muestra la marca «corregido».
- **Regla:** el controlador no corrige.

## UC-11 · Importar el catálogo y sus imágenes

- **Actor:** administrador de aplicación.
- **Precondición:** no hay ningún evento abierto y no hay juegos prestados.
- **Flujo:** descarga el CSV de su colección desde BGG, lo sube y revisa la previsualización (altas, cambios, duplicados y juegos desaparecidos). Confirma. Después, o en el mismo paso, se descargan las imágenes que falten.
- **Efecto:** altas nuevas, actualización de nombres, años e imágenes; los que ya no están pasan a **Retirado** si tienen historial; si no lo tienen, se pueden eliminar.
- **Duplicados:** si la colección tiene dos copias del mismo título, se crean dos juegos con el mismo `bgg_id` y distinta etiqueta («Catan», «Catan (2)»), y se prestan por separado.
- **Regla:** nunca se toca un juego con préstamo activo; si lo hay, la importación se bloquea y se explica por qué.

## UC-12 · Nombrar controlador

- **Actor:** administrador de evento.
- **Flujo:** busca a la persona entre los usuarios registrados, la selecciona y confirma. La persona recibe un aviso en la aplicación y ve el menú de mostrador la próxima vez que entre.
- **Regla:** si no está registrada, se le pide que se registre; no se crean cuentas a mano.

## UC-13 · Configurar el evento

- **Actor:** administrador de aplicación.
- **Flujo:** en la ficha del evento: tres casillas de acceso (cuenta local, Google, Facebook), al menos una activa; los minutos de bloqueo de solicitud (15 por defecto, máximo 120); y cuántos elementos muestra cada lista del panel de sala (5 por defecto, máximo 20).
- **Efecto:** la pantalla de acceso muestra solo los métodos permitidos; el bloqueo se aplica a las nuevas solicitudes; el panel recorta sus listas a ese número.

## UC-14 · Consultar los usuarios del evento

- **Actor:** administrador de evento.
- **Flujo:** abre «Usuarios del evento» y ve la tabla con nombre, DNI, juegos pedidos y horas. Puede ordenar, buscar por nombre y exportar.
- **Efecto:** queda un asiento de auditoría por cada apertura y por cada exportación.
- **Regla:** solo aparecen personas que han solicitado algo en ese evento; no es un listado general de cuentas.

## UC-15 · Panel de sala

- **Actor:** cualquiera. **No hace falta cuenta ni sesión.**
- **Flujo:** se abre `https://…/panel` en el monitor y se deja a pantalla completa. Se refresca solo cada 30 segundos y no requiere interacción.
- **Contenido:** tres listas del evento abierto, cada una recortada al número de elementos configurado en el evento:
  1. **Juegos fuera**, con imagen, nombre y tiempo transcurrido, ordenados de más a menos tiempo en la mesa. Si no caben todos, se recorta por el final: se ven los que más tiempo llevan.
  2. **Más prestados:** los que más veces han salido.
  3. **Más jugados:** los que más veces han superado el umbral de uso.
  Con la hora del último refresco en un extremo.
- **Sin evento abierto:** no se muestra ninguna lista, solo el aviso «Ahora no hay ningún evento abierto».
- **Regla:** no muestra nombres de jugadores ni DNI, y no pide evento porque solo hay uno abierto.

## UC-16 · Recuperar la contraseña

- **Actor:** cualquiera con cuenta local.
- **Tiempo objetivo:** ≤ 90 s desde que pulsa «He olvidado mi contraseña» hasta «Enlace enviado».

**Flujo:**

1. «He olvidado mi contraseña» en la pantalla de acceso.
2. Escribe su correo y pulsa «Continuar».
3. La pantalla muestra el correo de destino a 20 px y en negrita —«Enviaremos el enlace a juan@ejemplo.com»—, con un botón «Corregir» que vuelve al paso 2 conservando lo escrito.
4. Al confirmar, se envía un enlace de un solo uso, válido 30 minutos. La pantalla dice «Enlace enviado» y recuerda mirar en la carpeta de spam. Se puede pedir otro pasados 60 segundos.
5. El enlace abre una página con dos campos: nueva contraseña y confirmación, con la misma regla que en el registro (10 caracteres como mínimo). Al guardar, se cierran todas las sesiones abiertas.

**Si el enlace caduca o ya se ha usado:** la página lo dice y ofrece pedir uno nuevo, sin volver a empezar.

**Ayuda siempre visible** en las tres pantallas de la recuperación, incluida la de confirmación: «Si el correo no es el correcto o no te llega el enlace, pide ayuda a un administrador del evento; está en el mostrador. Si siempre has entrado con Google o Facebook, usa ese botón.»

**Regla:** la respuesta es la misma exista o no la cuenta —a un correo desconocido no se le envía nada—, y el correo que se enseña es el que ha escrito el usuario, nunca uno leído de la base de datos. Como mucho, tres peticiones por hora y cuenta.

# 7. Modelo de datos y estados

## 7.1 Tablas

| Tabla | Contenido | Claves e índices |
|---|---|---|
| `users` | Cuenta y perfil: `id`, `email`, `password_hash`, `google_sub`, `facebook_sub`, `first_name`, `last_name`, `dni_encrypted`, `dni_masked`, `adult_confirmed_at`, `created_at` | `email` único, `google_sub` único, `facebook_sub` único |
| `user_roles` | `user_id`, `role` | PK compuesta |
| `sessions` | `id`, `user_id`, `created_at`, `expires_at`, `revoked_at`, `user_agent` | índice por `user_id` |
| `email_tokens` | `id`, `user_id`, `token_hash`, `purpose`, `expires_at`, `used_at` | `token_hash` único, índice `(user_id, expires_at)` |
| `events` | `id`, `name`, `description`, `instructions`, `privacy_policy`, `starts_at`, `ends_at`, `timezone`, `allow_local`, `allow_google`, `allow_facebook`, `request_ttl_minutes`, `panel_loans_limit`, `panel_ranking_limit`, `manual_closed_until`, `created_by` | índice por `starts_at` |
| `time_slots` | `id`, `event_id`, `starts_at`, `ends_at` | índice por `event_id` |
| `games` | `id`, `bgg_id`, `name`, `year`, `copy_label`, `image_path`, `image_status`, `retired`, `notes`, `created_at` | índice `bgg_id`, `name` |
| `event_games` | `event_id`, `game_id`, `blocked`, `block_reason`, `manually_lent`, `updated_by`, `updated_at` | PK `(event_id, game_id)` |
| `loans` | `id`, `event_id`, `game_id`, `user_id`, `status`, `requested_at`, `delivered_at`, `delivered_by`, `returned_at`, `returned_by`, `closed_reason`, `corrected`, `version` | índice `(game_id, status)`, `(user_id, status)` |
| `qr_tokens` | `token_hash`, `loan_id`, `expires_at`, `used_at` | PK `token_hash`, índice `loan_id` |
| `audit_log` | `id`, `actor_id`, `action`, `entity`, `entity_id`, `data`, `created_at`, `prev_hash`, `hash` | índice `(entity, entity_id)`, `(created_at)` |
| `settings` | `key`, `value` | PK `key` |

Notas de diseño:

- El DNI se guarda cifrado (`dni_encrypted`) y enmascarado (`dni_masked`) para poder mostrarlo sin descifrar cuando el rol lo permite.
- `bgg_id` **no es único**: dos copias del mismo título comparten identificador y se distinguen por `copy_label` y por su propio `id`.
- `image_path` apunta al fichero de la miniatura en el servidor; si está vacío, la interfaz muestra un marcador con la inicial del juego.
- No hay tabla de incidencias, de cola ni de etiquetas QR: no existen en el alcance.
- `loans.status` solo admite cuatro valores: `REQUESTED`, `DELIVERED`, `RETURNED`, `CANCELLED`.
- La auditoría es de solo anexión y encadena el hash del asiento anterior: si alguien altera una fila, la cadena deja de cuadrar.

## 7.2 Estados del préstamo

| Estado | Puede pasar a | Disparador | Quién | Condición |
|---|---|---|---|---|
| `REQUESTED` | `DELIVERED` | Escaneo del QR y confirmación | Controlador | Evento abierto, juego disponible, sin otro préstamo activo del jugador |
| `REQUESTED` | `CANCELLED` | Cancelación o fin del bloqueo configurado | Jugador o sistema | — |
| `DELIVERED` | `RETURNED` | Escaneo del QR del jugador o búsqueda y confirmación | Controlador | Siempre, con evento abierto o cerrado |
| `DELIVERED` | `RETURNED` (forzado) | Cierre del evento | Adm. evento | Queda marca `forced_close` |
| `RETURNED` | — | Terminal | — | Se corrige con asiento de auditoría, no cambiando de estado |
| `CANCELLED` | — | Terminal | — | — |

No hay estado «vencido» porque no hay plazo. Un juego puede estar fuera tres días: la lista de cierre lo mostrará.

## 7.3 Invariantes

| ID | Invariante |
|---|---|
| INV-01 | Un juego no puede tener dos préstamos `DELIVERED` a la vez. |
| INV-02 | Un jugador no puede tener más de un préstamo activo (`REQUESTED` o `DELIVERED`). |
| INV-03 | No se entrega con el evento cerrado. |
| INV-04 | No se entrega un juego retirado, bloqueado, marcado como prestado a mano o ausente del evento. |
| INV-05 | La devolución se acepta siempre, también con el evento cerrado. |
| INV-06 | Solo un controlador o un administrador entrega y devuelve. |
| INV-07 | Un QR sirve una sola vez y caduca al cumplirse el bloqueo configurado del evento. |
| INV-08 | No se retira ni se bloquea un juego con préstamo activo. |
| INV-09 | El catálogo solo se importa si no hay evento abierto ni juegos prestados. |
| INV-10 | Solo puede haber un evento abierto a la vez. |
| INV-11 | El DNI se muestra entero a su titular, al administrador de aplicación y al de evento en el listado de su evento; el controlador lo ve enmascarado. |
| INV-12 | La auditoría no se modifica ni se borra; solo se añade. |
| INV-13 | Sin perfil completo y sin declaración de mayoría de edad no se puede solicitar. |
| INV-14 | Toda entrega y toda devolución registran quién y cuándo, con la hora del servidor. |
| INV-15 | Dos ejemplares del mismo título son juegos distintos y se prestan por separado. |
| INV-16 | Cada apertura o exportación de la pantalla de usuarios del evento deja asiento de auditoría. |

## 7.4 Cálculo del estado del juego

```text
if game.retired                     -> RETIRADO
else if active_loan(game, event)     -> PRESTADO
else if event_game.manually_lent     -> PRESTADO
else if event_game.blocked           -> BLOQUEADO
else                                 -> DISPONIBLE
```

Una sola función pura, una sola prueba por rama, y la interfaz nunca decide por su cuenta: recibe el estado ya calculado.

## 7.5 Auditoría

Se registra, como mínimo: inicio y cierre de sesión, creación de cuenta, cambio de perfil, cambio de rol, solicitud, entrega, devolución, cancelación, bloqueo, desbloqueo, corrección, importación de catálogo, descarga de imágenes, cierre de evento, y apertura y exportación del listado de usuarios.

Cada asiento guarda `actor_id`, `action`, entidad, identificador, datos relevantes (sin DNI ni contraseñas), fecha y hora del servidor, y el hash encadenado. La comprobación de integridad es un comando de administración que recorre la cadena y avisa del primer asiento roto.

# 8. Reglas de negocio

Veintiocho reglas, todas verificables con una prueba automática. Si una cambia, cambia aquí y en su prueba en el mismo commit.

| ID | Regla | Verificación |
|---|---|---|
| RN-01 | Solo pueden pedir juegos las personas mayores de 18 años, con declaración expresa en el perfil. | Sin `adult_confirmed_at`, la solicitud se rechaza con `ADULT_REQUIRED`. |
| RN-02 | Para pedir hace falta el perfil completo: nombre, apellidos y DNI, NIF o NIE. | Perfil incompleto → `PROFILE_INCOMPLETE`, con el enlace a completarlo. |
| RN-03 | Un jugador solo puede tener un préstamo activo a la vez. | Segundo intento → `LOAN_ALREADY_ACTIVE`, indicando cuál devolver. |
| RN-04 | Solo se puede solicitar con el evento abierto. | Evento cerrado → `EVENT_CLOSED`, con la próxima franja. |
| RN-05 | Solo se puede pedir un juego en estado Disponible. | Bloqueado, prestado o retirado → `GAME_NOT_AVAILABLE` con el motivo. |
| RN-06 | Una solicitud caduca cuando se cumple el bloqueo configurado del evento (15 minutos por defecto, máximo 120). | Trabajo programado cada minuto; pasa a `CANCELLED`. |
| RN-07 | La entrega la hace un controlador escaneando el QR del jugador. | Sin rol controlador → `FORBIDDEN`; sin QR válido → `QR_INVALID`. |
| RN-08 | El QR es de un solo uso y caduca al cumplirse el bloqueo configurado del evento. | Segundo uso → `QR_ALREADY_USED`; caducado → `QR_EXPIRED`. |
| RN-09 | En un conflicto por el mismo juego gana la primera entrega confirmada; la otra se cancela. | Prueba de concurrencia con dos peticiones simultáneas. |
| RN-10 | No se entrega con el evento cerrado, aunque la solicitud siga viva. | Entrega con evento cerrado → `EVENT_CLOSED`. |
| RN-11 | La devolución se acepta siempre, con el evento abierto o cerrado. | Devolución a las 23:00 con evento cerrado: aceptada. |
| RN-12 | La devolución se hace escaneando el QR del jugador o buscando el juego entre los préstamos abiertos. | Sin QR, la búsqueda por nombre identifica el préstamo y exige confirmación. |
| RN-13 | Si el jugador no tiene préstamo abierto, se avisa, se muestra su último préstamo y se ofrece corregir. | Prueba con un jugador sin préstamo. |
| RN-14 | No hay plazo de devolución, ni prórrogas, ni penalizaciones. | No existe ningún campo de vencimiento ni tarea de retraso. |
| RN-15 | El bloqueo de un juego exige motivo y se muestra en el catálogo. | Sin motivo no se guarda. |
| RN-16 | Marcar un juego como Prestado a mano es exclusivo del administrador de evento y lo saca de la lista de disponibles. | Prueba con el rol de controlador: denegado. |
| RN-17 | No se bloquea ni se retira un juego con préstamo activo. | Ambos intentos → `GAME_ON_LOAN`. |
| RN-18 | Un juego que desaparece de BGG pasa a Retirado si tiene historial, y deja de ofrecerse. | Importación con un juego desaparecido y con préstamos antiguos. |
| RN-19 | El controlador ve el DNI enmascarado. El administrador de evento lo ve en el listado de su evento y el de aplicación en cualquier ficha. | Prueba de cada rol contra la ficha y contra el listado. |
| RN-20 | El DNI se conserva mientras exista la cuenta; se borra con ella o cuando su titular lo pida. | Borrado de cuenta y comprobación posterior del campo. |
| RN-21 | Solo puede haber un evento abierto a la vez. | Al abrir el segundo, el primero se cierra o la operación se rechaza. |
| RN-22 | El evento abre y cierra solo con sus franjas; el cierre manual dura hasta el final de la franja en curso. | Prueba con reloj simulado en los bordes. |
| RN-23 | El cierre con juegos fuera avisa y exige decisión: esperar o cerrar de todos modos. | El cierre forzoso deja marca en cada préstamo. |
| RN-24 | El catálogo solo se importa si no hay evento abierto ni juegos prestados. | Importación en plena franja → rechazo con explicación. |
| RN-25 | Solo el administrador de evento corrige un préstamo, con motivo y asiento de auditoría. | Corrección sin motivo → rechazo. |
| RN-26 | Los permisos se comprueban en el servidor en cada petición, no en la interfaz. | Prueba automatizada por rol y ruta. |
| RN-27 | La sesión dura 7 días; en las tablets del mostrador caduca a las 12 horas o tras 30 minutos de inactividad. | Reloj simulado. |
| RN-28 | Un evento debe tener al menos un método de acceso activo. | Guardar los tres desactivados → rechazo. |
| RN-29 | El bloqueo de una solicitud se configura por evento, entre 1 y 120 minutos. | Cambiar el valor y comprobar la caducidad con reloj simulado. |
| RN-30 | Dos ejemplares del mismo título son juegos distintos y se prestan por separado. | Préstamo simultáneo de «Catan» y «Catan (2)»: permitido. |
| RN-31 | El panel de sala no muestra nombres, DNI ni identificadores de jugador. | Revisión de la respuesta del panel. |
| RN-32 | El panel de sala es público: no exige sesión y no recibe parámetro de evento. | Petición sin cookie: responde 200 con el evento abierto. |
| RN-33 | Sin evento abierto, el panel no muestra ninguna lista. | Prueba con todos los eventos cerrados. |
| RN-34 | La recuperación de contraseña enseña el correo de destino antes de enviar y la respuesta no revela si la cuenta existe. | Prueba con correo registrado y no registrado: misma respuesta. |
| RN-35 | Al restablecer la contraseña se cierran todas las sesiones del usuario. | Sesión abierta en otro dispositivo: queda cerrada. |
| RN-36 | El enlace de recuperación caduca a los 30 minutos y no se puede usar dos veces. | Segundo uso: rechazado con el mensaje de ayuda. |

# 9. El evento: franjas, apertura y cierre

## 9.1 Dos estados, no seis

| Estado | Significado | Se puede pedir | Se puede devolver |
|---|---|:--:|:--:|
| **Abierto** | Hay una franja en curso y no hay cierre manual vigente. | Sí | Sí |
| **Cerrado** | Fuera de franja, o cerrado a mano por un administrador. | No | Sí |

No hay estados «borrador» ni «archivado». Un evento existe desde que se crea; antes de su primera franja está simplemente cerrado, y así se muestra.

## 9.2 Franjas

- Cada evento tiene una o más franjas: día, hora de inicio y hora de fin, en la zona `Europe/Madrid`.
- Las franjas no pueden solaparse entre sí ni salir del intervalo del evento.
- El evento se abre en el primer minuto de cada franja y se cierra en el último, sin intervención.
- El cálculo usa el instante UTC guardado; la interfaz muestra la hora local. Se prueba con las fechas de cambio de hora de marzo y octubre.
- El evento define además cuántos minutos queda una solicitud reservando el juego (15 por defecto; configurable entre 1 y 120).

## 9.3 Cierre manual

- Un administrador de evento puede cerrar el evento en cualquier momento, con un motivo opcional.
- El cierre manual se mantiene hasta el final de la franja en curso; la siguiente franja vuelve a abrirlo.
- Un administrador puede reabrir antes de ese final; queda registrado quién lo hizo.
- **Solo un evento abierto a la vez.** Si dos franjas de eventos distintos coinciden, la segunda no se abre y el administrador de aplicación ve el aviso para corregir el calendario.

## 9.4 Lo que ve el jugador

- **Evento abierto:** nombre, descripción, instrucciones, próximas franjas, botón «Buscar juego» y su préstamo activo, si lo tiene.
- **Evento cerrado:** «Ahora no se pueden coger juegos» y la fecha de la próxima franja. Si tiene un juego en su poder, ve el recordatorio de devolverlo.
- **Sin evento:** si no hay ningún evento en curso, el mismo mensaje, sin fecha.

## 9.5 Cierre del evento

1. El administrador pulsa «Cerrar evento».
2. Si no hay juegos fuera, se cierra y se calculan las estadísticas.
3. Si los hay, aparece la lista con jugador, juego y hora de salida.
4. Puede esperar a que se devuelvan, o cerrar de todos modos: esos préstamos pasan a `RETURNED` con la marca `forced_close` y el motivo.
5. El evento queda cerrado. El informe se puede consultar y exportar.

## 9.6 Operación del mostrador

| Elemento | Decisión |
|---|---|
| Puestos | De 4 a 6 tablets, cada una con su número visible. |
| Acceso | Cada controlador entra con su cuenta; la tablet recuerda la sesión 12 horas. |
| Turnos | Relevos cada dos horas; el cambio de turno no exige cerrar sesión. |
| Batería | Cargador por puesto y una batería externa de reserva. |
| Red | Wifi del recinto. Si falla, la operación se detiene y se reanuda al volver; no hay modo sin conexión. |
| Imágenes | Descargadas y revisadas antes del evento (12.4). |
| Cartel | Un cartel por mesa con el QR de la aplicación y tres pasos: regístrate, pide, recoge. |

# 10. Requisitos funcionales

Cada requisito tiene un criterio de aceptación verificable.

## 10.1 M1 · Cuentas y acceso

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-101 | Registro con correo y contraseña. | Correo único; contraseña de 10 caracteres como mínimo; alta inmediata sin verificación por correo. |
| RF-102 | Acceso con Google y con Facebook. | Botones visibles solo si el evento los permite; el identificador externo se guarda y no se duplica la cuenta si el correo coincide. |
| RF-103 | Configuración de métodos por evento. | Tres casillas; al menos una activa; la pantalla de acceso muestra solo las permitidas. |
| RF-104 | Inicio y cierre de sesión. | Sesión de 7 días con cookie `HttpOnly`; botón de salir en todas las pantallas. |
| RF-105 | Recuperar la contraseña. | Enlace de un solo uso por correo, válido 30 minutos; antes de enviarlo, la pantalla enseña la dirección de destino y permite corregirla. |
| RF-106 | Perfil: nombre, apellidos, DNI, edad. | Guardado parcial permitido; para pedir, todo completo. |
| RF-107 | DNI enmascarado. | La API devuelve `***123X` a cualquier rol distinto del titular. |
| RF-108 | Ver el DNI completo. | Administrador de aplicación en cualquier ficha; administrador de evento solo en el listado de su evento. |
| RF-109 | Cambio de contraseña. | El titular puede cambiarla pidiendo la actual; mínimo 10 caracteres. |
| RF-110 | Ayuda en la recuperación. | La pantalla de recuperación muestra siempre cómo pedir ayuda a un administrador del evento si el correo no es correcto, no llega el enlace o la cuenta es de Google o Facebook. |
| RF-110 | Revocación de sesiones al cambiar de rol. | Las sesiones abiertas de esa cuenta dejan de valer en la siguiente petición. |

## 10.2 M2 · Catálogo

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-201 | Importar catálogo desde CSV de BGG. | Subida, previsualización con altas, cambios y retiradas, y confirmación explícita. |
| RF-202 | Bloqueo de la importación. | Con evento abierto o juegos prestados, la importación se rechaza y explica el motivo. |
| RF-203 | Alta manual de juego. | Para cajas que no están en BGG; `bgg_id` vacío y marcador de imagen. |
| RF-204 | Imágenes del catálogo. | Cada juego muestra su miniatura; si falta, un marcador con la inicial y el color del estado. |
| RF-205 | Búsqueda en el catálogo. | Por nombre, sin distinguir mayúsculas ni acentos; resultados en menos de 300 ms. |
| RF-206 | Retirada y reactivación. | Retirar exige que no haya préstamo activo; reactivar devuelve el juego al catálogo. |
| RF-207 | Bloqueo por evento. | Con motivo obligatorio; visible en el catálogo del jugador. |
| RF-208 | Marcar Prestado a mano. | Solo administrador de evento; el juego deja de estar disponible sin préstamo asociado. |
| RF-209 | Historial por juego. | Préstamos y cambios de estado, con fecha y autor. |
| RF-210 | Exportación del catálogo. | CSV con identificadores, nombres, años, estado y etiqueta de ejemplar. |
| RF-211 | Duplicar un ejemplar. | Crea un segundo juego con el mismo `bgg_id` y etiqueta «(2)», con historial propio. |
| RF-212 | Descarga de imágenes. | Lote desde la API de BGG, una petición por segundo, con reintentos y recuento final. |

## 10.3 M3 · Eventos

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-301 | Crear y editar eventos. | Nombre, descripción, instrucciones, política de datos, fechas y zona. |
| RF-302 | Franjas. | Sin solapes, dentro del evento, con cálculo correcto en los cambios de hora. |
| RF-303 | Apertura automática. | En el primer minuto de la franja, el evento pasa a Abierto sin intervención. |
| RF-304 | Cierre manual y reapertura. | Con registro de autor y hora; el cierre dura hasta el final de la franja. |
| RF-305 | Un solo evento abierto. | Si otra franja coincide, no se abre y se avisa al administrador. |
| RF-306 | Cierre con juegos fuera. | Lista previa y cierre forzoso con marca en cada préstamo. |
| RF-307 | Página pública del evento. | Nombre, descripción, instrucciones, estado y próximas franjas, sin sesión. |
| RF-308 | Añadir y quitar juegos del evento. | En bloque desde el catálogo, con contador y búsqueda. |
| RF-309 | Bloqueo de solicitud configurable. | Valor entre 1 y 120 minutos, guardado por evento y aplicado a las solicitudes nuevas. |
| RF-310 | Límites del panel configurables. | Elementos por lista entre 1 y 20, guardados por evento. |

## 10.4 M4 · Préstamo

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-401 | Solicitar juego. | Solo disponible; crea el préstamo y devuelve el QR y el código de 6 caracteres. |
| RF-402 | Validaciones de solicitud. | Aplica RN-01 a RN-05 con mensajes que dicen qué hacer. |
| RF-403 | Caducidad de la solicitud. | Al cumplirse el bloqueo configurado pasa a cancelada y el juego queda libre. |
| RF-404 | Cancelación por el jugador. | Botón visible en la pantalla del QR. |
| RF-405 | Préstamo activo visible. | El jugador ve qué tiene, desde cuándo y qué debe hacer para devolverlo. |
| RF-406 | Concurrencia. | Dos entregas simultáneas del mismo juego: una gana, la otra recibe `GAME_NOT_AVAILABLE`. |
| RF-407 | Corrección por administrador. | Cambia jugador, juego o estado, con motivo, y deja asiento. |
| RF-408 | Cierre forzoso. | Marca los préstamos abiertos como devueltos con `forced_close`. |
| RF-409 | Lista de juegos fuera. | Por evento, con jugador, juego, hora de salida y tiempo transcurrido. |
| RF-410 | Historial del jugador. | Sus préstamos, con fecha y estado; no ve los de nadie más. |

## 10.5 M5 · Mostrador y QR

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-501 | Pantalla de mostrador. | Tres zonas: escanear, préstamo en curso y últimas operaciones; letra grande. |
| RF-502 | Escaneo del QR del jugador. | Con la cámara de la tablet, en menos de 2 segundos, sin teclear. |
| RF-503 | Confirmación de entrega. | Muestra nombre y juego en grande y exige un toque para confirmar. |
| RF-504 | Escaneo de la caja para devolver. | Localiza el préstamo abierto y muestra el tiempo fuera. |
| RF-505 | Alternativa manual. | Búsqueda por nombre y confirmación con la inicial del DNI que el jugador ve en su pantalla. |
| RF-506 | Avisos claros. | QR caducado, juego ya prestado y evento cerrado se explican con una frase y una acción posible. |
| RF-507 | Modo alto contraste. | Legible a plena luz; objetivos de 44 px; sin animaciones. |
| RF-508 | Registro de la operación. | Cada entrega y devolución guarda controlador, puesto y hora del servidor. |

## 10.6 M6 · Administración

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-601 | Gestión de roles. | Nombrar y retirar controladores, administradores y analistas, con las reglas de 5.2. |
| RF-602 | Auditoría consultable. | Filtros por actor, acción, entidad y fecha; exportación CSV. |
| RF-603 | Verificación de integridad. | Comando que recorre la cadena de hashes e informa del primer asiento roto. |
| RF-604 | Estado del sistema. | Salud, versión, último acceso y último trabajo programado. |
| RF-605 | Ajustes. | Zona horaria, días de retención del DNI y umbral de préstamo mínima para contar como uso. |
| RF-606 | Copia de seguridad manual. | Botón que genera el fichero de la base de datos para descargar. |
| RF-607 | Usuarios del evento con su DNI. | Lista de quienes han solicitado, con DNI, juegos y horas; apertura y exportación auditadas. |

## 10.7 M7 · Estadísticas

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-701 | Resumen del evento. | Total de préstamos, jugadores únicos, juegos distintos usados y tiempo medio de uso. |
| RF-702 | Ranking de juegos. | Ordenado por número de préstamos, con tiempo medio. |
| RF-703 | Uso por día y franja. | Tabla y gráfico de barras simple. |
| RF-704 | Filtros. | Por evento, día y franja. |
| RF-705 | Exportación. | CSV del detalle y PDF del resumen. |
| RF-706 | Sin datos personales. | Ninguna consulta de estadísticas devuelve nombres, correos ni DNI. |
| RF-707 | Panel de sala público. | Sin sesión ni parámetro de evento: juegos fuera ordenados por tiempo, más prestados y más jugados, recortados al límite del evento; refresco cada 30 s. |

# 11. Requisitos no funcionales

Proporcionados al tipo de sistema: se pide que funcione bien, no que resista un ataque coordinado ni una auditoría industrial.

| ID | Requisito | Cifra y verificación |
|---|---|---|
| RNF-01 | Latencia. | p95 ≤ 500 ms en cualquier pantalla, con 50 usuarios simultáneos. |
| RNF-02 | Concurrencia. | 50 usuarios y 5 operaciones por segundo sostenidas durante una hora. |
| RNF-03 | Capacidad. | 600 juegos, 5.000 préstamos y 10.000 cuentas por evento sin degradación. |
| RNF-04 | Disponibilidad. | Sin compromiso de nivel de servicio. RTO 4 horas y RPO 24 horas: si el servidor muere, se restaura la copia del día. |
| RNF-05 | Accesibilidad. | WCAG 2.2 AA; contraste 7:1 en el mostrador; 44 px de objetivo táctil; zoom al 200 % sin pérdida. |
| RNF-06 | Usabilidad. | Alta ≤ 40 s, solicitud ≤ 15 s, entrega ≤ 20 s, devolución ≤ 20 s. |
| RNF-07 | Compatibilidad. | Últimas dos versiones de Chrome, Edge, Safari y Firefox; iOS 15+, Android 9+. |
| RNF-08 | Idioma. | Interfaz en castellano, textos en un único fichero; código, base de datos y API en inglés. |
| RNF-09 | Adaptación. | De 360 a 1280 px; prioridad vertical en móvil y horizontal en tablet. |
| RNF-10 | Arranque. | Primera carga ≤ 3 s en 4G; siguientes ≤ 1 s desde caché. |
| RNF-11 | Peso. | Página inicial ≤ 250 KB comprimida. |
| RNF-12 | Mantenibilidad. | Módulos ≤ 300 líneas; dominio sin efectos secundarios; cobertura del 90 % (capítulo 16). |
| RNF-13 | Observabilidad. | Logs JSON con identificador de petición; `/health`; sin datos personales en los logs. |
| RNF-14 | Copias. | Diaria automática, retención 30 días, restauración probada una vez antes del evento. |
| RNF-15 | Coste. | ≤ 12 €/mes de infraestructura; todo el software, libre. |
| RNF-16 | Tablets modestas. | Funciona en una tablet de 2019 con 2 GB de RAM. |
| RNF-17 | Lectura fácil. | Instrucciones de tres pasos, con ejemplo visual, sin jerga técnica. |

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

# 13. Datos personales y privacidad

## 13.1 Qué se guarda y para qué

| Dato | Para qué | Base legal | Cuánto tiempo |
|---|---|---|---|
| Correo | Identificar la cuenta | Ejecución del servicio | Mientras la cuenta exista |
| Nombre y apellidos | Saber quién tiene el juego | Ejecución del servicio | Mientras la cuenta exista |
| DNI, NIF o NIE | Responsabilizarse del préstamo | Interés legítimo en proteger el patrimonio | Mientras exista la cuenta |
| Declaración de mayoría de edad | Cumplir la restricción de edad | Obligación legal | Mientras la cuenta exista |
| Historial de préstamos | Estadísticas y trazabilidad | Interés legítimo | Indefinido, seudonimizado |
| Enlace de recuperación | Demostrar que quien restablece es el titular | Ejecución del servicio | 30 minutos |

No se piden teléfono, dirección ni fecha de nacimiento. No hay perfilado ni decisiones automáticas.

## 13.2 Reglas

1. **Solo mayores de edad.** La declaración es una casilla que se guarda con fecha. Si el controlador tiene duda razonable, puede negar la entrega; el sistema no verifica documentos.
2. **DNI enmascarado al controlador.** En el mostrador se muestra `***123X`; el controlador no necesita más. El administrador de evento sí ve el DNI completo en la pantalla de usuarios del evento (5.5), que deja asiento cada vez que se abre o se exporta. Su titular lo ve entero en su perfil.
3. **DNI cifrado.** Se guarda cifrado con AES-256-GCM y una clave en el entorno del servidor; el valor enmascarado se guarda aparte para poder mostrarlo sin descifrar.
4. **Conservación.** Los datos se guardan mientras exista la cuenta y se borran con ella o cuando su titular lo pida (RN-20).
5. **Supresión de cuenta.** El titular puede pedirla; se borran correo, nombre y DNI y los préstamos quedan asociados a «Cuenta eliminada». Se conservan las cifras, no la persona.
6. **Sin cesiones.** No se comparte nada con terceros. El VPS está en la Unión Europea y hay contrato de encargado con el proveedor.
7. **Google y Facebook.** Si el evento permite esos accesos, el usuario decide usarlos; la pantalla lo explica antes de pulsar. Son transferencias internacionales del proveedor correspondiente y están cubiertas por sus propias garantías.
8. **Derechos.** Acceso, rectificación, supresión y portabilidad se atienden desde el perfil o por escrito; plazo máximo un mes. La exportación de los datos de una cuenta es un botón, en JSON.

## 13.3 Lo que no se hace

- No se guarda la IP en la auditoría.
- No se guardan los datos de la tarjeta ni pagos: no hay pagos.
- No se hacen fotos ni se pide documento escaneado.
- No se usan cookies de analítica ni de publicidad.
- No hay correos de verificación, de aviso ni de mercadotecnia. **El único correo que sale del sistema es el enlace de recuperación de contraseña** (13.4).


## 13.4 El único correo que sale

- **Qué se envía.** Un enlace de un solo uso para restablecer la contraseña. Nada más: ni verificación de cuenta, ni avisos, ni resúmenes.
- **Cómo se envía.** SMTP de un proveedor transaccional desde un subdominio propio (`mail.…`), con **SPF, DKIM y DMARC** publicados. Sin esos registros el correo cae en spam y el usuario se queda fuera.
- **Qué se mide.** Nada. Sin píxeles, sin enlaces de seguimiento, sin registrar aperturas. Solo se anota si el envío falló, para poder avisar en pantalla.
- **Rebotes.** Un rebote duro deja el correo marcado como no válido y la pantalla de recuperación lo dice: «No hemos podido entregar el correo; pide ayuda a un administrador».
- **Contenido.** El enlace caduca en 30 minutos, se guarda hasheado y sirve una sola vez. Al usarlo se cierran todas las sesiones.
- **Retención.** El enlace caducado se borra en el trabajo horario. Del envío no queda más rastro que el resultado (entregado o fallido).

# 14. Seguridad

## 14.1 Nivel objetivo

El sistema no es crítico y no maneja dinero. El objetivo es concreto: **que nadie pueda hacerse pasar por otro, ver un DNI ajeno ni alterar el registro sin dejar rastro**. Todo lo demás es proporcionado.

## 14.2 Especificación

| ID | Control | Cómo se implementa | Cómo se verifica |
|---|---|---|---|
| SEC-01 | Contraseñas | scrypt con `N=2^17`, `r=8`, `p=1`, sal de 32 bytes y 64 bytes de salida; comparación en tiempo constante | Prueba de hash y de verificación; nunca aparece la contraseña en logs |
| SEC-02 | Sesiones | Token aleatorio de 256 bits, guardado como hash en `sessions`; cookie `HttpOnly`, `Secure`, `SameSite=Lax`; 7 días | Prueba de robo de cookie sin `HttpOnly`: no aplica; prueba de revocación |
| SEC-03 | OAuth | `state` de un solo uso y PKCE; se valida el emisor, el público y el correo verificado | Prueba con `state` repetido y con token de otro cliente |
| SEC-04 | Autorización | Middleware que deniega por defecto; cada ruta declara roles y ámbito | Matriz de permisos automatizada: cada rol contra cada ruta |
| SEC-05 | Entrada | Esquema zod por ruta; campos desconocidos rechazados; límites de longitud | Pruebas de contrato con casos inválidos |
| SEC-06 | Fuerza bruta | 5 intentos por minuto por IP y correo; retardo creciente; mensaje genérico | Prueba de 20 intentos: bloqueo y mensaje sin filtrar si el correo existe |
| SEC-07 | Cabeceras | CSP `default-src 'self'`; `frame-ancestors 'none'`; HSTS; `nosniff`; `Referrer-Policy: no-referrer` | Comprobación en CI sobre la respuesta real |
| SEC-08 | XSS | snabbdom crea nodos, no inyecta HTML; prohibido `innerHTML` | Regla de lint y revisión |
| SEC-09 | CSRF | `SameSite=Lax` y token de doble envío en formularios sensibles | Prueba de petición cruzada |
| SEC-10 | Secretos | Variables de entorno; nunca en el repositorio; rotación documentada | Revisión de secretos en CI |
| SEC-11 | Dependencias | `npm audit` en CI; bloqueo de vulnerabilidades altas; versiones fijadas | Etapa de CI obligatoria |
| SEC-12 | QR | Token de 128 bits, guardado como hash, de un solo uso y caducidad según el evento | Prueba de reutilización y de caducidad |
| SEC-13 | Auditoría | Solo anexión, con hash encadenado; verificación por comando | Comando `audit:verify` que detecta una fila alterada |
| SEC-14 | Copias | Cifradas con age; fuera del servidor | Restauración cronometrada antes del evento |
| SEC-15 | Errores | Mensajes que no revelan si un correo existe ni detalles internos | Revisión de las respuestas de error |
| SEC-16 | Logs | JSON con identificador de petición; sin correo, DNI, token ni contraseña | Revisión de una muestra de logs en CI |
| SEC-17 | Recuperación | Enlace de 128 bits guardado como hash, un solo uso, 30 minutos, límite de 3 peticiones por hora y cuenta, y misma respuesta exista o no el correo | Prueba de reutilización, caducidad y de dos correos con la misma respuesta |
| SEC-17 | Descarga de imágenes | Solo se aceptan direcciones cuyo host sea `cf.geekdo-images.com`; límite de tamaño y de redirecciones; sin seguir a otros dominios | Prueba con una URL externa: rechazada |

## 14.3 Lo que queda fuera y por qué

| No se hace | Motivo |
|---|---|
| Doble factor | Añade fricción a voluntarios y a un evento de un fin de semana; el riesgo no lo justifica. |
| Cifrado de toda la base de datos | Solo el DNI es sensible; el resto se protege con permisos y copias cifradas. |
| WAF o protección anti-DDoS dedicada | El VPS y el proxy ya absorben lo razonable para este tamaño. |
| Auditoría de seguridad externa | Coste desproporcionado; se sustituye por la matriz de permisos automatizada y la revisión de dependencias. |
| Registro de IP | No aporta para el objetivo y complica el cumplimiento. |

# 15. Arquitectura

## 15.1 Vista general

```
   Móvil del jugador            Tablet del mostrador
   (PWA instalable)             (PWA, modo mostrador)
          │                              │
          └────────── HTTPS ─────────────┘
                         │
                ┌────────▼─────────┐
                │  Hono (Node 24)  │  API REST + estáticos
                │  rutas · zod     │
                └────────┬─────────┘
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
  ┌─────▼─────┐   ┌──────▼──────┐   ┌──────▼───────┐
  │  Dominio  │   │  Consultas  │   │  Adaptadores │
  │  (puro)   │   │  (lectura)  │   │  CSV, imágs. │
  └─────┬─────┘   └──────┬──────┘   └──────────────┘
        └────────┬───────┘
          ┌──────▼───────┐
          │   SQLite     │  datos + auditoría
          │   (WAL)      │
          └──────────────┘
```

Un proceso, un contenedor, un fichero de base de datos y un proxy con TLS. No hay servidor de base de datos que administrar, ni colas, ni microservicios.

## 15.2 Elección de la base de datos

Pediste el análisis. Estos son los números del sistema y la comparación:

**Volumen real:** 600 juegos, 10.000 cuentas, 5.000 préstamos por evento, 10.000 asientos de auditoría. En total, menos de 50 MB al año. **Escrituras:** 5 por segundo en el peor minuto. **Lecturas:** unas 50 por segundo.

| Criterio | SQLite | PostgreSQL | MariaDB | MongoDB |
|---|---|---|---|---|
| Instalación y operación | Ninguna: un fichero | Servidor, usuarios, `VACUUM`, actualizaciones | Servidor y configuración | Servidor y configuración |
| Copia de seguridad | Copiar un fichero o `VACUUM INTO` | `pg_dump` y restauración | `mysqldump` | `mongodump` |
| Concurrencia de escritura | Un escritor a la vez; lecturas simultáneas con WAL | Muchos escritores | Muchos escritores | Muchos escritores |
| ¿Aguanta este volumen? | Sí, con dos órdenes de magnitud de margen | Sí, de sobra | Sí, de sobra | Sí |
| Coste de mantenimiento | Mínimo | Medio | Medio | Medio |
| Transacciones y SQL | Sí | Sí | Sí | No |
| Encaje con el proyecto | **Alto** | Bajo: sobredimensionado | Bajo | Bajo: no hay documentos |

**Decisión: SQLite en modo WAL.** Con un solo evento abierto a la vez y 5 escrituras por segundo, el límite de un escritor no se toca nunca. A cambio, el sysop no administra ningún servidor de base de datos, la copia es copiar un fichero y la instalación es un contenedor.

**Salida si el sistema crece:** todo el acceso a datos está detrás de un repositorio con SQL estándar; migrar a PostgreSQL es cambiar el adaptador y el `docker-compose`, no la lógica. Se revisará si algún día hay varios eventos simultáneos o más de 50 escrituras por segundo sostenidas.

## 15.3 Event Sourcing: por qué no

El documento original lo pedía. Con el alcance de esta versión no se sostiene:

- Hay **un solo agregado con reglas** (el préstamo) y tres transiciones.
- No se necesita reconstruir estados pasados: el historial se lee de la propia tabla de préstamos.
- 5.000 préstamos por evento generan 15.000 asientos que no aportan nada frente a 5.000 filas con dos marcas de tiempo.
- El coste no es escribir el libro: es mantener proyecciones, migraciones por reconstrucción y un modelo mental que un voluntario no va a tener en la cabeza en marzo.

**Lo que se conserva del espíritu original:** una tabla de auditoría de solo anexión, con hash encadenado, que registra cada operación con su actor y su hora, y que no se puede alterar sin que se note. Es el 10 % del coste y cubre el 100 % de la necesidad real: saber quién hizo qué.

Si en el futuro se quiere Event Sourcing de verdad, las reglas del capítulo 8 no cambian: solo cambia dónde se guardan los hechos.

## 15.4 Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Runtime | Node.js 24 LTS | Estable, en soporte, sin sorpresas |
| Correo | **SMTP del proveedor** | Solo recuperación; sin SDK propio, con el transporte que ya trae el runtime o `nodemailer` |
| HTTP | **Hono 4** | Funciones y composición, sin clases; validación con zod; 14 kB |
| Validación | zod | Un esquema por ruta; el mismo esquema valida y documenta |
| Base de datos | **`node:sqlite`** (incluido en Node) | Sin dependencias nativas ni compilación en Docker |
| Contraseñas | `node:crypto` scrypt | Sin dependencias nativas; algoritmo recomendado |
| Interfaz | **snabbdom** + **Fomantic-UI** | Nodos virtuales y el lenguaje visual pedido, sin jQuery en nuestro código |
| Empaquetado | esbuild | Un comando, sin configuración |
| Pruebas | `node:test` + `c8` | Incluidos en Node; sin framework que mantener |
| Navegador de pruebas | Playwright | Cinco flujos de extremo a extremo |
| Proxy | Caddy | TLS automático y cero configuración |

## 15.5 Comparativa de framework HTTP

| Criterio | Express 5 | Fastify 5 | Hono 4 |
|---|---|---|---|
| Estilo | Callbacks y middleware con estado | Plugins encapsulados, decoradores | Funciones puras, composición |
| ¿Necesita `new` o `this`? | No, pero su ecosistema sí lo usa | No, pero los plugins usan objetos con estado | No |
| Validación integrada | No | Sí (JSON Schema) | Sí (zod) |
| Tamaño | Medio | Medio | Muy pequeño |
| Encaje con «sin clases» | Bajo | Medio | **Alto** |

Se elige Hono. Express sigue siendo válido, pero su modelo de middleware obliga a estado compartido y a comprobar a mano lo que aquí se declara en el esquema.

## 15.6 Estructura del código

```
src/
  domain/          reglas puras: estados, préstamo, evento, juego
  app/             casos de uso: solicitar, entregar, devolver, cerrar
  infra/           sqlite, repositorios, csv, imágenes, correo, hash, sesiones
  http/            rutas Hono, esquemas zod, middleware de permisos
  web/             interfaz: vistas snabbdom, estilos, textos es.json
  bootstrap/       arranque y composición (único sitio con efectos)
test/
```

Regla de dependencia: `domain` no importa nada; `app` importa `domain`; `infra` y `http` importan `app`; `bootstrap` importa todo. `class`, `new` y `this` están prohibidos en `domain` y `app`, y se comprueba con lint.

## 15.7 Despliegue

| Pieza | Decisión |
|---|---|
| Contenedores | `app` (Node 24) y `proxy` (Caddy). La base de datos es un volumen. |
| Servidor | VPS de 1 vCPU y 2 GB, 6–10 €/mes |
| Configuración | Variables de entorno en `.env`, fuera del repositorio |
| Datos | **Volumen Docker fuera del contenedor**: `/srv/ludoteca/data` montado en `/data`. Dentro viven `ludoteca.db`, `ludoteca.db-wal` y `images/`. Recrear o actualizar el contenedor no toca el dato. |
| Copias | `VACUUM INTO` diario sobre `/data`, cifrado con age, descargado a almacenamiento externo |
| CI/CD | Lint, tipos, pruebas, cobertura, contrato, e2e; imagen Docker al etiquetar |
| Monitorización | `/health` cada 5 minutos desde fuera; el fallo se ve en el panel del administrador |

## 15.8 Decisiones de arquitectura

| ID | Decisión | Alternativa descartada | Consecuencia |
|---|---|---|---|
| ADR-001 | Tablas de estado + auditoría encadenada | Event Sourcing con CQRS | Menos código y menos mantenimiento; se pierde la reconstrucción temporal, que no se necesita |
| ADR-002 | SQLite con WAL | PostgreSQL | Un fichero, sin servidor; techo de escritura más bajo, lejos del uso real |
| ADR-003 | Hono | Express, Fastify | Sin clases ni estado compartido; ecosistema más pequeño |
| ADR-004 | CSV de BGG como vía principal | Scraping o API | Fiable y sin trámite; manual y sin imágenes |
| ADR-005 | Fomantic-UI | Semantic UI | Mantenimiento; mismas clases |
| ADR-006 | ESLint plano con reglas de Google | `eslint-config-google` | El paquete oficial está archivado; asumimos las reglas |
| ADR-007 | JavaScript con JSDoc y `checkJs` | TypeScript | Sin compilación; menos garantías de tipo |
| ADR-008 | Sesiones opacas en base de datos | JWT | Revocación inmediata; una consulta más por petición |
| ADR-009 | scrypt de `node:crypto` | argon2id | Sin dependencia nativa; configuración equivalente en seguridad práctica |
| ADR-010 | Token QR aleatorio guardado como hash | JWT firmado en el QR | Un solo uso y caducidad reales; una fila por solicitud |
| ADR-011 | Una caja, un registro | Un registro con contador | Trazabilidad por ejemplar; los duplicados se numeran |
| ADR-012 | Sin modo sin conexión | PWA con cola local | Mucho menos código; se asume red en el recinto |
| ADR-013 | Imágenes por API de BGG con token | CSV ampliado o sin imágenes | Requiere el trámite de registro; a cambio, el catálogo es reconocible de un vistazo |
| ADR-014 | Sin etiquetas QR en las cajas | Etiqueta por caja | Ahorra horas de trabajo y depende de algo que hoy no existe; la devolución va por el jugador |
| ADR-015 | Correo solo para recuperar la contraseña | Sin correo o correo completo | Desbloquea las cuentas locales sin depender de un rebote; asume un proveedor y tres registros DNS |

# 16. Calidad y pruebas

## 16.1 Cómo se trabaja

Ciclo rojo-verde-refactor: primero la prueba que falla, después el código que la hace pasar, después la limpieza. No se acepta código de aplicación sin prueba; se exceptúan configuración, estilos y textos.

## 16.2 Cobertura

El criterio es el que pediste: **el 90 % del código debe estar cubierto al menos por una prueba**. Se mide sobre líneas y se aplica como puerta de integración continua.

| Ámbito | Umbral | Nota |
|---|---|---|
| `src/domain` | 95 % | Aquí están las reglas; un fallo cuesta un juego |
| `src/app` | 90 % | Casos de uso |
| `src/http` | 85 % | Rutas y permisos, con pruebas de contrato |
| `src/infra` | 80 % | Repositorios contra una base SQLite real |
| **Total** | **90 %** | Puerta de CI |

No se persigue el 100 %: las ramas de error de la red y de los ficheros se prueban con dobles y no aportan cobertura real.

## 16.3 Niveles

| Nivel | Qué cubre | Herramienta | Cantidad orientativa |
|---|---|---|---|
| Unidad | Estados, reglas, cálculo de franjas, máscara de DNI | `node:test` | 180 |
| Integración | Repositorios, transacciones, auditoría, QR de un solo uso | `node:test` + SQLite en memoria o fichero temporal | 50 |
| Contrato | Cada ruta contra el `openapi.yaml` | Schemathesis | Todas |
| Extremo a extremo | Registro, solicitud, entrega, devolución, cierre | Playwright | 5 |
| Carga | Hora punta y conflicto de entregas | k6 | 2 escenarios |
| Usabilidad | Cinco personas reales | Protocolo manual | 5 |

Los cinco flujos de extremo a extremo son el corazón: si uno falla, no se despliega.

## 16.4 Pruebas que no se pueden saltar

1. Dos entregas simultáneas del mismo juego: una gana y la otra recibe `GAME_NOT_AVAILABLE`.
2. QR usado dos veces: el segundo intento se rechaza.
3. QR caducado: rechazado.
4. Devolución con el evento cerrado: aceptada.
5. Solicitud con evento cerrado: rechazada con la próxima franja.
6. Jugador con préstamo activo que pide otro: rechazado con el préstamo que debe devolver.
7. Cambio de hora de marzo y de octubre: las franjas abren una sola vez.
8. Dos eventos con franjas solapadas: solo uno se abre.
9. Importación con juego prestado: bloqueada.
10. Lectura del DNI por un controlador: `***123X`.
11. Corrección de préstamo sin motivo: rechazada.
12. Cadena de auditoría alterada: el comando de verificación lo detecta.

## 16.5 Lint que hace cumplir la arquitectura

| Regla | Impide | Ámbito |
|---|---|---|
| `no-restricted-syntax` (`ClassDeclaration`) | Clases | `src/domain`, `src/app` |
| `no-restricted-syntax` (`NewExpression`) | `new` | `src/domain`, `src/app` |
| `no-restricted-syntax` (`ThisExpression`) | `this` | `src/domain`, `src/app` |
| `no-restricted-imports` | Frameworks y SQL en el núcleo | `src/domain` |
| `no-restricted-properties` (`innerHTML`) | Inyección de HTML | `src/web` |
| `max-lines` (300) | Módulos inmanejables | `src/**` |
| `jsdoc/require-jsdoc` | Funciones exportadas sin contrato | `src/**` |

Configuración plana con las reglas de Google replicadas: dos espacios, punto y coma, comillas simples, 100 columnas.

## 16.6 Integración continua

| Etapa | Comprobación | Bloquea |
|---|---|---|
| 1 | ESLint | Sí |
| 2 | `tsc --checkJs` sobre JSDoc | Sí |
| 3 | Pruebas unitarias y de integración con cobertura | Sí |
| 4 | Contrato OpenAPI | Sí |
| 5 | `npm audit` y revisión de secretos | Sí |
| 6 | Extremo a extremo sobre la imagen construida | Sí |
| 7 | Imagen Docker y etiqueta | Sí |

## 16.7 Definición de hecho

Un requisito está hecho cuando tiene prueba, cumple su criterio de aceptación, está reflejado en este documento, pasa la revisión y no deja deuda sin registrar.

## 16.8 Revisión de código

Siete preguntas, citadas por el revisor: ¿hay prueba que falla sin el cambio? ¿la función hace una cosa y se llama como lo que hace? ¿los efectos están en el borde? ¿el error dice qué hacer? ¿se lee en una tablet a plena luz? ¿registra algo que no debe? ¿añade una decisión nueva sin ADR?

# 17. Estadísticas

## 17.1 Qué cuenta como uso

Un préstamo cuenta cuando fue entregado y devuelto, y estuvo fuera al menos el umbral configurado (por defecto, 10 minutos). Un préstamo devuelto a los dos minutos es un error de mostrador, no una partida. Los préstamos cerrados por cierre forzoso se cuentan aparte y se marcan como tales.

## 17.2 Métricas

| ID | Métrica | Fórmula | Granularidad |
|---|---|---|---|
| MET-01 | Préstamos por juego | Préstamos `RETURNED` agrupados por juego | Evento, día, juego |
| MET-02 | Tiempo medio de uso | Media y mediana de `returned_at − delivered_at` | Evento, juego |
| MET-03 | Catálogo utilizado | Juegos con al menos un préstamo ÷ juegos disponibles en el evento | Evento |
| MET-04 | Uso por día y franja | Préstamos por hora del día | Evento, día |
| MET-05 | Jugadores únicos | Personas con al menos un préstamo entregado, contadas por seudónimo | Evento, día |
| MET-06 | Ritmo de entrega | Mediana y p95 del tiempo de operación en el mostrador | Puesto, día |
| MET-07 | Préstamos forzados | Cuántos se cerraron por cierre forzoso | Evento |

## 17.3 Panel de sala

Página **totalmente pública**: se abre `https://…/panel` en un monitor y no pide cuenta ni sesión. No recibe parámetro de evento, porque solo hay uno abierto; si no lo hay, no muestra ninguna lista.

Tres listas, cada una recortada al número de elementos configurado en el evento (5 por defecto):

- **Juegos fuera:** imagen, nombre y tiempo desde la entrega, del que más tiempo lleva al que menos. Si no caben todos en el monitor, se recorta por el final: solo se ven los que más tiempo llevan.
- **Más prestados:** los que más veces han salido, con el número de préstamos.
- **Más jugados:** los que más veces han superado el umbral de uso (el de 17.1: 10 minutos por defecto).

La hora del último refresco se muestra siempre en un extremo, para que nadie confunda un dato viejo con uno actual. Se refresca cada 30 segundos. Sin nombres, sin DNI y sin identificadores de jugador.

## 17.4 Informe del evento

Se genera al cerrar y contiene: total de préstamos, jugadores únicos, juegos distintos usados y porcentaje del catálogo; ranking de los veinte juegos más prestados con su tiempo medio; uso por día y franja; préstamos cerrados a la fuerza; y el ritmo de entrega por puesto. Se exporta a PDF y CSV.

## 17.5 Límites

- Un préstamo no demuestra que se jugara: el umbral de 10 minutos es una aproximación y el informe lo dice.
- Sin imágenes ni categorías en el catálogo, no hay análisis por tipo de juego. Llegará si se integra la API.
- Comparar dos eventos solo tiene sentido si tuvieron duración y catálogo parecidos.

# 18. Despliegue y operación

## 18.1 Puesta en marcha

| Paso | Quién | Comprobación |
|---|---|---|
| Contratar dominio y VPS | Sysop | DNS y TLS funcionando |
| Configurar `.env` y el volumen `/srv/ludoteca/data` | Sysop | El fichero de base de datos y las imágenes viven fuera del contenedor |
| Dar de alta el correo saliente | Sysop | SPF, DKIM y DMARC publicados, y un enlace de recuperación de prueba que llega a la bandeja de entrada |
| Crear la primera cuenta y nombrarla administrador de aplicación | Sysop | Acceso y permisos |
| Importar el catálogo | Adm. aplicación | 600 juegos con imagen |
| Crear el evento y las franjas | Adm. aplicación | Estado y próxima franja correctos |
| Prueba de humo | Adm. aplicación | Registro, solicitud, entrega y devolución con cinco juegos |

## 18.2 Tareas programadas

| Tarea | Frecuencia | Qué hace |
|---|---|---|
| Caducar solicitudes | Cada minuto | Pasa a `CANCELLED` las que superan el bloqueo configurado |
| Abrir y cerrar por franja | Cada minuto | Calcula el estado del evento |
| Copia de seguridad | Diaria, 04:00 | `VACUUM INTO`, cifrado y descarga |
| Verificación de auditoría | Semanal | Recorre la cadena de hashes |
| Limpieza de sesiones | Diaria | Borra las caducadas |
| Limpieza de enlaces | Cada hora | Borra los enlaces de recuperación caducados o usados |

## 18.3 Runbook

| Situación | Acción | Tiempo |
|---|---|---|
| La aplicación no responde | `/health`, reiniciar contenedor, mirar logs | 5 min |
| Error de base de datos | Reiniciar; si persiste, restaurar la copia del día | 30 min |
| Disco lleno | Rotar logs y copias locales | 15 min |
| Certificado caducado | Renovación de Caddy; si falla, renovar a mano | 15 min |
| Restauración | Parar, sustituir el fichero, arrancar, comprobar `/health` y un préstamo de prueba | 30 min |

## 18.4 Durante el evento

- Una persona de guardia con acceso al panel de administración y al servidor, localizable por el canal de la asociación.
- El administrador de evento puede ver en todo momento cuántos juegos están fuera y desde cuándo.
- Si el servidor falla, la aplicación deja de aceptar operaciones y lo dice con claridad; no se inventan datos ni se guardan colas locales.
- Al terminar cada día: comprobar que no hay operaciones a medias, revisar los juegos fuera y cargar las tablets.

## 18.5 Después del evento

1. Cerrar el evento y generar el informe.
2. Copia de seguridad y una restauración de prueba.
3. Revisar el informe con la junta y guardar el PDF y el CSV.
4. Reunión con los controladores: qué falló y qué se pide.
5. Actualizar este documento y las ADR afectadas.

# 19. Plan

## 19.1 Calendario

El evento es en **marzo de 2027**, con día por confirmar. Hay margen para probar en un entorno real antes.

| Fase | Cuándo | Contenido | Puerta de salida |
|---|---|---|---|
| F0 · Preparación | Diciembre 2026 | Repositorio, VPS, dominio, CI, esqueleto de la aplicación | Despliegue automático de una página vacía |
| F1 · Núcleo | Diciembre 2026 | Cuentas, perfiles, roles, eventos y franjas, catálogo por CSV | Un evento se abre y se cierra solo; catálogo importado |
| F2 · Préstamo | Enero 2027 | Solicitud, QR, mostrador, entrega y devolución | Los cinco flujos e2e en verde |
| F3 · Estadísticas y cierre | Enero 2027 | Cierre con juegos fuera, informe y exportaciones | Ciclo completo de un evento de prueba |
| F4 · Prueba real | Febrero 2027 | Sesión en el local o en un evento pequeño con 3 puestos y 20 juegos | Criterios de 19.4 cumplidos |
| F5 · Endurecimiento | Febrero 2027 | Accesibilidad, seguridad, carga, textos y formación | Revisión de permisos y prueba de carga |
| F6 · Evento | Marzo 2027 | Despliegue, formación y guardia | KPIs medidos y evento cerrado |

## 19.2 Estimación

| Concepto | Horas |
|---|---|
| Cuentas, OAuth, perfiles y recuperación por correo | 30 |
| Eventos, franjas y estados | 15 |
| Catálogo, CSV, imágenes y duplicados | 26 |
| Solicitud, entrega y devolución | 35 |
| Mostrador y lector de QR | 20 |
| Estadísticas, panel de sala e informe | 24 |
| Administración, roles, auditoría y listado de usuarios | 20 |
| Interfaz, accesibilidad e imágenes | 34 |
| Pruebas, carga y seguridad | 25 |
| Despliegue y documentación | 16 |
| **Total** | **245 h** |

Con media jornada son unas 11 semanas y media; el calendario de 12 deja un colchón corto. No incluye trabajo de campo: no hay que etiquetar cajas.

## 19.3 Coste

| Concepto | Coste |
|---|---|
| VPS 1 vCPU / 2 GB | 6–10 €/mes |
| Dominio | 12 €/año |
| Correo saliente (solo recuperación) | 0 € en el tramo gratuito |
| Licencias | 0 € |

## 19.4 Criterios para dar el sistema por bueno

Antes del evento: 100 operaciones seguidas sin error en la prueba real; entrega por debajo de 20 segundos de mediana; devolución por debajo de 20 segundos; cinco personas completan el alta sin ayuda; restauración de copia probada y cronometrada.

Después del evento: KPI-01 a KPI-04 medidos y anotados en este documento.

## 19.5 Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Facebook no aprueba la aplicación a tiempo | Media | Bajo | La configuración por evento permite desactivarlo; Google y cuenta local cubren el caso |
| El CSV de BGG cambia de formato | Baja | Medio | El importador exige solo dos columnas y avisa con el detalle del error |
| La cámara de las tablets no lee bien los QR | Media | Alto | Prueba en la fase F4 con las tablets reales; alternativa de búsqueda por nombre |
| La wifi del recinto no cubre el mostrador | Media | Alto | Prueba de cobertura el día anterior; router 4G de respaldo |
| El día del evento coincide con otro acto | Baja | Medio | Solo un evento abierto a la vez por diseño |
| Una sola persona sabe mantenerlo | Alta | Medio | Documentación, ADR y sesión de traspaso al sysop |
| Los voluntarios no practican | Media | Medio | Formación de 15 minutos y tarjeta plastificada por puesto |

# 20. Mejoras futuras

Nada de lo que sigue está en el alcance de esta versión. Se anota para no perderlo y, sobre todo, para que las decisiones de hoy no lo impidan mañana.

| Mejora | Qué aportaría | Por qué no está ahora |
|---|---|---|
| Avisos por correo | Recordatorio de devolución, resumen diario al administrador, aviso de cierre | El canal ya está montado para la recuperación; faltan plantillas y decidir qué se avisa |
| Etiqueta QR en las cajas | Devolución en dos segundos sin buscar el nombre | No hay un sistema de etiquetado fiable y son horas de trabajo de campo |
| Cola de espera | Que quien quiere un juego prestado reciba aviso al liberarse | Añade avisos, caducidades y una pantalla más; el evento es corto |
| Reserva anticipada | Reservar desde casa antes del evento | Trae no-shows y bloqueo de inventario |
| Plazo de devolución y prórrogas | Control del tiempo de uso y devoluciones tardías | Requiere política, avisos y discusión sobre sanciones |
| Incidencias, piezas y recuento | Saber qué juego ha vuelto incompleto o dañado | Aceptar el juego se consideró revisión suficiente |
| Más datos de BGG | Imagen grande, número de jugadores, duración y categorías en la ficha | La API ya se usa para la miniatura; ampliar campos es barato pero suma trabajo de interfaz |
| Sincronización automática del catálogo | Importar sin intervención cada semana | Depende del token y de que la API siga abierta; hoy el CSV es suficiente |
| Varios eventos simultáneos | Dos ferias a la vez con inventarios distintos | Hoy solo puede haber uno abierto; el modelo tendría que cambiar de ámbito |
| Traducción de la interfaz | Valenciano o inglés | Los textos ya están en un fichero único; falta la traducción, no la estructura |
| Segundo factor | Proteger mejor las cuentas de administración | Fricción innecesaria para el tamaño actual |
| Avisos en el móvil | Notificaciones push sin abrir la aplicación | Requiere service worker y permisos; la web instalable ya cubre el uso |
| Histórico y comparativa en el panel | Ver la evolución entre eventos | El panel está pensado para la sala, no para el análisis |
| Fianzas o sanciones | Cubrir pérdidas | Decisión de la asociación, no técnica |

Tres de estas mejoras cambian el modelo de datos y conviene tenerlas presentes: la **cola de espera** (tabla nueva), el **plazo de devolución** (campos de vencimiento en el préstamo) y el **multi-evento** (ámbito por evento en casi todas las tablas). Las demás son añadidos que no rompen lo construido.

El orden que tendría más sentido, si hay un segundo evento: primero las etiquetas QR y los avisos por correo —que son las dos que más tiempo ahorran en el mostrador—, después la cola de espera, y solo más tarde los plazos y las incidencias.

# Anexo A · Registro de decisiones (ADR)

Cada decisión se mantiene mientras no se revise por escrito. Una ADR sustituida se marca, no se borra.

## ADR-001 · Tablas de estado y auditoría, sin Event Sourcing

- **Contexto.** El documento original pedía Event Sourcing con CQRS. El alcance final tiene un solo agregado con reglas y tres transiciones.
- **Decisión.** Tablas de estado (`loans`, `games`, `events`) más una tabla de auditoría de solo anexión con hash encadenado.
- **Alternativa.** Libro de eventos con proyecciones: 15.000 asientos por evento, reconstrucción y migraciones por replay.
- **Consecuencia.** Menos código que mantener y ninguna consulta que dependa de reconstruir. Se pierde la posibilidad de reconstruir el estado en una fecha pasada; el historial de préstamos y la auditoría cubren las preguntas reales.

## ADR-002 · SQLite con WAL

- **Contexto.** 50 MB al año, 5 escrituras por segundo en el pico y una sola persona administrando.
- **Decisión.** SQLite en modo WAL, con `node:sqlite` incluido en Node.
- **Alternativa.** PostgreSQL: un servidor más que actualizar, copiar y vigilar, para un volumen que no lo pide.
- **Consecuencia.** Copia de seguridad = copiar un fichero; instalación = un contenedor. Un solo escritor a la vez, que con este volumen no se alcanza. La salida a PostgreSQL está aislada en el repositorio.

## ADR-003 · Hono en lugar de Express

- **Contexto.** Se prohíben `class`, `new` y `this` en el código propio; Express arrastra un modelo de middleware con estado compartido.
- **Decisión.** Hono 4 con validación zod.
- **Alternativa.** Express 5 (maduro, ecosistema enorme) y Fastify (más rápido, plugins con estado).
- **Consecuencia.** Rutas como funciones, composición clara y 14 kB de dependencia. Ecosistema más pequeño y menos ejemplos en foros.

## ADR-004 · Catálogo por CSV

- **Contexto.** El acceso automatizado a BGG devuelve 403 de Cloudflare y la API exige token con aprobación.
- **Decisión.** Importación por el CSV que el propio BGG exporta; la API queda como mejora opcional.
- **Alternativa.** Scraper (bloqueado) o API desde el primer día (depende de una aprobación externa).
- **Consecuencia.** El catálogo se actualiza a mano cuando cambia. A cambio, el sistema no depende de un tercero para arrancar y no hay imágenes en el MVP.

## ADR-005 · Fomantic-UI

- **Contexto.** Semantic UI no tiene desarrollo activo.
- **Decisión.** Fomantic-UI, el fork mantenido, con las mismas clases.
- **Alternativa.** Semantic UI congelado; Tailwind; Bootstrap.
- **Consecuencia.** Se conserva el lenguaje visual pedido. Algunos módulos siguen necesitando jQuery; no se usan: solo CSS y nuestros propios componentes.

## ADR-006 · Configuración plana de ESLint

- **Contexto.** `eslint-config-google` está archivado desde el 1 de junio de 2026 y no tiene equivalente en configuración plana.
- **Decisión.** Configuración propia con las reglas equivalentes.
- **Alternativa.** Quedarse en ESLint 8 con el paquete congelado.
- **Consecuencia.** Mantenemos las reglas y las actualizamos con el lenguaje.

## ADR-007 · JavaScript con JSDoc y `checkJs`

- **Contexto.** Se pide JavaScript; conviene detectar errores antes de ejecutar.
- **Decisión.** JSDoc en las funciones públicas y comprobación de tipos en CI.
- **Alternativa.** TypeScript: más garantías, un paso de compilación y un lenguaje distinto del pedido.
- **Consecuencia.** Menos seguridad de tipos que TypeScript. A cambio, el código que se ejecuta es el que se lee.

## ADR-008 · Sesiones opacas en base de datos

- **Contexto.** Hay que poder expulsar a alguien al retirarle un rol.
- **Decisión.** Token aleatorio de 256 bits, guardado como hash, con caducidad y revocación.
- **Alternativa.** JWT: sin consulta por petición, pero revocación complicada.
- **Consecuencia.** Una consulta indexada por petición autenticada. A cambio, retirar un rol surte efecto inmediato.

## ADR-009 · scrypt en lugar de argon2id

- **Contexto.** argon2id exige una dependencia nativa que hay que compilar en la imagen.
- **Decisión.** `crypto.scrypt` con `N=2^17`, `r=8`, `p=1` y sal de 32 bytes.
- **Alternativa.** argon2id (algo mejor en teoría) o bcrypt (peor).
- **Consecuencia.** Sin dependencias nativas y con parámetros equivalentes en la práctica. El coste por inicio de sesión ronda 300 ms, aceptable con 5 intentos por minuto.

## ADR-010 · Token QR aleatorio, no firmado

- **Contexto.** El QR se enseña en una pantalla y debe servir una sola vez.
- **Decisión.** 128 bits aleatorios, guardados como hash, con la caducidad del evento y marca de uso.
- **Alternativa.** JWT firmado dentro del QR: no se puede invalidar tras el primer uso.
- **Consecuencia.** Una fila por solicitud y una comprobación por escaneo. Garantiza el «un solo uso» que un JWT no da.

## ADR-011 · Una caja, un registro

- **Contexto.** El documento no aclaraba si un título con dos copias es uno o dos registros.
- **Decisión.** Cada copia física tiene su fila y su etiqueta de ejemplar; los duplicados se numeran.
- **Alternativa.** Un registro por título con contador de ejemplares.
- **Consecuencia.** Trazabilidad exacta y devoluciones sin ambigüedad. El catálogo muestra «Catan (2)» cuando hay dos cajas.

## ADR-012 · Sin funcionamiento sin conexión

- **Contexto.** Se asume red en el recinto y el sistema no es crítico.
- **Decisión.** Si no hay red, la aplicación lo dice y no acepta operaciones.
- **Alternativa.** Cola local con reconciliación: duplica el código de escritura y obliga a resolver conflictos.
- **Consecuencia.** Menos código y menos estados imposibles. Si la red falla, el mostrador espera; no se registran datos a medias.

## ADR-013 · Imágenes desde la API de BGG

- **Contexto.** El jugador elige mirando; el CSV no trae imágenes y el scraping está bloqueado.
- **Decisión.** Descargar las miniaturas con la API y el token de aplicación, a una petición por segundo, y guardarlas en el volumen de datos.
- **Alternativa.** Sin imágenes, o con una columna `image_url` rellenada a mano.
- **Consecuencia.** El catálogo se reconoce de un vistazo y el servidor no depende de BGG en cada visita. A cambio, hay un trámite previo y una descarga inicial de unos diez minutos.

## ADR-014 · Sin etiquetas QR en las cajas

- **Contexto.** Etiquetar 600 cajas es trabajo de campo y no hay un sistema de etiquetas fiable.
- **Decisión.** La devolución se identifica por el QR del jugador o por el nombre del juego entre los préstamos abiertos.
- **Alternativa.** Etiqueta por caja con QR impreso.
- **Consecuencia.** Cero trabajo previo y ninguna etiqueta que se caiga. A cambio, el controlador teclea parte del nombre cuando el jugador no está delante.


## ADR-015 · Correo solo para recuperar la contraseña

- **Contexto.** Sin correo, una cuenta local sin contraseña solo se arregla a mano en el mostrador. Con verificación de cuenta, un fallo del proveedor deja a alguien sin poder jugar.
- **Decisión.** Un único correo saliente: el enlace de recuperación. Nada de verificación, avisos ni resúmenes.
- **Alternativa.** Sin correo (restablecimiento por un administrador) o correo completo con verificación y avisos.
- **Consecuencia.** Quien escribe mal su correo puede recuperarlo igualmente pidiendo ayuda, y nadie se queda fuera por un rebote. A cambio, una cuenta con correo falso nunca se arregla sola: depende de que haya un administrador disponible.

# Anexo B · Matriz de permisos por endpoint

● permitido · ◐ con condición · — denegado · ○ público sin sesión.

| Método y ruta | Público | Jugador | Controlador | Adm. evento | Analista | Adm. aplicación |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `POST /auth/register` | ○ | — | — | — | — | — |
| `POST /auth/login` | ○ | — | — | — | — | — |
| `POST /auth/logout` | — | ● | ● | ● | ● | ● |
| `GET /auth/google/callback` | ○ | — | — | — | — | — |
| `GET /auth/facebook/callback` | ○ | — | — | — | — | — |
| `POST /auth/password/forgot` | ○ | — | — | — | — | — |
| `POST /auth/password/reset` | ○ | — | — | — | — | — |
| `GET /me` | — | ● | ● | ● | ● | ● |
| `PATCH /me` | — | ● | ● | ● | ● | ● |
| `GET /events/current` | ○ | ● | ● | ● | ● | ● |
| `GET /games` | — | ● | ● | ● | ● | ● |
| `POST /loans` | — | ● | — | ● | — | ● |
| `DELETE /loans/{id}` | — | ● el suyo | — | ● | — | ● |
| `GET /loans/active` | — | ● el suyo | ● | ● | — | ● |
| `POST /loans/{id}/deliver` | — | — | ● | ● | — | — |
| `POST /loans/return` | — | — | ● | ● | — | — |
| `GET /events/{id}/users` | — | — | — | ● | — | ● |
| `GET /panel` | ○ | ● | ● | ● | ● | ● |
| `POST /admin/games/{id}/duplicate` | — | — | — | — | — | ● |
| `POST /admin/games/images/download` | — | — | — | — | — | ● |
| `GET /events/{id}/loans` | — | — | ● | ● | — | ● |
| `POST /events/{id}/close` | — | — | — | ● | — | ● |
| `POST /events/{id}/reopen` | — | — | — | ● | — | ● |
| `PATCH /event-games/{gameId}` | — | — | — | ● | — | ● |
| `GET /audit` | — | — | — | ◐ su evento | — | ● |
| `POST /audit/verify` | — | — | — | — | — | ● |
| `GET /stats/{eventId}` | — | — | — | ● | ● | ● |
| `GET /stats/{eventId}/export.csv` | — | — | — | ● | ● | ● |
| `POST /admin/roles` | — | — | — | ◐ controladores | — | ● |
| `POST /admin/events` | — | — | — | — | — | ● |
| `PUT /admin/events/{id}` | — | — | — | — | — | ● |
| `POST /admin/events/{id}/catalog/import` | — | — | — | — | — | ● |
| `POST /admin/games` | — | — | — | — | — | ● |
| `PATCH /admin/games/{id}` | — | — | — | — | — | ● |
| `GET /health` | ○ | ● | ● | ● | ● | ● |

# Anexo C · Esquema de la base de datos

SQLite, con claves foráneas activas y WAL. Los identificadores son UUID v7 en texto; las fechas, ISO 8601 en UTC.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash     TEXT,                         -- scrypt: sal$hash
  google_sub        TEXT UNIQUE,
  facebook_sub      TEXT UNIQUE,
  first_name        TEXT,
  last_name         TEXT,
  dni_encrypted     BLOB,                         -- AES-256-GCM
  dni_masked        TEXT,                         -- ***123X
  adult_confirmed_at TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT,
  CHECK (google_sub IS NOT NULL OR facebook_sub IS NOT NULL OR password_hash IS NOT NULL)
);

CREATE TABLE email_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  BLOB NOT NULL UNIQUE,
  purpose     TEXT NOT NULL DEFAULT 'reset' CHECK (purpose IN ('reset')),
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX email_tokens_user ON email_tokens (user_id, expires_at);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL CHECK (role IN ('player','controller','event_admin','analyst','app_admin')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  token_hash  BLOB NOT NULL UNIQUE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT,
  user_agent  TEXT
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE events (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  description         TEXT,
  instructions        TEXT,
  privacy_policy      TEXT,
  starts_at           TEXT NOT NULL,
  ends_at             TEXT NOT NULL,
  timezone            TEXT NOT NULL DEFAULT 'Europe/Madrid',
  allow_local         INTEGER NOT NULL DEFAULT 1,
  allow_google        INTEGER NOT NULL DEFAULT 0,
  allow_facebook      INTEGER NOT NULL DEFAULT 0,
  request_ttl_minutes INTEGER NOT NULL DEFAULT 15 CHECK (request_ttl_minutes BETWEEN 1 AND 120),
  panel_loans_limit   INTEGER NOT NULL DEFAULT 5 CHECK (panel_loans_limit BETWEEN 1 AND 20),
  panel_ranking_limit INTEGER NOT NULL DEFAULT 5 CHECK (panel_ranking_limit BETWEEN 1 AND 20),
  manual_closed_until TEXT,
  created_by          TEXT REFERENCES users(id),
  created_at          TEXT NOT NULL,
  CHECK (ends_at > starts_at),
  CHECK (allow_local + allow_google + allow_facebook >= 1)
);

CREATE TABLE time_slots (
  id        TEXT PRIMARY KEY,
  event_id  TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  ends_at   TEXT NOT NULL,
  CHECK (ends_at > starts_at)
);
CREATE INDEX slots_event ON time_slots(event_id, starts_at);

CREATE TABLE games (
  id         TEXT PRIMARY KEY,
  bgg_id     TEXT,                    -- no único: dos copias comparten título
  name       TEXT NOT NULL,
  year       INTEGER,
  copy_label TEXT,                    -- "2" para la segunda copia
  image_path TEXT,                    -- /data/images/<bgg_id>.jpg (compartida entre copias)
  image_status TEXT NOT NULL DEFAULT 'pending'
               CHECK (image_status IN ('pending','ok','none','error')),
  retired    INTEGER NOT NULL DEFAULT 0,
  notes      TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX games_bgg ON games(bgg_id);
CREATE INDEX games_name ON games(name COLLATE NOCASE);

CREATE TABLE event_games (
  event_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  game_id      TEXT NOT NULL REFERENCES games(id),
  blocked      INTEGER NOT NULL DEFAULT 0,
  block_reason TEXT,
  manually_lent INTEGER NOT NULL DEFAULT 0,
  updated_by   TEXT REFERENCES users(id),
  updated_at   TEXT,
  PRIMARY KEY (event_id, game_id)
);

CREATE TABLE loans (
  id           TEXT PRIMARY KEY,
  event_id     TEXT NOT NULL REFERENCES events(id),
  game_id      TEXT NOT NULL REFERENCES games(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  status       TEXT NOT NULL CHECK (status IN ('REQUESTED','DELIVERED','RETURNED','CANCELLED')),
  requested_at TEXT NOT NULL,
  delivered_at TEXT,
  delivered_by TEXT REFERENCES users(id),
  returned_at  TEXT,
  returned_by  TEXT REFERENCES users(id),
  closed_reason TEXT,                 -- forced_close | player_cancel | expired | correction
  corrected    INTEGER NOT NULL DEFAULT 0,
  version      INTEGER NOT NULL DEFAULT 1,
  CHECK (delivered_at IS NULL OR delivered_at >= requested_at),
  CHECK (returned_at IS NULL OR delivered_at IS NOT NULL)
);

-- Una sola entrega viva por juego y por jugador (INV-01, INV-02)
CREATE UNIQUE INDEX loans_one_delivered_per_game
  ON loans(game_id) WHERE status = 'DELIVERED';
CREATE UNIQUE INDEX loans_one_active_per_user
  ON loans(user_id) WHERE status IN ('REQUESTED','DELIVERED');

CREATE INDEX loans_event ON loans(event_id, status);
CREATE INDEX loans_user ON loans(user_id, requested_at);

CREATE TABLE qr_tokens (
  token_hash BLOB PRIMARY KEY,
  loan_id    TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);
CREATE INDEX qr_loan ON qr_tokens(loan_id);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id   TEXT REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  data       TEXT,
  created_at TEXT NOT NULL,
  prev_hash  BLOB,
  hash       BLOB NOT NULL
);
CREATE INDEX audit_entity ON audit_log(entity, entity_id);
CREATE INDEX audit_created ON audit_log(created_at);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Dos detalles que evitan clases enteras de errores: los índices únicos parciales impiden dos entregas vivas del mismo juego y dos préstamos vivos del mismo jugador **en la base de datos**, no solo en el código; y la auditoría no tiene `UPDATE` ni `DELETE` en ningún repositorio.

# Anexo D · Contrato OpenAPI

Fragmento con las tres operaciones centrales; el contrato completo está en `openapi.yaml`.

```yaml
openapi: 3.1.0
info:
  title: Ludoteca API
  version: 2.0.0
servers:
  - url: https://ludoteca.example/api/v1
paths:
  /loans:
    post:
      summary: Solicita un juego
      security: [{ sessionCookie: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [gameId]
              additionalProperties: false
              properties:
                gameId: { type: string, format: uuid }
      responses:
        "201":
          description: Solicitud creada con su QR
          content:
            application/json:
              schema:
                type: object
                properties:
                  loan: { $ref: "#/components/schemas/Loan" }
                  qrCode: { type: string, description: "Token que se dibuja como QR" }
                  expiresAt: { type: string, format: date-time }
        "409": { $ref: "#/components/responses/Conflict" }
  /loans/{id}/deliver:
    post:
      summary: Entrega el juego escaneando el QR del jugador
      security: [{ sessionCookie: [] }]
      parameters:
        - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [qrCode]
              additionalProperties: false
              properties:
                qrCode: { type: string, minLength: 20 }
      responses:
        "200":
          description: Entregado
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Loan" }
        "409": { $ref: "#/components/responses/Conflict" }
        "403": { $ref: "#/components/responses/Forbidden" }
  /loans/return:
    post:
      summary: Devuelve el juego de un jugador
      security: [{ sessionCookie: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [playerQr]
              additionalProperties: false
              properties:
                playerQr: { type: string, description: "QR del jugador o identificador del préstamo" }
                loanId: { type: string, format: uuid }
      responses:
        "200":
          description: Devuelto
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Loan" }
        "404": { $ref: "#/components/responses/Conflict" }
components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: ludoteca_session
  schemas:
    Loan:
      type: object
      required: [id, status, game, player, requestedAt]
      properties:
        id: { type: string, format: uuid }
        status: { enum: [REQUESTED, DELIVERED, RETURNED, CANCELLED] }
        game: { type: object, properties: { id: { type: string }, name: { type: string } } }
        player: { type: object, properties: { id: { type: string }, name: { type: string } } }
        requestedAt: { type: string, format: date-time }
        deliveredAt: { type: string, format: date-time, nullable: true }
        returnedAt: { type: string, format: date-time, nullable: true }
        version: { type: integer }
    Problem:
      type: object
      required: [type, title, status, code]
      properties:
        type: { type: string }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        code: { type: string, example: GAME_NOT_AVAILABLE }
  responses:
    Conflict:
      description: Regla de negocio incumplida
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
    Forbidden:
      description: Sin permiso
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
```

Códigos de error estables: `EVENT_CLOSED`, `GAME_NOT_AVAILABLE`, `LOAN_ALREADY_ACTIVE`, `ADULT_REQUIRED`, `PROFILE_INCOMPLETE`, `QR_INVALID`, `QR_EXPIRED`, `QR_ALREADY_USED`, `GAME_ON_LOAN`, `FORBIDDEN`, `IMPORT_BLOCKED`.

# Anexo E · Listas de comprobación

## E.1 Antes del evento

**T-14 días**
- [ ] Catálogo importado y revisado (nombres, duplicados, juegos sin QR).
- [ ] Imágenes descargadas; ningún juego sin miniatura salvo los que no están en BGG.
- [ ] Evento creado con sus franjas y revisado en el calendario.
- [ ] Juegos añadidos al evento y bloqueos aplicados.

**T-7 días**
- [ ] Controladores nombrados y con acceso probado.
- [ ] Tablets configuradas con la aplicación instalada y la sesión iniciada.
- [ ] Prueba de humo completa con cinco juegos.
- [ ] Restauración de una copia de seguridad, cronometrada.

**T-1 día**
- [ ] Wifi comprobada en el mostrador; router 4G cargado.
- [ ] Tablets y baterías externas cargadas.
- [ ] Carteles con el QR de la aplicación impresos.
- [ ] Persona de guardia confirmada.

## E.2 Durante el evento

**Al abrir**
- [ ] Comprobar que el evento figura Abierto en dos puestos distintos.
- [ ] Verificar que un jugador de prueba ve el catálogo.

**En cada relevo**
- [ ] Revisar la lista de juegos fuera y su hora de salida.
- [ ] Comprobar que la tablet tiene red y batería.

**Al cerrar el día**
- [ ] Cerrar el evento a la hora prevista.
- [ ] Anotar los juegos que quedan fuera.

## E.3 Después del evento

- [ ] Cerrar el evento y revisar el aviso de juegos fuera.
- [ ] Generar el informe y guardar el PDF y el CSV.
- [ ] Copia de seguridad y restauración de prueba.
- [ ] Enviar un enlace de recuperación de prueba y comprobar que llega a la bandeja de entrada, no a spam.
- [ ] Comprobar que el panel de sala carga en el monitor sin sesión.
- [ ] Reunión con controladores y actualización de este documento.

# Anexo F · Catálogo de pruebas

| ID | Caso | Resultado esperado |
|---|---|---|
| T-01 | Registro con correo nuevo | Cuenta creada y sesión iniciada |
| T-02 | Registro con correo existente | Error que ofrece iniciar sesión |
| T-03 | Acceso con Google permitido | Cuenta vinculada por correo |
| T-04 | Acceso con Google desactivado en el evento | Botón oculto y error explicativo |
| T-05 | Solicitud sin perfil completo | `PROFILE_INCOMPLETE` con enlace al perfil |
| T-06 | Solicitud sin declarar mayoría de edad | `ADULT_REQUIRED` |
| T-07 | Solicitud de juego bloqueado | `GAME_NOT_AVAILABLE` con motivo |
| T-08 | Segunda solicitud con préstamo activo | `LOAN_ALREADY_ACTIVE` |
| T-09 | Caducidad de la solicitud al cumplirse el bloqueo | Estado `CANCELLED` y juego libre |
| T-10 | Entrega con QR válido | `DELIVERED` con controlador y hora |
| T-11 | Entrega con QR usado | `QR_ALREADY_USED` |
| T-12 | Entrega con QR caducado | `QR_EXPIRED` |
| T-13 | Dos entregas simultáneas del mismo juego | Una `DELIVERED`, otra `GAME_NOT_AVAILABLE` |
| T-14 | Entrega con evento cerrado | `EVENT_CLOSED` |
| T-15 | Devolución con evento cerrado | Aceptada |
| T-16 | Devolución de un jugador sin préstamo | Aviso, último préstamo y opción de corrección |
| T-17 | Cierre con juegos fuera y forzar | Préstamos `RETURNED` con `forced_close` |
| T-18 | Importación con evento abierto | `IMPORT_BLOCKED` |
| T-19 | Importación con un juego prestado | Rechazo con el juego identificado |
| T-20 | Controlador consulta el DNI | `***123X` |
| T-21 | Administrador de aplicación abre una ficha | Ve el DNI completo, sin pedir motivo |
| T-22 | Cambio de hora de marzo | Una sola apertura, sin duplicar franja |
| T-23 | Dos eventos con franjas solapadas | Solo uno se abre y se avisa |
| T-24 | Corrección sin motivo | Rechazo |
| T-25 | Alteración de un asiento de auditoría | `audit:verify` señala la fila |
| T-26 | Carga: 120 préstamos en una hora, 40 usuarios | p95 ≤ 500 ms, cero errores 5xx |
| T-27 | Carga: 10 entregas simultáneas del mismo juego | Una sola entrega válida |
| T-28 | Usabilidad: cinco personas | 90 % de tareas sin ayuda, entrega ≤ 20 s |
| T-29 | Panel de sala sin sesión de operador | Muestra juegos fuera y ranking, sin nombres ni DNI |
| T-30 | Descarga de imágenes con un juego inaccesible | Reintenta, informa del fallo y no bloquea el resto |
| T-31 | Apertura y exportación del listado de usuarios | Asiento de auditoría con actor y evento en ambas |
| T-32 | Dos ejemplares del mismo título | Se prestan a la vez a dos jugadores distintos |
| T-33 | Bloqueo configurado a 30 minutos | La solicitud caduca a los 30, no a los 15 |
| T-34 | Panel sin sesión y sin evento abierto | No muestra ninguna lista |
| T-35 | Panel con evento abierto y límite 3 | Tres juegos fuera, tres más prestados, tres más jugados |
| T-36 | Lista de juegos fuera con 20 préstamos y límite 10 | Se ven los diez con más tiempo |
| T-37 | Recuperación con un correo registrado | La pantalla enseña la dirección antes de enviar y el enlace llega |
| T-38 | Recuperación con un correo que no existe | Misma pantalla y mismo mensaje; no se envía nada |
| T-39 | Enlace caducado o ya usado | Se rechaza y se muestra el mensaje de ayuda a la organización |
| T-40 | Cuenta creada con Google pide recuperación | Se le indica que entre con Google y que pida ayuda si no puede |
| T-41 | Restablecer la contraseña con otra sesión abierta | La otra sesión queda cerrada |
