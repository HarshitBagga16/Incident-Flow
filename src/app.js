//This is used for config express application i.e middleware ,routes , error handling
import express from "express";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { authenticateToken } from "./middleware/auth.middleware.js";
import { authorization } from "./middleware/authorize.middleware.js";
import incidentRoutes from "./routes/incident.routes.js";
import { apiRateLimiter } from "./middleware/apiRateLimit.middleware.js";
import requestLogger from "./middleware/requestLogger.middleware.js";
import helmet from "helmet";
import corsMiddleware from "./config/cors.js";

const app = express();
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());

app.use(requestLogger);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is up and running" });
})

app.get("/api/protected", authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "You accessed a protected route",
    user: req.user,
  });
});

app.get(
  "/api/admin-only",
  authenticateToken,
  authorization("admin"),
  (req, res) => {
    res.json({ message: "Welcome, admin!" });
  }
);
app.use("/api", apiRateLimiter); 
app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use(errorHandler);
export default app;