
import express from "express";
import request from "supertest";
import rateLimit from "express-rate-limit";

describe("Rate limiter", () => {
  test("should return 429 when the request limit is exceeded", async () => {
    const app = express();

    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 2,
        standardHeaders: false,
        legacyHeaders: false,
        message: { message: "Too many requests" },
      })
    );

    app.get("/test", (req, res) => {
      res.status(200).json({ success: true });
    });

    expect((await request(app).get("/test")).status).toBe(200);
    expect((await request(app).get("/test")).status).toBe(200);
    expect((await request(app).get("/test")).status).toBe(429);
  });
});
