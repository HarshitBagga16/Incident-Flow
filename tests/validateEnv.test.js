
import { jest } from "@jest/globals";
import { validateEnv } from "../src/config/validateEnv.js";

describe("Environment validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };

    process.env.DB_NAME = "test_db";
    process.env.DB_USER = "test_user";
    process.env.DB_PASSWORD = "test_password";
    process.env.DB_HOST = "localhost";
    process.env.DB_PORT = "5432";
    process.env.JWT_SECRET = "a".repeat(40);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("accepts valid configuration", () => {
    expect(() => validateEnv()).not.toThrow();
  });

  test("rejects a missing JWT secret", () => {
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  test("rejects an invalid database port", () => {
    process.env.DB_PORT = "invalid";

    expect(() => validateEnv()).toThrow(/DB_PORT/);
  });

  test("rejects a short JWT secret", () => {
    process.env.JWT_SECRET = "short";

    expect(() => validateEnv()).toThrow(/32 characters/);
  });
});
