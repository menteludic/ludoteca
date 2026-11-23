# Documentación · Ludoteca

Documentación de proyecto dividida por áreas. Cada fichero es autónomo: se puede leer y editar sin abrir los demás.

Base: **documento de proyecto v1.0** (23 de noviembre de 2026). Los capítulos se han repartido tal cual, conservando su numeración original; el documento completo, sin trocear, está en `referencia/` y sirve como fuente de verdad cuando haya duda.

## Áreas

| Fichero | Qué contiene |
|---|---|
| `guia-de-usuario.md` | Guía para jugadores, controladores y administradores. Sin jerga técnica |
| `01-control-de-versiones.md` | Historial, estado de aprobaciones y convenciones del documento |
| `02-resumen-y-objetivos.md` | Qué resuelve el sistema, objetivos y KPIs |
| `03-alcance.md` | Qué entra, qué no entra y supuestos |
| `04-glosario.md` | Términos, estados del juego y del préstamo |
| `05-roles-y-permisos.md` | Los cinco roles, la matriz de permisos y el ciclo de vida de las cuentas |
| `06-flujos-de-uso.md` | Los 16 casos de uso con sus tiempos objetivo |
| `07-modelo-de-datos.md` | Tablas, estados, invariantes y auditoría |
| `08-reglas-de-negocio.md` | Las reglas numeradas (RN) que el código debe cumplir |
| `09-eventos.md` | Franjas, apertura y cierre, bloqueo |
| `10-requisitos-funcionales.md` | Los RF, con su criterio de aceptación |
| `11-requisitos-no-funcionales.md` | Rendimiento, disponibilidad, accesibilidad |
| `12-catalogo.md` | Importación desde BoardGameGeek, imágenes, ejemplares duplicados |
| `13-privacidad.md` | Datos personales, base legal, conservación y el único correo que sale |
| `14-seguridad.md` | Controles SEC, modelo de amenazas y lo que queda fuera |
| `15-arquitectura.md` | Stack, capas, estilo de código, despliegue y ADR |
| `16-calidad-y-pruebas.md` | Estrategia de pruebas, cobertura y criterios de aceptación |
| `17-estadisticas.md` | Métricas, panel de sala e informe del evento |
| `18-operacion.md` | Puesta en marcha, tareas programadas, runbook y contingencias |
| `19-plan.md` | Calendario, esfuerzo y coste |
| `20-mejoras-futuras.md` | Lo que se ha dejado fuera y por qué |

## Anexos

| Fichero | Qué contiene |
|---|---|
| `anexos/a-decisiones-adr.md` | Las 15 decisiones de arquitectura con su alternativa descartada |
| `anexos/b-permisos-por-endpoint.md` | Matriz de rutas de la API por rol |
| `anexos/c-esquema-bd.md` | DDL de SQLite |
| `anexos/d-contrato-openapi.md` | Fragmento del contrato, con esquemas y ejemplos |
| `anexos/e-listas-de-comprobacion.md` | Antes del evento, durante y después |
| `anexos/f-catalogo-de-pruebas.md` | Casos de prueba con su resultado esperado |

## Referencia

- `referencia/documento-proyecto-ludoteca-v1.0.md` — el documento completo en texto.
- `referencia/documento-proyecto-ludoteca-v1.0.html` — la versión imprimible que se entregó.

## Cómo se mantiene

- Los cambios se hacen en el área correspondiente, no en el documento de referencia: `referencia/` es una copia congelada de lo aprobado.
- Las referencias cruzadas del tipo «apartado 12.4» o «RN-06» apuntan a la numeración original, que se conserva en los ficheros.
- Cuando un área cambie de forma sustancial, se anota en `01-control-de-versiones.md` y, si afecta al contrato, se actualiza `anexos/d-contrato-openapi.md`.