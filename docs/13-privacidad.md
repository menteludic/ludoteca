# 13. Datos personales y privacidad

## 13.1 Qué se guarda y para qué

| Dato | Para qué | Base legal | Cuánto tiempo |
|---|---|---|---|
| Correo | Identificar la cuenta | Ejecución del servicio | Mientras la cuenta exista |
| Nombre y apellidos | Saber quién tiene el juego | Ejecución del servicio | Mientras la cuenta exista |
| DNI, NIF o NIE | Responsabilizarse del préstamo | Interés legítimo en proteger el patrimonio | Mientras exista la cuenta |
| Declaración de mayoría de edad | Cumplir la restricción de edad | Obligación legal | Mientras la cuenta exista |
| Historial de préstamos | Estadísticas y trazabilidad | Interés legítimo | Indefinido, seudonimizado |
| Enlace de recuperación | Demostrar que quien restablece es el titular | Ejecución del servicio | 30 minutos |

No se piden teléfono, dirección ni fecha de nacimiento. No hay perfilado ni decisiones automáticas.

## 13.2 Reglas

1. **Solo mayores de edad.** La declaración es una casilla que se guarda con fecha. Si el controlador tiene duda razonable, puede negar la entrega; el sistema no verifica documentos.
2. **DNI enmascarado al controlador.** En el mostrador se muestra `***123X`; el controlador no necesita más. El administrador de evento sí ve el DNI completo en la pantalla de usuarios del evento (5.5), que deja asiento cada vez que se abre o se exporta. Su titular lo ve entero en su perfil.
3. **DNI cifrado.** Se guarda cifrado con AES-256-GCM y una clave en el entorno del servidor; el valor enmascarado se guarda aparte para poder mostrarlo sin descifrar.
4. **Conservación.** Los datos se guardan mientras exista la cuenta y se borran con ella o cuando su titular lo pida (RN-20).
5. **Supresión de cuenta.** El titular puede pedirla; se borran correo, nombre y DNI y los préstamos quedan asociados a «Cuenta eliminada». Se conservan las cifras, no la persona.
6. **Sin cesiones.** No se comparte nada con terceros. El VPS está en la Unión Europea y hay contrato de encargado con el proveedor.
7. **Google y Facebook.** Si el evento permite esos accesos, el usuario decide usarlos; la pantalla lo explica antes de pulsar. Son transferencias internacionales del proveedor correspondiente y están cubiertas por sus propias garantías.
8. **Derechos.** Acceso, rectificación, supresión y portabilidad se atienden desde el perfil o por escrito; plazo máximo un mes. La exportación de los datos de una cuenta es un botón, en JSON.

## 13.3 Lo que no se hace

- No se guarda la IP en la auditoría.
- No se guardan los datos de la tarjeta ni pagos: no hay pagos.
- No se hacen fotos ni se pide documento escaneado.
- No se usan cookies de analítica ni de publicidad.
- No hay correos de verificación, de aviso ni de mercadotecnia. **El único correo que sale del sistema es el enlace de recuperación de contraseña** (13.4).


## 13.4 El único correo que sale

- **Qué se envía.** Un enlace de un solo uso para restablecer la contraseña. Nada más: ni verificación de cuenta, ni avisos, ni resúmenes.
- **Cómo se envía.** SMTP de un proveedor transaccional desde un subdominio propio (`mail.…`), con **SPF, DKIM y DMARC** publicados. Sin esos registros el correo cae en spam y el usuario se queda fuera.
- **Qué se mide.** Nada. Sin píxeles, sin enlaces de seguimiento, sin registrar aperturas. Solo se anota si el envío falló, para poder avisar en pantalla.
- **Rebotes.** Un rebote duro deja el correo marcado como no válido y la pantalla de recuperación lo dice: «No hemos podido entregar el correo; pide ayuda a un administrador».
- **Contenido.** El enlace caduca en 30 minutos, se guarda hasheado y sirve una sola vez. Al usarlo se cierran todas las sesiones.
- **Retención.** El enlace caducado se borra en el trabajo horario. Del envío no queda más rastro que el resultado (entregado o fallido).
