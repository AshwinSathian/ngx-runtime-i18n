export default {
  displayName: 'runtime-i18n-schematics',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: {
    // See src/testing/ora-mock.js: @angular-devkit/schematics/testing pulls
    // in the ESM-only `ora` package transitively; nothing here exercises it.
    '^ora$': '<rootDir>/src/testing/ora-mock.ts',
    // See src/testing/magic-string-mock.ts: magic-string is ESM-only (no
    // CJS build at all - Jest's CJS-mode runtime can't execute a .mjs file
    // regardless of transform config, which isn't true of ora's situation).
    // @angular-devkit/schematics/src/tree/recorder.js requires it
    // unconditionally at module load.
    '^magic-string$': '<rootDir>/src/testing/magic-string-mock.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/runtime-i18n-schematics',
};
