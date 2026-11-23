# 18. Despliegue y operación

## 18.1 Puesta en marcha

| Paso | Quién | Comprobación |
|---|---|---|
| Dominio y DNS en Cloudflare | Sysop | Registro apuntando al VPS |
| Proxy host y certificado en el proxy de Nginx | Sysop | `https://ludoteca.floyd303.com` responde y el certificado es válido |
| Configurar `.env` y el volumen `/srv/ludoteca/data` | Sysop | El fichero de base de datos y las imágenes viven fuera del contenedor |
| Dar de alta el correo saliente | Sysop | SPF, DKIM y DMARC publicados, y un enlace de recuperación de prueba que llega a la bandeja de entrada |
| Crear la primera cuenta y nombrarla administrador de aplicación | Sysop | Acceso y permisos |
| Importar el catálogo | Adm. aplicación | 600 juegos con imagen |
| Crear el evento y las franjas | Adm. aplicación | Estado y próxima franja correctos |
| Prueba de humo | Adm. aplicación | Registro, solicitud, entrega y devolución con cinco juegos |

## 18.2 Tareas programadas

| Tarea | Frecuencia | Qué hace |
|---|---|---|
| Caducar solicitudes | Cada minuto | Pasa a `CANCELLED` las que superan el bloqueo configurado |
| Abrir y cerrar por franja | Cada minuto | Calcula el estado del evento |
| Copia de seguridad | Diaria, 04:00 | `VACUUM INTO`, cifrado y descarga |
| Verificación de auditoría | Semanal | Recorre la cadena de hashes |
| Limpieza de sesiones | Diaria | Borra las caducadas |
| Limpieza de enlaces | Cada hora | Borra los enlaces de recuperación caducados o usados |

## 18.3 Runbook

| Situación | Acción | Tiempo |
|---|---|---|
| La aplicación no responde | `/health`, reiniciar contenedor, mirar logs | 5 min |
| Error de base de datos | Reiniciar; si persiste, restaurar la copia del día | 30 min |
| Disco lleno | Rotar logs y copias locales | 15 min |
| Certificado caducado | Renovación en el proxy de Nginx; si falla, emitir de nuevo con la nube de Cloudflare en gris | 15 min |
| Restauración | Parar, sustituir el fichero, arrancar, comprobar `/health` y un préstamo de prueba | 30 min |

## 18.4 Durante el evento

- Una persona de guardia con acceso al panel de administración y al servidor, localizable por el canal de la asociación.
- El administrador de evento puede ver en todo momento cuántos juegos están fuera y desde cuándo.
- Si el servidor falla, la aplicación deja de aceptar operaciones y lo dice con claridad; no se inventan datos ni se guardan colas locales.
- Al terminar cada día: comprobar que no hay operaciones a medias, revisar los juegos fuera y cargar las tablets.

## 18.5 Después del evento

1. Cerrar el evento y generar el informe.
2. Copia de seguridad y una restauración de prueba.
3. Revisar el informe con la junta y guardar el PDF y el CSV.
4. Reunión con los controladores: qué falló y qué se pide.
5. Actualizar este documento y las ADR afectadas.
