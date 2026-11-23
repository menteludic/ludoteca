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
