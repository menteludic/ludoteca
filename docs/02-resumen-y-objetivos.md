# 2. Resumen ejecutivo, objetivos y KPIs

## 2.1 El problema

La asociación presta juegos durante un evento de uno a tres días. El control se lleva en papel o en una hoja de cálculo: al final del día nadie sabe con certeza qué juegos están fuera ni quién los tiene, y no queda registro de qué se jugó. Con 600 juegos y 1.500 visitantes al día, el mostrador se convierte en una cola si cada operación exige teclear.

## 2.2 La solución

Una aplicación web con tres pantallas:

- **El jugador**, desde su móvil: se registra una vez, completa su perfil, ve el catálogo con imagen y estado de cada juego, y pide uno. Recibe un QR que enseña en el mostrador.
- **El controlador**, desde una tablet: escanea ese QR, ve el nombre del jugador y el juego, y pulsa «Entregar». Para devolver, vuelve a escanear el QR del jugador o busca el juego por nombre.
- **El panel de sala**, en un monitor con sesión de analista: muestra a la gente los juegos que están fuera y el ranking de los más prestados.

Sin teclear nombres, sin papeletas y sin hojas de cálculo. Al cerrar el evento, el sistema ya tiene el registro completo y las estadísticas calculadas.

## 2.3 Indicadores de éxito

| ID | Indicador | Objetivo | Cómo se mide |
|---|---|---|---|
| KPI-01 | Entregas por debajo de 20 segundos | ≥ 95 % | La aplicación cronometra desde que el controlador abre el escáner hasta que confirma |
| KPI-02 | Incidencias sobre operaciones | ≤ 1 % | Se considera incidencia: QR ilegible, préstamo no encontrado, conflicto por juego ya prestado o corrección manual |
| KPI-03 | Altas completadas sin ayuda | ≥ 90 % | Prueba de usabilidad con cinco personas y observación en el evento piloto |
| KPI-04 | Catálogo utilizado | ≥ 60 % de los juegos prestados al menos una vez | MET-03 sobre el total del evento |

## 2.4 Qué no es este sistema

No es un sistema crítico y el documento no lo trata como tal. No hay compromiso de disponibilidad del 99,9 %, ni recuperación en minutos, ni plan de contingencia en papel. Si el servidor se cae un rato, el evento sigue: la gente sigue jugando y las operaciones se registran cuando vuelve. Lo que sí se exige es que **el registro sea fiel**: ni un préstamo inventado, ni uno perdido por un error de la aplicación.
