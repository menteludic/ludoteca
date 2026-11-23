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
