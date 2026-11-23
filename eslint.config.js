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
        {selector: 'ClassDeclaration', message: 'Composición de funciones: sin clases.'},
        {selector: 'ClassExpression', message: 'Composición de funciones: sin clases.'},
        {selector: 'NewExpression', message: 'Sin new en el núcleo; el borde construye y pasa los datos.'},
        {selector: 'ThisExpression', message: 'Sin this en el núcleo.'},
        {selector: "CallExpression[callee.name='Date']", message: 'El instante se pasa como parámetro.'},
      ],
    },
  },
  {
    files: ['src/domain/**/*.js'],
    rules: {
      'no-restricted-imports': ['error', {patterns: [{group: ['*'], message: 'domain no importa nada externo: solo módulos relativos.'}]}],
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