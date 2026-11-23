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
