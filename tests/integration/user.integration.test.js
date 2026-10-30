
import { jest } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import sequelize from "../../src/config/database.js";
import User from "../../src/models/User.js";
import RefreshToken from "../../src/models/RefreshToken.js";
import { hashRefreshToken } from "../../src/utils/refreshToken.js";

describe("User API - PostgreSQL Integration", () => {
  let testEmail;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Integration tests must use NODE_ENV=test");
    }

    if (process.env.DB_NAME === "incidentflow_test") {
      throw new Error("Test database configuration needs review");
    }

    await sequelize.authenticate();

    expect(sequelize.getDatabaseName()).toBe("incidentflow_test");

  });

  beforeEach(() => {
    testEmail = `integration-${Date.now()}-${Math.random()}@example.com`;
  });

  afterEach(async () => {
  const user = await User.findOne({
    where: { email: testEmail },
  });

  if (user) {
    const RefreshToken = (await import("../../src/models/RefreshToken.js")).default;

    await RefreshToken.destroy({
      where: { userId: user.id },
    });

    await User.destroy({
      where: { id: user.id },
    });
  }
});

  afterAll(async () => {
    await sequelize.close();
  });

  test("should register a user in PostgreSQL", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Integration Tester",
        email: testEmail,
        password: "StrongPassword123!",
      });

    expect(response.status).toBe(201);

    const savedUser = await User.findOne({
      where: { email: testEmail },
    });

    expect(savedUser).not.toBeNull();
    expect(savedUser.name).toBe("Integration Tester");
    expect(savedUser.email).toBe(testEmail);
    expect(savedUser.password).not.toBe("StrongPassword123!");
  });
  
test("should login a registered user and store refresh token in PostgreSQL", async () => {
  const password = "StrongPassword123!";

  // Register user first
  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Integration Tester",
      email: testEmail,
      password,
    });

  expect(registerResponse.status).toBe(201);

  // Login with registered credentials
  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email: testEmail,
      password,
    });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body).toHaveProperty("token");
  expect(loginResponse.body.token).toBeTruthy();

  expect(loginResponse.body).toHaveProperty("refreshToken");

  // Verify refresh token is stored as a hash
  const user = await User.findOne({
    where: { email: testEmail },
  });

  const RefreshToken = (await import("../../src/models/RefreshToken.js")).default;

  const storedToken = await RefreshToken.findOne({
    where: { userId: user.id },
  });

  expect(storedToken).not.toBeNull();
  expect(storedToken.tokenHash).not.toBe(loginResponse.body.refreshToken);
  expect(storedToken.familyId).toBeTruthy();
});

test("should rotate refresh token in PostgreSQL", async () => {
  const password = "StrongPassword123!";

  // Register
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Rotation Tester",
      email: testEmail,
      password,
    });

  // Login
  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email: testEmail,
      password,
    });

  expect(loginResponse.status).toBe(200);

  const oldRefreshToken = loginResponse.body.refreshToken;

  const user = await User.findOne({
    where: { email: testEmail },
  });

  const oldStoredToken = await RefreshToken.findOne({
    where: {
      userId: user.id,
      tokenHash: hashRefreshToken(oldRefreshToken),
    },
  });

  expect(oldStoredToken).not.toBeNull();
  expect(oldStoredToken.revokedAt).toBeNull();

  // Rotate token
  const refreshResponse = await request(app)
    .post("/api/auth/refresh")
    .send({
      refreshToken: oldRefreshToken,
    });

  expect(refreshResponse.status).toBe(200);
  expect(refreshResponse.body.token).toBeTruthy();
  expect(refreshResponse.body.refreshToken).toBeTruthy();

  const newRefreshToken = refreshResponse.body.refreshToken;

  // Verify old token is revoked
  await oldStoredToken.reload();

  expect(oldStoredToken.revokedAt).not.toBeNull();

  // Verify new token exists in PostgreSQL
  const newStoredToken = await RefreshToken.findOne({
    where: {
      userId: user.id,
      tokenHash: hashRefreshToken(newRefreshToken),
    },
  });

  expect(newStoredToken).not.toBeNull();
  expect(newStoredToken.revokedAt).toBeNull();

  // Both tokens must belong to the same family
  expect(newStoredToken.familyId).toBe(oldStoredToken.familyId);
});

test("should logout and revoke refresh token in PostgreSQL", async () => {
  const password = "StrongPassword123!";

  // Register
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Logout Tester",
      email: testEmail,
      password,
    });

  // Login
  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email: testEmail,
      password,
    });

  expect(loginResponse.status).toBe(200);

  const accessToken = loginResponse.body.token;
  const refreshToken = loginResponse.body.refreshToken;

  // Verify token exists
  const user = await User.findOne({
    where: { email: testEmail },
  });

  const storedToken = await RefreshToken.findOne({
    where: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
    },
  });

  expect(storedToken).not.toBeNull();
  expect(storedToken.revokedAt).toBeNull();

  // Logout
  const logoutResponse = await request(app)
    .post("/api/auth/logout")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ refreshToken });

  expect(logoutResponse.status).toBe(200);

  // Verify revocation in PostgreSQL
  await storedToken.reload();

  expect(storedToken.revokedAt).not.toBeNull();
});

test("should detect refresh token reuse and revoke token family", async () => {
  const password = "StrongPassword123!";

  // Register
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Reuse Tester",
      email: testEmail,
      password,
    });

  // Login
  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      email: testEmail,
      password,
    });

  const tokenA = loginResponse.body.refreshToken;

  // First rotation: A -> B
  const rotationResponse = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: tokenA });

  expect(rotationResponse.status).toBe(200);

  const tokenB = rotationResponse.body.refreshToken;

  // Verify B is active
  const user = await User.findOne({
    where: { email: testEmail },
  });

  const storedTokenB = await RefreshToken.findOne({
    where: {
      userId: user.id,
      tokenHash: hashRefreshToken(tokenB),
    },
  });

  expect(storedTokenB).not.toBeNull();
  expect(storedTokenB.revokedAt).toBeNull();

  // Reuse old token A
  const reuseResponse = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: tokenA });

  expect(reuseResponse.status).toBe(401);

  // Verify family revocation
  await storedTokenB.reload();

  expect(storedTokenB.revokedAt).not.toBeNull();
});


});
