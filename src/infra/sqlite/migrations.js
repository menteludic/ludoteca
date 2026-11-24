/**
 * Schema migrations. They run in order, once each, inside a transaction. The id
 * is the version number `/health` publishes.
 *
 * The SQL lives here and not in loose files so the image does not depend on
 * copying paths: what runs is what is read.
 *
 * @typedef {{id: number, name: string, sql: string}} Migration
 */
/** @type {Migration[]} */
const MIGRATIONS = [
  {
    id: 1,
    name: 'init',
    sql: `
      CREATE TABLE users (
        id                 TEXT PRIMARY KEY,
        email              TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash      TEXT,
        google_sub         TEXT UNIQUE,
        facebook_sub       TEXT UNIQUE,
        first_name         TEXT,
        last_name          TEXT,
        dni_encrypted      BLOB,
        dni_masked         TEXT,
        adult_confirmed_at TEXT,
        created_at         TEXT NOT NULL,
        updated_at         TEXT,
        CHECK (google_sub IS NOT NULL OR facebook_sub IS NOT NULL OR password_hash IS NOT NULL)
      );

      CREATE TABLE user_roles (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role    TEXT NOT NULL CHECK (role IN ('player','controller','event_admin','analyst','app_admin')),
        PRIMARY KEY (user_id, role)
      );

      CREATE TABLE sessions (
        id          TEXT PRIMARY KEY,
        token_hash  BLOB NOT NULL UNIQUE,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at  TEXT NOT NULL,
        expires_at  TEXT NOT NULL,
        revoked_at  TEXT,
        user_agent  TEXT
      );
      CREATE INDEX sessions_user ON sessions(user_id);

      CREATE TABLE email_tokens (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash BLOB NOT NULL UNIQUE,
        purpose    TEXT NOT NULL DEFAULT 'reset' CHECK (purpose IN ('reset')),
        expires_at TEXT NOT NULL,
        used_at    TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX email_tokens_user ON email_tokens(user_id, expires_at);

      CREATE TABLE events (
        id                  TEXT PRIMARY KEY,
        name                TEXT NOT NULL,
        description         TEXT,
        instructions        TEXT,
        privacy_policy      TEXT,
        starts_at           TEXT NOT NULL,
        ends_at             TEXT NOT NULL,
        timezone            TEXT NOT NULL DEFAULT 'Europe/Madrid',
        allow_local         INTEGER NOT NULL DEFAULT 1,
        allow_google        INTEGER NOT NULL DEFAULT 0,
        allow_facebook      INTEGER NOT NULL DEFAULT 0,
        request_ttl_minutes INTEGER NOT NULL DEFAULT 15 CHECK (request_ttl_minutes BETWEEN 1 AND 120),
        panel_loans_limit   INTEGER NOT NULL DEFAULT 5 CHECK (panel_loans_limit BETWEEN 1 AND 20),
        panel_ranking_limit INTEGER NOT NULL DEFAULT 5 CHECK (panel_ranking_limit BETWEEN 1 AND 20),
        manual_closed_until TEXT,
        created_by          TEXT REFERENCES users(id),
        created_at          TEXT NOT NULL,
        CHECK (ends_at > starts_at),
        CHECK (allow_local + allow_google + allow_facebook >= 1)
      );
      CREATE INDEX events_starts ON events(starts_at);

      CREATE TABLE time_slots (
        id        TEXT PRIMARY KEY,
        event_id  TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        starts_at TEXT NOT NULL,
        ends_at   TEXT NOT NULL,
        CHECK (ends_at > starts_at)
      );
      CREATE INDEX slots_event ON time_slots(event_id, starts_at);

      CREATE TABLE games (
        id           TEXT PRIMARY KEY,
        bgg_id       TEXT,
        name         TEXT NOT NULL,
        year         INTEGER,
        copy_label   TEXT,
        image_path   TEXT,
        image_status TEXT NOT NULL DEFAULT 'pending'
                     CHECK (image_status IN ('pending','ok','none','error')),
        retired      INTEGER NOT NULL DEFAULT 0,
        notes        TEXT,
        created_at   TEXT NOT NULL
      );
      CREATE INDEX games_bgg ON games(bgg_id);
      CREATE INDEX games_name ON games(name COLLATE NOCASE);

      CREATE TABLE event_games (
        event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        game_id       TEXT NOT NULL REFERENCES games(id),
        blocked       INTEGER NOT NULL DEFAULT 0,
        block_reason  TEXT,
        manually_lent INTEGER NOT NULL DEFAULT 0,
        updated_by    TEXT REFERENCES users(id),
        updated_at    TEXT,
        PRIMARY KEY (event_id, game_id)
      );

      CREATE TABLE loans (
        id            TEXT PRIMARY KEY,
        event_id      TEXT NOT NULL REFERENCES events(id),
        game_id       TEXT NOT NULL REFERENCES games(id),
        user_id       TEXT NOT NULL REFERENCES users(id),
        status        TEXT NOT NULL CHECK (status IN ('REQUESTED','DELIVERED','RETURNED','CANCELLED')),
        requested_at  TEXT NOT NULL,
        delivered_at  TEXT,
        delivered_by  TEXT REFERENCES users(id),
        returned_at   TEXT,
        returned_by   TEXT REFERENCES users(id),
        closed_reason TEXT,
        corrected     INTEGER NOT NULL DEFAULT 0,
        version       INTEGER NOT NULL DEFAULT 1,
        CHECK (delivered_at IS NULL OR delivered_at >= requested_at),
        CHECK (returned_at IS NULL OR delivered_at IS NOT NULL)
      );
      CREATE UNIQUE INDEX loans_one_delivered_per_game
        ON loans(game_id) WHERE status = 'DELIVERED';
      CREATE UNIQUE INDEX loans_one_active_per_user
        ON loans(user_id) WHERE status IN ('REQUESTED','DELIVERED');
      CREATE INDEX loans_event ON loans(event_id, status);
      CREATE INDEX loans_user ON loans(user_id, requested_at);

      CREATE TABLE qr_tokens (
        token_hash BLOB PRIMARY KEY,
        loan_id    TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        used_at    TEXT
      );
      CREATE INDEX qr_loan ON qr_tokens(loan_id);

      CREATE TABLE audit_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_id   TEXT REFERENCES users(id),
        action     TEXT NOT NULL,
        entity     TEXT NOT NULL,
        entity_id  TEXT,
        data       TEXT,
        created_at TEXT NOT NULL,
        prev_hash  BLOB,
        hash       BLOB NOT NULL
      );
      CREATE INDEX audit_entity ON audit_log(entity, entity_id);
      CREATE INDEX audit_created ON audit_log(created_at);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `,
  },
];

/**
 * Builds the migration runner.
 *
 * @param {object} config Module configuration.
 * @param {{exec: Function, prepare: Function}} config.database Open database.
 * @param {() => string} [config.clock] Returns the ISO instant to record.
 * @returns {{apply: Function, version: Function}} Migration runner.
 */
const Migrations = ({database, clock = () => new Date().toISOString()}) => {
  /**
   * Creates the ledger table when it is missing. It is the first thing the
   * runner needs.
   *
   * @returns {void}
   */
  const ensureLedger = () => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL,
        applied_at  TEXT NOT NULL
      );
    `);
  };

  /**
   * Applies the pending migrations in order, one transaction each. It is
   * idempotent: calling it twice changes nothing.
   *
   * @returns {{applied: number, version: number}} Applied count and final version.
   */
  const apply = () => {
    ensureLedger();
    const done = new Set(
      /** @type {Array<{id: number}>} */ (database.prepare('SELECT id FROM schema_migrations').all())
        .map((row) => row.id),
    );
    let applied = 0;

    for (const migration of MIGRATIONS) {
      if (done.has(migration.id)) continue;
      database.exec('BEGIN');
      try {
        database.exec(migration.sql);
        database.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)')
          .run(migration.id, migration.name, clock());
        database.exec('COMMIT');
        applied += 1;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }

    return {applied, version: version()};
  };

  /**
   * Schema version applied to this database (0 when there is none yet).
   *
   * @returns {number} Id of the last applied migration.
   */
  const version = () => {
    const row = /** @type {{version: number | null} | undefined} */ (
      database.prepare('SELECT MAX(id) AS version FROM schema_migrations').get()
    );

    return row?.version ?? 0;
  };

  return Object.freeze({apply, version});
};

export {Migrations};
