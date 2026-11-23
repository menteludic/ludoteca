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
