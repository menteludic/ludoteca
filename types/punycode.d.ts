/**
 * `punycode` está obsoleto en Node, pero `@types/node` lo referencia desde `url.d.ts`.
 * Con `allowJs` el compilador intentaba analizar `node_modules/punycode/punycode.js`
 * (un fichero antiguo que no typea) y devolvía 28 errores que no son nuestros.
 * Este alias corta esa resolución: el tipo existe, el fichero ajeno no se compila.
 * No se usa en el código; si algún día hace falta, se importa `node:punycode`.
 */
declare module 'punycode' {
  const punycode: {
    decode(input: string): string;
    encode(input: string): string;
    toASCII(input: string): string;
    toUnicode(input: string): string;
    version: string;
  };
  export = punycode;
}