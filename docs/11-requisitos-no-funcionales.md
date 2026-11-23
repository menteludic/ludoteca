# 11. Requisitos no funcionales

Proporcionados al tipo de sistema: se pide que funcione bien, no que resista un ataque coordinado ni una auditoría industrial.

| ID | Requisito | Cifra y verificación |
|---|---|---|
| RNF-01 | Latencia. | p95 ≤ 500 ms en cualquier pantalla, con 50 usuarios simultáneos. |
| RNF-02 | Concurrencia. | 50 usuarios y 5 operaciones por segundo sostenidas durante una hora. |
| RNF-03 | Capacidad. | 600 juegos, 5.000 préstamos y 10.000 cuentas por evento sin degradación. |
| RNF-04 | Disponibilidad. | Sin compromiso de nivel de servicio. RTO 4 horas y RPO 24 horas: si el servidor muere, se restaura la copia del día. |
| RNF-05 | Accesibilidad. | WCAG 2.2 AA; contraste 7:1 en el mostrador; 44 px de objetivo táctil; zoom al 200 % sin pérdida. |
| RNF-06 | Usabilidad. | Alta ≤ 40 s, solicitud ≤ 15 s, entrega ≤ 20 s, devolución ≤ 20 s. |
| RNF-07 | Compatibilidad. | Últimas dos versiones de Chrome, Edge, Safari y Firefox; iOS 15+, Android 9+. |
| RNF-08 | Idioma. | Interfaz en castellano, textos en un único fichero; código, base de datos y API en inglés. |
| RNF-09 | Adaptación. | De 360 a 1280 px; prioridad vertical en móvil y horizontal en tablet. |
| RNF-10 | Arranque. | Primera carga ≤ 3 s en 4G; siguientes ≤ 1 s desde caché. |
| RNF-11 | Peso. | Página inicial ≤ 250 KB comprimida. |
| RNF-12 | Mantenibilidad. | Módulos ≤ 300 líneas; dominio sin efectos secundarios; cobertura del 90 % (capítulo 16). |
| RNF-13 | Observabilidad. | Logs JSON con identificador de petición; `/health`; sin datos personales en los logs. |
| RNF-14 | Copias. | Diaria automática, retención 30 días, restauración probada una vez antes del evento. |
| RNF-15 | Coste. | ≤ 12 €/mes de infraestructura; todo el software, libre. |
| RNF-16 | Tablets modestas. | Funciona en una tablet de 2019 con 2 GB de RAM. |
| RNF-17 | Lectura fácil. | Instrucciones de tres pasos, con ejemplo visual, sin jerga técnica. |
