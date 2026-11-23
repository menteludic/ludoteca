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
