# 16. Calidad y pruebas

## 16.1 Cómo se trabaja

Ciclo rojo-verde-refactor: primero la prueba que falla, después el código que la hace pasar, después la limpieza. No se acepta código de aplicación sin prueba; se exceptúan configuración, estilos y textos.

## 16.2 Cobertura

El criterio es el que pediste: **el 90 % del código debe estar cubierto al menos por una prueba**. Se mide sobre líneas y se aplica como puerta de integración continua.

| Ámbito | Umbral | Nota |
|---|---|---|
| `src/domain` | 95 % | Aquí están las reglas; un fallo cuesta un juego |
| `src/app` | 90 % | Casos de uso |
| `src/http` | 85 % | Rutas y permisos, con pruebas de contrato |
| `src/infra` | 80 % | Repositorios contra una base SQLite real |
| **Total** | **90 %** | Puerta de CI |

No se persigue el 100 %: las ramas de error de la red y de los ficheros se prueban con dobles y no aportan cobertura real.

## 16.3 Niveles

| Nivel | Qué cubre | Herramienta | Cantidad orientativa |
|---|---|---|---|
| Unidad | Estados, reglas, cálculo de franjas, máscara de DNI | `node:test` | 180 |
| Integración | Repositorios, transacciones, auditoría, QR de un solo uso | `node:test` + SQLite en memoria o fichero temporal | 50 |
| Contrato | Cada ruta contra el `openapi.yaml` | Schemathesis | Todas |
| Extremo a extremo | Registro, solicitud, entrega, devolución, cierre | Playwright | 5 |
| Carga | Hora punta y conflicto de entregas | k6 | 2 escenarios |
| Usabilidad | Cinco personas reales | Protocolo manual | 5 |

Los cinco flujos de extremo a extremo son el corazón: si uno falla, no se despliega.

## 16.4 Pruebas que no se pueden saltar

1. Dos entregas simultáneas del mismo juego: una gana y la otra recibe `GAME_NOT_AVAILABLE`.
2. QR usado dos veces: el segundo intento se rechaza.
3. QR caducado: rechazado.
4. Devolución con el evento cerrado: aceptada.
5. Solicitud con evento cerrado: rechazada con la próxima franja.
6. Jugador con préstamo activo que pide otro: rechazado con el préstamo que debe devolver.
7. Cambio de hora de marzo y de octubre: las franjas abren una sola vez.
8. Dos eventos con franjas solapadas: solo uno se abre.
9. Importación con juego prestado: bloqueada.
10. Lectura del DNI por un controlador: `***123X`.
11. Corrección de préstamo sin motivo: rechazada.
12. Cadena de auditoría alterada: el comando de verificación lo detecta.

## 16.5 Lint que hace cumplir la arquitectura

| Regla | Impide | Ámbito |
|---|---|---|
| `no-restricted-syntax` (`ClassDeclaration`) | Clases | `src/domain`, `src/app` |
| `no-restricted-syntax` (`NewExpression`) | `new` | `src/domain`, `src/app` |
| `no-restricted-syntax` (`ThisExpression`) | `this` | `src/domain`, `src/app` |
| `no-restricted-imports` | Frameworks y SQL en el núcleo | `src/domain` |
| `no-restricted-properties` (`innerHTML`) | Inyección de HTML | `src/web` |
| `max-lines` (300) | Módulos inmanejables | `src/**` |
| `jsdoc/require-jsdoc` | Funciones exportadas sin contrato | `src/**` |

Configuración plana con las reglas de Google replicadas: dos espacios, punto y coma, comillas simples, 100 columnas.

## 16.6 Integración continua

| Etapa | Comprobación | Bloquea |
|---|---|---|
| 1 | ESLint | Sí |
| 2 | `tsc --checkJs` sobre JSDoc | Sí |
| 3 | Pruebas unitarias y de integración con cobertura | Sí |
| 4 | Contrato OpenAPI | Sí |
| 5 | `npm audit` y revisión de secretos | Sí |
| 6 | Extremo a extremo sobre la imagen construida | Sí |
| 7 | Imagen Docker y etiqueta | Sí |

## 16.7 Definición de hecho

Un requisito está hecho cuando tiene prueba, cumple su criterio de aceptación, está reflejado en este documento, pasa la revisión y no deja deuda sin registrar.

## 16.8 Revisión de código

Siete preguntas, citadas por el revisor: ¿hay prueba que falla sin el cambio? ¿la función hace una cosa y se llama como lo que hace? ¿los efectos están en el borde? ¿el error dice qué hacer? ¿se lee en una tablet a plena luz? ¿registra algo que no debe? ¿añade una decisión nueva sin ADR?
