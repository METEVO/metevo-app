/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          target: 'es2022',
          module: 'commonjs',
          types: ['jest', 'node'],
        },
      },
    ],
  },
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^.+\\.rlnbundle$': '<rootDir>/tests/__mocks__/wallet-bundle.cjs',
    // Explicit .js specifiers (emitted-worklet style) resolve to .ts sources
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
