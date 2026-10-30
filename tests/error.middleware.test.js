
import { test, expect, jest } from "@jest/globals";
import { errorHandler } from "../src/middleware/error.middleware.js";

test("unique constraint errors should return 409", () => {
  const error = new Error("Duplicate email");
  error.name = "SequelizeUniqueConstraintError";

  const req = {};
  const res = {
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  const consoleSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});

  try {
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "A record with this value already exists",
    });
  } finally {
    consoleSpy.mockRestore();
  }
});
