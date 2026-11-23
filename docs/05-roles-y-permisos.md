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
