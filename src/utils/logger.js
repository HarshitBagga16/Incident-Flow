import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "password",
      "req.headers.authorization",
      "req.headers.cookie",
      "refreshToken",
      "token",
    ],
    censor: "[REDACTED]",
  },
});

export default logger;
