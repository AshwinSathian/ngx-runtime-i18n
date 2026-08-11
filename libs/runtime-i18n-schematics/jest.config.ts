export default {
  displayName: 'runtime-i18n-schematics',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleNameMapper: {
    // See src/testing/ora-mock.js: @angular-devkit/schematics/testing pulls
    // in the ESM-only `ora` package transitively; nothing here exercises it.
    '^ora$': '<rootDir>/src/testing/ora-mock.js',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/runtime-i18n-schematics',
};
