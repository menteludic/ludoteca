import assert from 'node:assert/strict';
import {scryptSync, randomBytes, timingSafeEqual} from 'node:crypto';
import test from 'node:test';

import {Passwords} from '../../src/infra/auth/passwords.js';

const passwords = Passwords({crypto: {scryptSync, randomBytes, timingSafeEqual}});

test('a hash verifies against its own password', () => {
  const stored = passwords.hash('correct horse battery staple');

  assert.equal(passwords.verify('correct horse battery staple', stored), true);
});

test('a hash rejects any other password', () => {
  const stored = passwords.hash('correct horse battery staple');

  assert.equal(passwords.verify('correct horse battery stapl', stored), false);
  assert.equal(passwords.verify('', stored), false);
});

test('the stored value never carries the password', () => {
  const stored = passwords.hash('correct horse battery staple');

  assert.equal(stored.includes('correct horse'), false);
  assert.match(stored, /^scrypt\$131072\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
});

test('two hashes of the same password differ, because the salt does', () => {
  const first = passwords.hash('correct horse battery staple');
  const second = passwords.hash('correct horse battery staple');

  assert.notEqual(first, second);
  assert.equal(passwords.verify('correct horse battery staple', second), true);
});

test('a damaged stored value is a failed verification, not a crash', () => {
  assert.equal(passwords.verify('anything', 'not-a-hash'), false);
  assert.equal(passwords.verify('anything', 'scrypt$131072$8$1$only-four-fields'), false);
  assert.equal(passwords.verify('anything', ''), false);
});
test('an empty password is refused, not hashed', () => {
  assert.throws(() => passwords.hash(''), /password is empty/);
  assert.throws(() => passwords.hash(/** @type {any} */ (undefined)), /password is empty/);
});

test('a stored value with other work factors is refused', () => {
  const stored = passwords.hash('correct horse battery staple');
  const cheaper = stored.replace('$131072$', '$16384$');

  assert.equal(passwords.verify('correct horse battery staple', cheaper), false);
});

test('a stored value whose key is too short is refused', () => {
  const stored = passwords.hash('correct horse battery staple');
  const fields = stored.split('$');
  fields[5] = Buffer.alloc(8).toString('base64');

  assert.equal(passwords.verify('correct horse battery staple', fields.join('$')), false);
});
