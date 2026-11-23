# 1. Control de versiones y aprobación

## 1.1 Historial

| Versión | Fecha | Autor | Contenido |
|---|---|---|---|
| 0.1 | 12/11/2026 | Roberto M. | Documento inicial: objetivos, actores y stack técnico. |
| 0.2 | 23/11/2026 | Hermes | Análisis crítico y decisiones D1–D12. |
| 1.0 | 23/11/2026 | Hermes | Documento de proyecto. Base para el desarrollo. |
| 1.1 | 23/11/2026 | Hermes | TLS en Nginx Proxy Manager (ADR-016), entrega continua con Actions, GHCR y SSH (ADR-017), Portainer como panel (ADR-018). Repositorio público con licencia MIT. |

## 1.2 Aprobación

| Rol | Nombre | Estado | Fecha |
|---|---|---|---|
| Promotor y responsable funcional | Roberto M. | Aprobado | 23/11/2026 |
| Asociación (titular del tratamiento de datos) | Junta directiva | Pendiente | Antes de la fase 2 |
| Sysop (infraestructura y despliegue) | Por designar | Pendiente | Antes de la fase 2 |
| Responsable de protección de datos | Por designar | Pendiente | Antes de la fase 4 |

Una aprobación pendiente no bloquea el desarrollo del núcleo, pero sí el tratamiento de datos reales y el despliegue en producción.

## 1.3 Convenciones

- **Código, base de datos y API en inglés** (`loan`, `game`, `event`, `returned_at`). **Interfaz y documentación en castellano.** El glosario del capítulo 4 da la correspondencia.
- Los textos de la interfaz viven en un único fichero `ui/es.json`, con claves estables, para poder traducir sin tocar código.
- Requisitos citables: `RF-101`, `RN-07`, `RNF-03`, `SEC-04`, `UC-02`, `ADR-003`.
- **Obligatorio** (MUST), **recomendado** (SHOULD), **opcional** (MAY).
- Solo queda una decisión abierta: el **día exacto** del evento de marzo de 2027. No bloquea el diseño.
