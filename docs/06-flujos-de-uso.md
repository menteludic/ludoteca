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
