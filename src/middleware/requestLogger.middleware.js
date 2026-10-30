
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import logger from "../utils/logger.js";

const requestLogger = pinoHttp({
  logger,

  genReqId(req, res) {
    const requestId = randomUUID();
    res.setHeader("X-Request-ID", requestId);
    return requestId;
  },

  customLogLevel(req, res, error) {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },

  // Do not log request bodies or sensitive headers.
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
      };
    },
  },
});

export default requestLogger;
