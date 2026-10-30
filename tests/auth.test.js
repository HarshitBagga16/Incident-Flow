import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jest, test, expect , beforeEach } from "@jest/globals";


jest.unstable_mockModule("../src/services/auth.services.js", () => ({
  createRefreshToken: jest.fn(),
}));

const { createRefreshToken } = await import(
  "../src/services/auth.services.js"
);
jest.unstable_mockModule("../src/models/User.js", () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

// console.log("Is mock function?", jest.isMockFunction(createRefreshToken));

const { default: User } = await import("../src/models/User.js");
const { registerUser, loginUser } = await import(
  "../src/controllers/auth.controller.js"
);

beforeEach(() => {
  jest.clearAllMocks();
});

test("duplicate email should return 409 and not create a user", async () => {
  User.findOne.mockResolvedValue({
    id: 1,
    email: "harshit@example.com",
  });

  const req = {
    body: {
      name: "Harshit",
      email: "harshit@example.com",
      password: "mypassword123",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  await registerUser(req, res, next);

  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith({
    message: "User with this email already exists",
    success: false,
  });
  expect(User.create).not.toHaveBeenCalled();
});


test("valid registration should create a user and return 201", async () => {
  User.findOne.mockResolvedValue(null);

  User.create.mockImplementation(async (userData) => ({
    id: 1,
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: "engineer",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  }));

  const req = {
    body: {
      name: "Harshit",
      email: "harshit@example.com",
      password: "mypassword123",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  await registerUser(req, res, next);

  expect(res.status).toHaveBeenCalledWith(201);
  expect(User.create).toHaveBeenCalledTimes(1);

  const savedUser = User.create.mock.calls[0][0];

  expect(savedUser.password).not.toBe("mypassword123");
  expect(savedUser.password).toMatch(/^\$2[aby]\$/);

  expect(res.json).toHaveBeenCalledWith({
    message: "User registered successfully",
    success: true,
    user: {
      id: 1,
      name: "Harshit",
      email: "harshit@example.com",
      role: "engineer",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
});


test("missing fields should return 400 without querying the database", async () => {
  const req = {
    body: {
      name: "",
      email: "harshit@example.com",
      password: "mypassword123",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  await registerUser(req, res, next);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    message: "All fields are required",
    success: false,
  });

  expect(User.findOne).not.toHaveBeenCalled();
  expect(User.create).not.toHaveBeenCalled();
});


test("unknown email should return 401", async () => {
  User.findOne.mockResolvedValue(null);

  const req = {
    body: {
      email: "unknown@example.com",
      password: "mypassword123",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  await loginUser(req, res, next);
//   if (next.mock.calls.length > 0) {
//   console.error("Login error:", next.mock.calls[0][0]);
// }

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    message: "Invalid email or password",
  });
  expect(next).not.toHaveBeenCalled();
});

test("incorrect password should return 401", async () => {
  const passwordHash = await bcrypt.hash("correctPassword123", 10);

  User.findOne.mockResolvedValue({
    id: 1,
    email: "harshit@example.com",
    password: passwordHash,
    role: "engineer",
  });

  const req = {
    body: {
      email: "harshit@example.com",
      password: "wrongPassword123",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  await loginUser(req, res, next);
//   if (next.mock.calls.length > 0) {
//   console.error("Login error:", next.mock.calls[0][0]);
// }

  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    message: "Invalid email or password",
  });
  expect(next).not.toHaveBeenCalled();
});

test("valid credentials should return a verifiable JWT", async () => {
  process.env.JWT_SECRET = "test-secret-for-incidentflow";
  createRefreshToken.mockResolvedValue({
  token: "test-refresh-token",
  familyId: "test-family-id",
});

  const passwordHash = await bcrypt.hash("correctPassword123", 10);

  User.findOne.mockResolvedValue({
    id: 1,
    name: "Harshit",
    email: "harshit@example.com",
    password: passwordHash,
    role: "engineer",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  const req = {
    body: {
      email: "harshit@example.com",
      password: "correctPassword123",
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const next = jest.fn();

  await loginUser(req, res, next);
//   if (next.mock.calls.length > 0) {
//   console.error("Login error:", next.mock.calls[0][0]);
// }

  expect(res.status).toHaveBeenCalledWith(200);

  const responseBody = res.json.mock.calls[0][0];

  expect(responseBody.success).toBe(true);
  expect(responseBody.message).toBe("Login successful");
  expect(responseBody.user.email).toBe("harshit@example.com");
  expect(createRefreshToken).toHaveBeenCalledWith(1);
  expect(responseBody.refreshToken).toBe("test-refresh-token");

  const decoded = jwt.verify(
    responseBody.token,
    process.env.JWT_SECRET
  );

  expect(decoded.sub).toBe("1");
  expect(decoded.role).toBe("engineer");
  expect(decoded.exp).toBeDefined();
  expect(next).not.toHaveBeenCalled();
});
