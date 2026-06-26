export default {
  displayName: 'cli',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: { module: 'commonjs', target: 'ES2022', esModuleInterop: true, strict: true } }]
  },
  testMatch: ['**/*.spec.ts'],
  coverageDirectory: '../../coverage/tools/cli',
};
