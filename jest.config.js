import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/services/(.*)$": "<rootDir>/lib/services/$1",
    "^@/config/(.*)$": "<rootDir>/lib/config/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/contexts/(.*)$": "<rootDir>/contexts/$1",
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!jest.config.js",
    "!jest.setup.js",
    "!next.config.*",
    "!**/workers/**",
    "!**/.wrangler/**",
    "!tailwind.config.ts",
    "!app/fonts.ts",
    "!app/layout.tsx",
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig);
