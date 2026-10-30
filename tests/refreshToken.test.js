
import { jest, test, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../src/models/User.js", () => ({
  default: {
    findByPk: jest.fn(),
  },
}));

jest.unstable_mockModule("../src/models/RefreshToken.js", () => ({
  default: {
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    sequelize: {
      transaction: jest.fn(),
    },
  },
}));

const { default: User } = await import("../src/models/User.js");
const { default: RefreshToken } = await import(
  "../src/models/RefreshToken.js"
);
const { refreshAccessToken } = await import(
  "../src/controllers/auth.controller.js"
);

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = "test-secret-for-incidentflow";
});

test("missing refresh token should return 400", async () => {
  const req = { body: {} };
  const res = makeResponse();
  const next = jest.fn();

  await refreshAccessToken(req, res, next);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(RefreshToken.findOne).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});

test("unknown refresh token should return 401", async () => {
  RefreshToken.findOne.mockResolvedValue(null);

  const req = { body: { refreshToken: "unknown-token" } };
  const res = makeResponse();
  const next = jest.fn();

  await refreshAccessToken(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(RefreshToken.update).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});


test("reused revoked token should revoke its active family tokens", async () => {
  RefreshToken.findOne.mockResolvedValue({
    id: 10,
    userId: 1,
    familyId: "test-family-id",
    revokedAt: new Date(Date.now() - 60_000),
    expiresAt: new Date(Date.now() + 60_000),
  });

  RefreshToken.update.mockResolvedValue([2]);

  const req = {
    body: { refreshToken: "previously-used-token" },
  };
  const res = makeResponse();
  const next = jest.fn();

  await refreshAccessToken(req, res, next);

  expect(RefreshToken.update).toHaveBeenCalledWith(
    { revokedAt: expect.any(Date) },
    expect.objectContaining({
      where: expect.objectContaining({
        familyId: "test-family-id",
        revokedAt: null,
      }),
    })
  );

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    message: "Refresh token reuse detected. Please log in again.",
  });
  expect(next).not.toHaveBeenCalled();
});


test("valid refresh token should rotate and return new tokens", async () => {
  const oldToken = "valid-old-refresh-token";

  RefreshToken.findOne.mockResolvedValue({
    id: 10,
    userId: 1,
    familyId: "test-family-id",
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  });

  User.findByPk.mockResolvedValue({
    id: 1,
    role: "engineer",
  });

  // Mock a successful Sequelize transaction.
  RefreshToken.sequelize.transaction.mockImplementation(
    async (callback) => callback("mock-transaction")
  );

  RefreshToken.update.mockResolvedValue([1]);
  RefreshToken.create.mockResolvedValue({ id: 11 });

  const req = {
    body: { refreshToken: oldToken },
  };
  const res = makeResponse();
  const next = jest.fn();

  await refreshAccessToken(req, res, next);

  expect(RefreshToken.findOne).toHaveBeenCalledTimes(1);
  expect(RefreshToken.update).toHaveBeenCalledWith(
    { revokedAt: expect.any(Date) },
    expect.objectContaining({
      where: expect.objectContaining({
        id: 10,
        revokedAt: null,
      }),
      transaction: "mock-transaction",
    })
  );

  expect(RefreshToken.create).toHaveBeenCalledTimes(1);
  expect(RefreshToken.create).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 1,
      familyId: "test-family-id",
      tokenHash: expect.any(String),
      expiresAt: expect.any(Date),
    }),
    { transaction: "mock-transaction" }
  );

  expect(res.status).toHaveBeenCalledWith(200);

  const body = res.json.mock.calls[0][0];

  expect(body.success).toBe(true);
  expect(body.token).toBeTruthy();
  expect(body.refreshToken).toBeTruthy();
  expect(body.refreshToken).not.toBe(oldToken);
  expect(next).not.toHaveBeenCalled();
});


test("expired refresh token should return 401 without rotating", async () => {
  RefreshToken.findOne.mockResolvedValue({
    id: 12,
    userId: 1,
    familyId: "expired-family",
    revokedAt: null,
    expiresAt: new Date(Date.now() - 60_000),
  });

  const req = {
    body: { refreshToken: "expired-refresh-token" },
  };
  const res = makeResponse();
  const next = jest.fn();

  await refreshAccessToken(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(RefreshToken.update).not.toHaveBeenCalled();
  expect(RefreshToken.create).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});
