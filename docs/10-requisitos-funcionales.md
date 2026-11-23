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
