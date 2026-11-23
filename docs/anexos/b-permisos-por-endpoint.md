# Anexo B · Matriz de permisos por endpoint

● permitido · ◐ con condición · — denegado · ○ público sin sesión.

| Método y ruta | Público | Jugador | Controlador | Adm. evento | Analista | Adm. aplicación |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `POST /auth/register` | ○ | — | — | — | — | — |
| `POST /auth/login` | ○ | — | — | — | — | — |
| `POST /auth/logout` | — | ● | ● | ● | ● | ● |
| `GET /auth/google/callback` | ○ | — | — | — | — | — |
| `GET /auth/facebook/callback` | ○ | — | — | — | — | — |
| `POST /auth/password/forgot` | ○ | — | — | — | — | — |
| `POST /auth/password/reset` | ○ | — | — | — | — | — |
| `GET /me` | — | ● | ● | ● | ● | ● |
| `PATCH /me` | — | ● | ● | ● | ● | ● |
| `GET /events/current` | ○ | ● | ● | ● | ● | ● |
| `GET /games` | — | ● | ● | ● | ● | ● |
| `POST /loans` | — | ● | — | ● | — | ● |
| `DELETE /loans/{id}` | — | ● el suyo | — | ● | — | ● |
| `GET /loans/active` | — | ● el suyo | ● | ● | — | ● |
| `POST /loans/{id}/deliver` | — | — | ● | ● | — | — |
| `POST /loans/return` | — | — | ● | ● | — | — |
| `GET /events/{id}/users` | — | — | — | ● | — | ● |
| `GET /panel` | ○ | ● | ● | ● | ● | ● |
| `POST /admin/games/{id}/duplicate` | — | — | — | — | — | ● |
| `POST /admin/games/images/download` | — | — | — | — | — | ● |
| `GET /events/{id}/loans` | — | — | ● | ● | — | ● |
| `POST /events/{id}/close` | — | — | — | ● | — | ● |
| `POST /events/{id}/reopen` | — | — | — | ● | — | ● |
| `PATCH /event-games/{gameId}` | — | — | — | ● | — | ● |
| `GET /audit` | — | — | — | ◐ su evento | — | ● |
| `POST /audit/verify` | — | — | — | — | — | ● |
| `GET /stats/{eventId}` | — | — | — | ● | ● | ● |
| `GET /stats/{eventId}/export.csv` | — | — | — | ● | ● | ● |
| `POST /admin/roles` | — | — | — | ◐ controladores | — | ● |
| `POST /admin/events` | — | — | — | — | — | ● |
| `PUT /admin/events/{id}` | — | — | — | — | — | ● |
| `POST /admin/events/{id}/catalog/import` | — | — | — | — | — | ● |
| `POST /admin/games` | — | — | — | — | — | ● |
| `PATCH /admin/games/{id}` | — | — | — | — | — | ● |
| `GET /health` | ○ | ● | ● | ● | ● | ● |
