# 17. Estadísticas

## 17.1 Qué cuenta como uso

Un préstamo cuenta cuando fue entregado y devuelto, y estuvo fuera al menos el umbral configurado (por defecto, 10 minutos). Un préstamo devuelto a los dos minutos es un error de mostrador, no una partida. Los préstamos cerrados por cierre forzoso se cuentan aparte y se marcan como tales.

## 17.2 Métricas

| ID | Métrica | Fórmula | Granularidad |
|---|---|---|---|
| MET-01 | Préstamos por juego | Préstamos `RETURNED` agrupados por juego | Evento, día, juego |
| MET-02 | Tiempo medio de uso | Media y mediana de `returned_at − delivered_at` | Evento, juego |
| MET-03 | Catálogo utilizado | Juegos con al menos un préstamo ÷ juegos disponibles en el evento | Evento |
| MET-04 | Uso por día y franja | Préstamos por hora del día | Evento, día |
| MET-05 | Jugadores únicos | Personas con al menos un préstamo entregado, contadas por seudónimo | Evento, día |
| MET-06 | Ritmo de entrega | Mediana y p95 del tiempo de operación en el mostrador | Puesto, día |
| MET-07 | Préstamos forzados | Cuántos se cerraron por cierre forzoso | Evento |

## 17.3 Panel de sala

Página **totalmente pública**: se abre `https://…/panel` en un monitor y no pide cuenta ni sesión. No recibe parámetro de evento, porque solo hay uno abierto; si no lo hay, no muestra ninguna lista.

Tres listas, cada una recortada al número de elementos configurado en el evento (5 por defecto):

- **Juegos fuera:** imagen, nombre y tiempo desde la entrega, del que más tiempo lleva al que menos. Si no caben todos en el monitor, se recorta por el final: solo se ven los que más tiempo llevan.
- **Más prestados:** los que más veces han salido, con el número de préstamos.
- **Más jugados:** los que más veces han superado el umbral de uso (el de 17.1: 10 minutos por defecto).

La hora del último refresco se muestra siempre en un extremo, para que nadie confunda un dato viejo con uno actual. Se refresca cada 30 segundos. Sin nombres, sin DNI y sin identificadores de jugador.

## 17.4 Informe del evento

Se genera al cerrar y contiene: total de préstamos, jugadores únicos, juegos distintos usados y porcentaje del catálogo; ranking de los veinte juegos más prestados con su tiempo medio; uso por día y franja; préstamos cerrados a la fuerza; y el ritmo de entrega por puesto. Se exporta a PDF y CSV.

## 17.5 Límites

- Un préstamo no demuestra que se jugara: el umbral de 10 minutos es una aproximación y el informe lo dice.
- Sin imágenes ni categorías en el catálogo, no hay análisis por tipo de juego. Llegará si se integra la API.
- Comparar dos eventos solo tiene sentido si tuvieron duración y catálogo parecidos.
