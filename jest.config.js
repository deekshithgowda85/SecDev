/* eslint-disable @typescript-eslint/no-require-imports */
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",

  transform: {
    ...tsJestTransformCfg,
  },

  collectCoverage: true,

  collectCoverageFrom: [
    "lib/**/*.{ts,js}",
    "!**/*.test.ts",
    "!**/*.test.js",
    "!**/__tests__/**",
  ],

  coverageDirectory: "coverage",

  coverageReporters: [
    "text",
    "lcov",
    "html",
  ],
};