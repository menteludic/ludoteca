import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';

const DOMAIN = new URL('../../src/domain/', import.meta.url).pathname;

/**
 * Reads every module of the domain, at any depth.
 *
 * @param {string} directory Directory to walk.
 * @returns {string[]} Absolute paths of the JavaScript files.
 */
const modules = (directory) =>
  readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return modules(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });

/**
 * Collects the module specifiers a file imports from.
 *
 * @param {string} source File contents.
 * @returns {string[]} Specifiers, in order.
 */
const specifiers = (source) =>
  [...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1] ?? '');

test('the domain imports only its own modules and ramda', () => {
  const files = modules(DOMAIN);
  assert.ok(files.length >= 1, 'the walk found no domain modules');

  for (const file of files) {
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
      assert.ok(
        isRelative || specifier === 'ramda',
        `${file.replace(DOMAIN, 'src/domain/')} imports ${specifier}`,
      );
    }
  }
});

test('the domain never reaches for a Node builtin or a framework', () => {
  for (const file of modules(DOMAIN)) {
    const source = readFileSync(file, 'utf8');
    assert.equal(/from\s+'node:/.test(source), false, `${file} imports a Node builtin`);
    assert.equal(/from\s+'(hono|zod|better-sqlite3)/.test(source), false, `${file} imports a framework`);
  }
});