# Pendientes

Lista viva de lo que falta por decidir, contratar o verificar, y que no es código. Se actualiza con cada entrega: lo que se cierra se marca con fecha y se queda en la tabla; no se borra, para que se pueda reconstruir por qué se decidió lo que se decidió.

Regla de uso: un pendiente que bloquea una fase tiene que aparecer también en `plan-de-implementacion.md`, en la tabla de bloqueos externos. Si no está en las dos listas, no existe.

## Abiertos

| ID | Tema | Qué falta | Quién | Cuándo importa | Estado |
|---|---|---|---|---|---|
| PEN-01 | Copias fuera del VPS | Elegir destino (restic, rclone o `age` + descarga) y dejar la copia semanal cifrada fuera del servidor. Hoy la copia diaria vive en el mismo disco | Roberto | Antes de F6 | Abierto |
| PEN-31 | HSTS preload | El proxy emite `preload` con dos años. Si el dominio aún puede necesitar HTTP o cambiar de destino, conviene quitar `preload` y bajar a un año hasta que esté estable; con `preload` la vuelta atrás tarda meses | Roberto | Antes de P39 | Abierto |
| PEN-04 | Acceso a staging | Access List con usuario y contraseña en el proxy host de staging. Verificado el 23/11: responde 502 sin pedir credenciales, así que no está activa | Roberto | P08 | Abierto |
| PEN-05 | Correo saliente | Proveedor SMTP, subdominio `mail.floyd303.com` y registros SPF, DKIM y DMARC | Roberto | P15 | Abierto |
| PEN-06 | Token de BGG | Registrar la aplicación y obtener el token de la API (sin él no hay miniaturas) | Roberto | P20 | Abierto |
| PEN-07 | Aplicación de Facebook | Solicitud y aprobación, o dejar Facebook desactivado por evento | Roberto | P21 | Abierto |
| PEN-08 | Paquete GHCR público | Cambiar la visibilidad del paquete a pública después del primer push (si no, el servidor necesita un token `read:packages`) | Roberto | P08 | Abierto |
| PEN-09 | Protección de `main` | Checks obligatorios (`quality`, `contract`, `e2e`) y prohibición de push directo | Roberto | P04 | Abierto |
| PEN-10 | Licencia | Decidida AGPL-3.0; falta sustituir `LICENSE` y la mención del README (hoy MIT) | Roberto | Antes de publicar código | Abierto |
| PEN-11 | Rotación de `DNI_KEY` | Escribir y probar el comando que descifra y vuelve a cifrar los DNI con una clave nueva (P14 lo menciona, no está implementado) | Desarrollo | Antes de producción | Abierto |
| PEN-12 | Retención del DNI | RF-605 habla de «días de retención del DNI» y 13.1 dice «mientras exista la cuenta». Aclarar con la asociación y ajustar requisito o configuración | Roberto + junta | Antes de P14 | Abierto |
| PEN-13 | Aprobación de la junta | La asociación es titular del tratamiento; falta la aprobación formal | Junta directiva | Antes de F2 | Abierto |
| PEN-14 | Responsable de protección de datos | Designar a la persona y dejar por escrito el procedimiento de derechos | Junta directiva | Antes de F4 | Abierto |
| PEN-15 | Traspaso al sysop | Sesión de traspaso con `puesta-en-marcha-servidor.md`, `18-operacion.md` y ensayo de restauración | Roberto + desarrollo | Antes de F6 | Abierto |
| PEN-16 | Restauración cronometrada | Restaurar la copia diaria en un entorno aparte y medir el tiempo (criterio: ≤ 30 min) | Roberto | Antes de F6 | Abierto |
| PEN-17 | Fecha del evento | Día exacto de marzo de 2027 (única decisión abierta del documento) | Junta | Antes de P17 | Abierto |
| PEN-18 | Umbral de uso | Validar los 10 minutos que definen «préstamo que cuenta como uso» con datos de la prueba real | Roberto | Después de F4 | Abierto |
| PEN-19 | Prueba de usabilidad | Cinco personas reales completando el alta sin ayuda (KPI-03) | Roberto | F4 | Abierto |
| PEN-20 | Segundo administrador de aplicación | Nombrar una segunda cuenta con ese rol; hoy todo depende de una persona | Roberto | Antes de F6 | Abierto |
| PEN-21 | Textos legales | Revisar la política de privacidad y el aviso de mayoría de edad con la junta antes de publicarlos | Roberto + junta | Antes de P39 | Abierto |

## Cerrados

| ID | Tema | Decisión | Fecha |
|---|---|---|---|
| PEN-22 | Runtime | Node **24 LTS**. Verificado con salida real: `node:sqlite` funciona sin flag en 24.22.3 | 23/11/2026 |
| PEN-23 | Rutas y usuario del servidor | `/home/ubuntu/docker/ludoteca/{prod,stg}`, usuario `ubuntu`, clave dedicada con `command=` | 23/11/2026 |
| PEN-24 | Terminación TLS | Nginx Proxy Manager; la app expone HTTP en un puerto interno (ADR-016) | 23/11/2026 |
| PEN-25 | Cloudflare | Solo DNS (nube gris); `TRUST_PROXY_HOPS=1` | 23/11/2026 |
| PEN-26 | Entrega continua | Actions + GHCR con etiqueta por SHA + despliegue por SSH (ADR-017); Portainer como panel (ADR-018) | 23/11/2026 |
| PEN-27 | Nombres | `ludoteca.floyd303.com` y `ludoteca-stg.floyd303.com` | 23/11/2026 |
| PEN-28 | Alta de DNS | Los dos nombres resuelven a 82.223.117.97 (nube gris) | 23/11/2026 |
| PEN-29 | Certificados | Let's Encrypt emitido en los dos, HTTP/2, Force SSL y HSTS `max-age=63072000; preload` | 23/11/2026 |
| PEN-30 | Clave SSH de despliegue | Ed25519 en GitHub y en `authorized_keys` con `command=` al wrapper de `bin/` | 23/11/2026 |