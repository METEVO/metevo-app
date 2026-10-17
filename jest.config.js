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
  testEnvironment: 'node',
};
