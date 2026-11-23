# 19. Plan

## 19.1 Calendario

El evento es en **marzo de 2027**, con día por confirmar. Hay margen para probar en un entorno real antes.

| Fase | Cuándo | Contenido | Puerta de salida |
|---|---|---|---|
| F0 · Preparación | Diciembre 2026 | Repositorio, VPS, dominio, CI, esqueleto de la aplicación | Despliegue automático de una página vacía |
| F1 · Núcleo | Diciembre 2026 | Cuentas, perfiles, roles, eventos y franjas, catálogo por CSV | Un evento se abre y se cierra solo; catálogo importado |
| F2 · Préstamo | Enero 2027 | Solicitud, QR, mostrador, entrega y devolución | Los cinco flujos e2e en verde |
| F3 · Estadísticas y cierre | Enero 2027 | Cierre con juegos fuera, informe y exportaciones | Ciclo completo de un evento de prueba |
| F4 · Prueba real | Febrero 2027 | Sesión en el local o en un evento pequeño con 3 puestos y 20 juegos | Criterios de 19.4 cumplidos |
| F5 · Endurecimiento | Febrero 2027 | Accesibilidad, seguridad, carga, textos y formación | Revisión de permisos y prueba de carga |
| F6 · Evento | Marzo 2027 | Despliegue, formación y guardia | KPIs medidos y evento cerrado |

## 19.2 Estimación

| Concepto | Horas |
|---|---|
| Cuentas, OAuth, perfiles y recuperación por correo | 30 |
| Eventos, franjas y estados | 15 |
| Catálogo, CSV, imágenes y duplicados | 26 |
| Solicitud, entrega y devolución | 35 |
| Mostrador y lector de QR | 20 |
| Estadísticas, panel de sala e informe | 24 |
| Administración, roles, auditoría y listado de usuarios | 20 |
| Interfaz, accesibilidad e imágenes | 34 |
| Pruebas, carga y seguridad | 25 |
| Despliegue y documentación | 16 |
| **Total** | **245 h** |

Con media jornada son unas 11 semanas y media; el calendario de 12 deja un colchón corto. No incluye trabajo de campo: no hay que etiquetar cajas.

## 19.3 Coste

| Concepto | Coste |
|---|---|
| VPS 1 vCPU / 2 GB | 6–10 €/mes |
| Dominio | 12 €/año |
| Correo saliente (solo recuperación) | 0 € en el tramo gratuito |
| Licencias | 0 € |

## 19.4 Criterios para dar el sistema por bueno

Antes del evento: 100 operaciones seguidas sin error en la prueba real; entrega por debajo de 20 segundos de mediana; devolución por debajo de 20 segundos; cinco personas completan el alta sin ayuda; restauración de copia probada y cronometrada.

Después del evento: KPI-01 a KPI-04 medidos y anotados en este documento.

## 19.5 Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Facebook no aprueba la aplicación a tiempo | Media | Bajo | La configuración por evento permite desactivarlo; Google y cuenta local cubren el caso |
| El CSV de BGG cambia de formato | Baja | Medio | El importador exige solo dos columnas y avisa con el detalle del error |
| La cámara de las tablets no lee bien los QR | Media | Alto | Prueba en la fase F4 con las tablets reales; alternativa de búsqueda por nombre |
| La wifi del recinto no cubre el mostrador | Media | Alto | Prueba de cobertura el día anterior; router 4G de respaldo |
| El día del evento coincide con otro acto | Baja | Medio | Solo un evento abierto a la vez por diseño |
| Una sola persona sabe mantenerlo | Alta | Medio | Documentación, ADR y sesión de traspaso al sysop |
| Los voluntarios no practican | Media | Medio | Formación de 15 minutos y tarjeta plastificada por puesto |
