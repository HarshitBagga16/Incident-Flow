
import { test, expect, jest } from "@jest/globals";
import { authorization} from "../src/middleware/authorize.middleware.js";

test("missing authenticated user should return 401", () => {
  const req = {};

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  authorization("admin")(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test("engineer should be forbidden from admin-only route", () => {
  const req = {
    user: {
      sub: "1",
      role: "engineer",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  authorization("admin")(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});

test("admin should be allowed on admin-only route", () => {
  const req = {
    user: {
      sub: "2",
      role: "admin",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  authorization("admin")(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});
