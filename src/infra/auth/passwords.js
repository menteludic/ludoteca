/**
 * Hashing and verification of account passwords (SEC-01).
 *
 * scrypt with the work factors fixed by the project document: N=2^17, r=8, p=1,
 * a 32 byte random salt and a 64 byte output. The stored value is versioned
 * (`scrypt$N$r$p$salt$hash`) so a future change of parameters can read the old
 * rows and rewrite them on the next login instead of forcing a reset.
 */

/** Work factors of the current format. */
const N = 131072;
const R = 8;
const P = 1;
const SALT_BYTES = 32;
const KEY_BYTES = 64;
/** A kibibyte, the step of the memory units. */
const KIBIBYTE = 1024;
/** A mebibyte, to size the memory limit in a unit a person reads. */
const MEBIBYTE = KIBIBYTE * KIBIBYTE;
/** scrypt needs 128*N*r bytes; the default 32 MiB limit is not enough. */
const MAX_MEM_MIB = 256;
const MAX_MEM = MAX_MEM_MIB * MEBIBYTE;
/** A stored value has six fields: `scrypt$N$r$p$salt$hash`. */
const STORED_FIELDS = 6;

/**
 * @typedef {object} CryptoPrimitives
 * @property {typeof import('node:crypto').scryptSync} scryptSync
 * @property {typeof import('node:crypto').randomBytes} randomBytes
 * @property {typeof import('node:crypto').timingSafeEqual} timingSafeEqual
 */

/**
 * Builds the password module.
 *
 * @param {{crypto: CryptoPrimitives}} config Crypto primitives, injection so
 *   tests can pin them and the core keeps no ambient state.
 * @returns {{hash: (password: string) => string,
 *   verify: (password: string, stored: string) => boolean}} Frozen module.
 */
const Passwords = ({crypto}) => {
  const {scryptSync, randomBytes, timingSafeEqual} = crypto;

  /**
   * Derives a key from a password and a salt.
   *
   * @param {string} password Plain password.
   * @param {Buffer} salt Salt bytes.
   * @param {number} keyBytes Wanted key length.
   * @returns {Buffer} Derived key.
   */
  const derive = (password, salt, keyBytes) =>
    scryptSync(password, salt, keyBytes, {N, r: R, p: P, maxmem: MAX_MEM});

  /**
   * Hashes a password with a fresh salt.
   *
   * @param {string} password Plain password.
   * @returns {string} Versioned stored value.
   */
  const hash = (password) => {
    if (typeof password !== 'string' || password === '') {
      throw new Error('password is empty');
    }

    const salt = randomBytes(SALT_BYTES);
    const key = derive(password, salt, KEY_BYTES);

    return [
      'scrypt', N, R, P,
      salt.toString('base64'),
      key.toString('base64'),
    ].join('$');
  };

  /**
   * Compares a password with a stored value in constant time.
   *
   * A malformed or truncated stored value is a failed verification: a row
   * written by a bug must not turn into a 500 during a login.
   *
   * @param {string} password Plain password.
   * @param {string} stored Value produced by `hash`.
   * @returns {boolean} True when the password matches.
   */
  const verify = (password, stored) => {
    if (typeof password !== 'string' || typeof stored !== 'string' || stored === '') {
      return false;
    }

    const fields = stored.split('$');
    if (fields.length !== STORED_FIELDS || fields[0] !== 'scrypt') return false;

    const [, storedN = '', storedR = '', storedP = '', saltB64 = '', keyB64 = ''] = fields;
    if (Number(storedN) !== N || Number(storedR) !== R || Number(storedP) !== P) return false;

    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(keyB64, 'base64');
    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;

    const actual = derive(password, salt, expected.length);

    return timingSafeEqual(actual, expected);
  };

  return Object.freeze({hash, verify});
};

export {Passwords};