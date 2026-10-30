const requiredEnvVars = [
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "DB_HOST",
  "DB_PORT",
  "JWT_SECRET",
];

export function validateEnv() {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key]?.trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Validate database port
  const port = Number(process.env.DB_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be a valid port number");
  }

  // Validate JWT secret
  const jwtSecret = process.env.JWT_SECRET;

  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }

  // Reject common insecure placeholder secrets
  const insecureSecrets = [
    "secret",
    "your-secret",
    "change-me",
    "password",
  ];

  if (insecureSecrets.includes(jwtSecret.toLowerCase())) {
    throw new Error("JWT_SECRET must not use a default placeholder value");
  }

  // Validate environment
  const allowedEnvironments = ["development", "test", "production"];

  if (
    process.env.NODE_ENV &&
    !allowedEnvironments.includes(process.env.NODE_ENV)
  ) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
}