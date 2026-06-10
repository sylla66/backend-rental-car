module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  {
    ignores: ['node_modules/**']
  }
];
