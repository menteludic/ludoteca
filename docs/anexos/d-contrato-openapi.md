# Anexo D · Contrato OpenAPI

Fragmento con las tres operaciones centrales; el contrato completo está en `openapi.yaml`.

```yaml
openapi: 3.1.0
info:
  title: Ludoteca API
  version: 2.0.0
servers:
  - url: https://ludoteca.example/api/v1
paths:
  /loans:
    post:
      summary: Solicita un juego
      security: [{ sessionCookie: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [gameId]
              additionalProperties: false
              properties:
                gameId: { type: string, format: uuid }
      responses:
        "201":
          description: Solicitud creada con su QR
          content:
            application/json:
              schema:
                type: object
                properties:
                  loan: { $ref: "#/components/schemas/Loan" }
                  qrCode: { type: string, description: "Token que se dibuja como QR" }
                  expiresAt: { type: string, format: date-time }
        "409": { $ref: "#/components/responses/Conflict" }
  /loans/{id}/deliver:
    post:
      summary: Entrega el juego escaneando el QR del jugador
      security: [{ sessionCookie: [] }]
      parameters:
        - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [qrCode]
              additionalProperties: false
              properties:
                qrCode: { type: string, minLength: 20 }
      responses:
        "200":
          description: Entregado
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Loan" }
        "409": { $ref: "#/components/responses/Conflict" }
        "403": { $ref: "#/components/responses/Forbidden" }
  /loans/return:
    post:
      summary: Devuelve el juego de un jugador
      security: [{ sessionCookie: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [playerQr]
              additionalProperties: false
              properties:
                playerQr: { type: string, description: "QR del jugador o identificador del préstamo" }
                loanId: { type: string, format: uuid }
      responses:
        "200":
          description: Devuelto
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Loan" }
        "404": { $ref: "#/components/responses/Conflict" }
components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: ludoteca_session
  schemas:
    Loan:
      type: object
      required: [id, status, game, player, requestedAt]
      properties:
        id: { type: string, format: uuid }
        status: { enum: [REQUESTED, DELIVERED, RETURNED, CANCELLED] }
        game: { type: object, properties: { id: { type: string }, name: { type: string } } }
        player: { type: object, properties: { id: { type: string }, name: { type: string } } }
        requestedAt: { type: string, format: date-time }
        deliveredAt: { type: string, format: date-time, nullable: true }
        returnedAt: { type: string, format: date-time, nullable: true }
        version: { type: integer }
    Problem:
      type: object
      required: [type, title, status, code]
      properties:
        type: { type: string }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        code: { type: string, example: GAME_NOT_AVAILABLE }
  responses:
    Conflict:
      description: Regla de negocio incumplida
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
    Forbidden:
      description: Sin permiso
      content:
        application/problem+json:
          schema: { $ref: "#/components/schemas/Problem" }
```

Códigos de error estables: `EVENT_CLOSED`, `GAME_NOT_AVAILABLE`, `LOAN_ALREADY_ACTIVE`, `ADULT_REQUIRED`, `PROFILE_INCOMPLETE`, `QR_INVALID`, `QR_EXPIRED`, `QR_ALREADY_USED`, `GAME_ON_LOAN`, `FORBIDDEN`, `IMPORT_BLOCKED`.
