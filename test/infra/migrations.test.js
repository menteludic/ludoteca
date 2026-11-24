import test from 'node:test';
import assert from 'node:assert/strict';

import {Database} from '../../src/infra/sqlite/database.js';
import {Migrations} from '../../src/infra/sqlite/migrations.js';

const now = '2026-11-23T18:00:00.000Z';

/**
 * Opens a memory database and applies the schema.
 *
 * @returns {{database: object, migrations: object}} Migrated database.
 */
const migrated = () => {
  const database = Database({path: ':memory:'});
  const migrations = Migrations({database, clock: () => now});
  migrations.apply();

  return {database, migrations};
};

/**
 * Inserts the minimum rows needed to create loans.
 *
 * @param {object} database Open database.
 * @returns {void}
 */
const seed = (database) => {
  database.exec("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@b.c', 'x', '2026-11-23')");
  database.exec("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u2', 'd@e.f', 'x', '2026-11-23')");
  database.exec(`INSERT INTO events (id, name, starts_at, ends_at, created_at)
           VALUES ('e1', 'Fair', '2026-11-23T09:00:00Z', '2026-11-24T21:00:00Z', '2026-11-23')`);
  database.exec("INSERT INTO games (id, name, created_at) VALUES ('g1', 'Catan', '2026-11-23')");
  database.exec("INSERT INTO games (id, name, created_at) VALUES ('g2', 'Catan (2)', '2026-11-23')");
};

test('the whole schema goes in and leaves the version recorded', () => {
  const {database, migrations} = migrated();

  assert.equal(migrations.version(), 1);
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
    .map((/** @type {{name: string}} */ row) => row.name);
  for (const table of ['users', 'sessions', 'events', 'games', 'loans', 'audit_log', 'settings']) {
    assert.equal(tables.includes(table), true, `missing table ${table}`);
  }
});

test('applying twice changes nothing', () => {
  const {database, migrations} = migrated();

  const again = migrations.apply();

  assert.deepEqual(again, {applied: 0, version: migrations.version()});
  assert.equal(database.prepare('SELECT COUNT(*) AS total FROM schema_migrations').get().total,
    migrations.version());
});

test('the database refuses two live deliveries of the same game', () => {
  const {database} = migrated();
  seed(database);
  const insert = database.prepare(`INSERT INTO loans (id, event_id, game_id, user_id, status, requested_at)
                             VALUES (?, 'e1', ?, ?, ?, ?)`);
  insert.run('l1', 'g1', 'u1', 'DELIVERED', now);

  assert.throws(() => insert.run('l2', 'g1', 'u2', 'DELIVERED', now), /UNIQUE/);
});

test('the database refuses two live loans for the same player', () => {
  const {database} = migrated();
  seed(database);
  const insert = database.prepare(`INSERT INTO loans (id, event_id, game_id, user_id, status, requested_at)
                             VALUES (?, 'e1', ?, ?, ?, ?)`);
  insert.run('l1', 'g1', 'u1', 'REQUESTED', now);

  assert.throws(() => insert.run('l2', 'g2', 'u1', 'DELIVERED', now), /UNIQUE/);
});

test('a different player may take the second copy', () => {
  const {database} = migrated();
  seed(database);
  const insert = database.prepare(`INSERT INTO loans (id, event_id, game_id, user_id, status, requested_at)
                             VALUES (?, 'e1', ?, ?, ?, ?)`);
  insert.run('l1', 'g1', 'u1', 'DELIVERED', now);

  insert.run('l2', 'g2', 'u2', 'DELIVERED', now);

  const count = database.prepare("SELECT COUNT(*) AS total FROM loans WHERE status = 'DELIVERED'").get();
  assert.equal(count.total, 2);
});
