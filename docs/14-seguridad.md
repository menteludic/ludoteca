# 14. Seguridad

## 14.1 Nivel objetivo

El sistema no es crítico y no maneja dinero. El objetivo es concreto: **que nadie pueda hacerse pasar por otro, ver un DNI ajeno ni alterar el registro sin dejar rastro**. Todo lo demás es proporcionado.

## 14.2 Especificación

| ID | Control | Cómo se implementa | Cómo se verifica |
|---|---|---|---|
| SEC-01 | Contraseñas | scrypt con `N=2^17`, `r=8`, `p=1`, sal de 32 bytes y 64 bytes de salida; comparación en tiempo constante | Prueba de hash y de verificación; nunca aparece la contraseña en logs |
| SEC-02 | Sesiones | Token aleatorio de 256 bits, guardado como hash en `sessions`; cookie `HttpOnly`, `Secure`, `SameSite=Lax`; 7 días | Prueba de robo de cookie sin `HttpOnly`: no aplica; prueba de revocación |
| SEC-03 | OAuth | `state` de un solo uso y PKCE; se valida el emisor, el público y el correo verificado | Prueba con `state` repetido y con token de otro cliente |
| SEC-04 | Autorización | Middleware que deniega por defecto; cada ruta declara roles y ámbito | Matriz de permisos automatizada: cada rol contra cada ruta |
| SEC-05 | Entrada | Esquema zod por ruta; campos desconocidos rechazados; límites de longitud | Pruebas de contrato con casos inválidos |
| SEC-06 | Fuerza bruta | 5 intentos por minuto por IP y correo; retardo creciente; mensaje genérico | Prueba de 20 intentos: bloqueo y mensaje sin filtrar si el correo existe |
| SEC-07 | Cabeceras | CSP `default-src 'self'`; `frame-ancestors 'none'`; HSTS; `nosniff`; `Referrer-Policy: no-referrer` | Comprobación en CI sobre la respuesta real |
| SEC-08 | XSS | snabbdom crea nodos, no inyecta HTML; prohibido `innerHTML` | Regla de lint y revisión |
| SEC-09 | CSRF | `SameSite=Lax` y token de doble envío en formularios sensibles | Prueba de petición cruzada |
| SEC-10 | Secretos | Variables de entorno; nunca en el repositorio; rotación documentada | Revisión de secretos en CI |
| SEC-11 | Dependencias | `npm audit` en CI; bloqueo de vulnerabilidades altas; versiones fijadas | Etapa de CI obligatoria |
| SEC-12 | QR | Token de 128 bits, guardado como hash, de un solo uso y caducidad según el evento | Prueba de reutilización y de caducidad |
| SEC-13 | Auditoría | Solo anexión, con hash encadenado; verificación por comando | Comando `audit:verify` que detecta una fila alterada |
| SEC-14 | Copias | Cifradas con age; fuera del servidor | Restauración cronometrada antes del evento |
| SEC-15 | Errores | Mensajes que no revelan si un correo existe ni detalles internos | Revisión de las respuestas de error |
| SEC-16 | Logs | JSON con identificador de petición; sin correo, DNI, token ni contraseña | Revisión de una muestra de logs en CI |
| SEC-17 | Recuperación | Enlace de 128 bits guardado como hash, un solo uso, 30 minutos, límite de 3 peticiones por hora y cuenta, y misma respuesta exista o no el correo | Prueba de reutilización, caducidad y de dos correos con la misma respuesta |
| SEC-17 | Descarga de imágenes | Solo se aceptan direcciones cuyo host sea `cf.geekdo-images.com`; límite de tamaño y de redirecciones; sin seguir a otros dominios | Prueba con una URL externa: rechazada |

## 14.3 Lo que queda fuera y por qué

| No se hace | Motivo |
|---|---|
| Doble factor | Añade fricción a voluntarios y a un evento de un fin de semana; el riesgo no lo justifica. |
| Cifrado de toda la base de datos | Solo el DNI es sensible; el resto se protege con permisos y copias cifradas. |
| WAF o protección anti-DDoS dedicada | El VPS y el proxy ya absorben lo razonable para este tamaño. |
| Auditoría de seguridad externa | Coste desproporcionado; se sustituye por la matriz de permisos automatizada y la revisión de dependencias. |
| Registro de IP | No aporta para el objetivo y complica el cumplimiento. |
