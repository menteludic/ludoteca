import test from 'node:test';
import assert from 'node:assert/strict';

import {openDatabase} from '../../src/infra/sqlite/database.js';
import {applyMigrations, MIGRATIONS, schemaVersion} from '../../src/infra/sqlite/migrations.js';

const now = '2026-11-23T18:00:00.000Z';

/**
 * Abre una base en memoria con el esquema aplicado.
 *
 * @returns {import('node:sqlite').DatabaseSync} Base lista.
 */
const migrated = () => {
  const db = openDatabase(':memory:');
  applyMigrations(db, now);

  return db;
};

/**
 * Inserta lo mínimo para poder crear préstamos.
 *
 * @param {import('node:sqlite').DatabaseSync} db Base abierta.
 * @returns {void}
 */
const seed = (db) => {
  db.exec("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u1', 'a@b.c', 'x', '2026-11-23')");
  db.exec("INSERT INTO users (id, email, password_hash, created_at) VALUES ('u2', 'd@e.f', 'x', '2026-11-23')");
  db.exec(`INSERT INTO events (id, name, starts_at, ends_at, created_at)
           VALUES ('e1', 'Feria', '2026-11-23T09:00:00Z', '2026-11-24T21:00:00Z', '2026-11-23')`);
  db.exec("INSERT INTO games (id, name, created_at) VALUES ('g1', 'Catan', '2026-11-23')");
  db.exec("INSERT INTO games (id, name, created_at) VALUES ('g2', 'Catan (2)', '2026-11-23')");
};

test('el esquema entra entero y deja la versión aplicada', () => {
  const db = migrated();

  assert.equal(schemaVersion(db), MIGRATIONS.at(-1).id);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
    .map((row) => row.name);
  for (const table of ['users', 'sessions', 'events', 'games', 'loans', 'audit_log', 'settings']) {
    assert.equal(tables.includes(table), true, `falta la tabla ${table}`);
  }
});

test('aplicar dos veces no cambia nada', () => {
  const db = migrated();

  const again = applyMigrations(db, now);

  assert.deepEqual(again, {applied: 0, version: MIGRATIONS.at(-1).id});
});

test('la base rechaza dos entregas vivas del mismo juego', () => {
  const db = migrated();
  seed(db);
  const insert = db.prepare(`INSERT INTO loans (id, event_id, game_id, user_id, status, requested_at)
                             VALUES (?, 'e1', ?, ?, ?, ?)`);
  insert.run('l1', 'g1', 'u1', 'DELIVERED', now);

  assert.throws(() => insert.run('l2', 'g1', 'u2', 'DELIVERED', now), /UNIQUE/);
});

test('la base rechaza dos préstamos vivos del mismo jugador', () => {
  const db = migrated();
  seed(db);
  const insert = db.prepare(`INSERT INTO loans (id, event_id, game_id, user_id, status, requested_at)
                             VALUES (?, 'e1', ?, ?, ?, ?)`);
  insert.run('l1', 'g1', 'u1', 'REQUESTED', now);

  assert.throws(() => insert.run('l2', 'g2', 'u1', 'DELIVERED', now), /UNIQUE/);
});

test('un jugador distinto sí puede llevarse el segundo ejemplar', () => {
  const db = migrated();
  seed(db);
  const insert = db.prepare(`INSERT INTO loans (id, event_id, game_id, user_id, status, requested_at)
                             VALUES (?, 'e1', ?, ?, ?, ?)`);
  insert.run('l1', 'g1', 'u1', 'DELIVERED', now);

  insert.run('l2', 'g2', 'u2', 'DELIVERED', now);

  const count = db.prepare("SELECT COUNT(*) AS total FROM loans WHERE status = 'DELIVERED'").get();
  assert.equal(count.total, 2);
});