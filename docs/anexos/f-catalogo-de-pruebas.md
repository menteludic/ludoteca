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
