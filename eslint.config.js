import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

const googleStyle = {
  indent: ['error', 2, {SwitchCase: 1}],
  semi: ['error', 'always'],
  quotes: ['error', 'single', {avoidEscape: true}],
  'max-len': ['error', {code: 100, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true}],
  'comma-dangle': ['error', 'always-multiline'],
  'object-curly-spacing': ['error', 'never'],
  'array-bracket-spacing': ['error', 'never'],
  'space-before-function-paren': ['error', {anonymous: 'always', named: 'never', asyncArrow: 'always'}],
  'keyword-spacing': 'error',
  'space-infix-ops': 'error',
  eqeqeq: ['error', 'always'],
  curly: ['error', 'multi-line'],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-console': 'error',
  'max-lines': ['error', 300],
};

export default [
  {ignores: ['node_modules/**', 'coverage/**', 'data/**', '.tmp/**']},
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: {...globals.node},
    },
    rules: googleStyle,
  },
  {
    files: ['src/**/*.js'],
    plugins: {jsdoc},
    rules: {
      // A number in the middle of an expression says nothing about what it is.
      // Named constants say it once, where it is defined.
      'no-magic-numbers': ['error', {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        detectObjects: false,
        enforceConst: true,
      }],
    },
  },
  {
    files: ['src/**/*.js'],
    plugins: {jsdoc},
    rules: {
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        contexts: [
          'ExportNamedDeclaration > FunctionDeclaration',
          'ExportDefaultDeclaration > FunctionDeclaration',
          'ExportNamedDeclaration > VariableDeclaration',
        ],
      }],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/check-param-names': 'error',
    },
  },
  {
    files: ['src/domain/**/*.js', 'src/app/**/*.js'],
    rules: {
      'no-restricted-syntax': ['error',
        {selector: 'ClassDeclaration', message: 'Function composition: no classes.'},
        {selector: 'ClassExpression', message: 'Function composition: no classes.'},
        // No `new` of our own classes, and no global clock either: the calendar
        // arrives as a dependency. `Error` is the one exception, because a
        // missing dependency is a programming fault, not a library to swap.
        {selector: "NewExpression:not([callee.name='Error'])",
          message: 'No new in the core; the edge builds and passes data in.'},
        {selector: 'ThisExpression', message: 'No this in the core.'},
        {selector: "CallExpression[callee.name='Date']", message: 'The instant arrives as a parameter.'},
        // Naming a clock, a calendar or a random source is the same fault as
        // building one: they all arrive as dependencies from the edge.
        {selector: "Identifier[name='Date'], Identifier[name='Intl'], Identifier[name='crypto']",
          message: 'Environment globals arrive as dependencies; no rule names them.'},
      ],
    },
  },
  {
    files: ['src/domain/**/*.js'],
    rules: {
      // Ramda is allowed: it is a set of pure functions with no I/O, so it does
      // not couple the domain to a framework. Everything else stays out.
      'no-restricted-imports': ['error', {
        patterns: [{group: ['*', '!ramda'], message: 'domain imports only relative modules and ramda.'}],
      }],
    },
  },
  {
    files: ['src/bootstrap/**/*.js', 'src/cli.js'],
    rules: {'no-console': 'off'},
  },
  {
    files: ['test/**/*.js'],
    rules: {'max-lines': 'off', 'jsdoc/require-jsdoc': 'off'},
  },
];