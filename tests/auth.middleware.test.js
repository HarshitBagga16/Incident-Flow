
import { test, expect, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../src/middleware/auth.middleware.js";

test("missing token should return 401", () => {
  const req = { headers: {} };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  authenticateToken(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test("invalid token should return 401", () => {
  process.env.JWT_SECRET = "incidentflow-test-secret";

  const req = {
    headers: {
      authorization: "Bearer invalid-token",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  authenticateToken(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test("valid token should populate req.user", () => {
  process.env.JWT_SECRET = "incidentflow-test-secret";

  const token = jwt.sign(
    { sub: "1", role: "engineer" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  authenticateToken(req, res, next);

  expect(req.user.sub).toBe("1");
  expect(req.user.role).toBe("engineer");
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});
