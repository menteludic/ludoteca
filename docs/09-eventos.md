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
