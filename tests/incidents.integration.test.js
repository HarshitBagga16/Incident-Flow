import request from "supertest";
import { jest, test, expect ,beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";

beforeEach(() => {
  jest.clearAllMocks();
});

jest.unstable_mockModule("../src/models/User.js", () => ({
  default: {},
}));

jest.unstable_mockModule("../src/models/Incident.js", () => ({
  default: {
    findAndCountAll: jest.fn(),
    create: jest.fn(),
  },
}));

const { default: Incident } = await import("../src/models/Incident.js");
const { default: app } = await import("../src/app.js");

test("GET /api/incidents should reject requests without a token", async () => {
  const response = await request(app).get("/api/incidents");

  expect(response.status).toBe(401);
});


test("GET /api/incidents should accept a valid JWT", async () => {
  process.env.JWT_SECRET = "test-secret-for-incidentflow";
  Incident.findAndCountAll.mockResolvedValue({
    count: 0,
    rows: [],
  });

  const token = jwt.sign(
    { sub: "1", role: "engineer" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );

  const response = await request(app)
    .get("/api/incidents")
    .set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty("success", true);
});


test("POST /api/incidents should create an incident with valid input", async () => {
  process.env.JWT_SECRET = "test-secret-for-incidentflow";

  const token = jwt.sign(
    { sub: "1", role: "engineer" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  Incident.create.mockResolvedValue({
    id: 101,
    title: "API is unavailable",
    description: "The customer API is returning server errors.",
    severity: "high",
    status: "open",
    userId: 1,
    isArchived: false,
  });

  const response = await request(app)
    .post("/api/incidents")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "API is unavailable",
      description: "The customer API is returning server errors.",
      severity: "high",
    });

  expect(response.status).toBe(201);
  expect(Incident.create).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "API is unavailable",
      description: "The customer API is returning server errors.",
      severity: "high",
      userId: 1,
    })
  );
});


test("POST /api/incidents should reject invalid input with 400", async () => {
  process.env.JWT_SECRET = "test-secret-for-incidentflow";

  const token = jwt.sign(
    { sub: "1", role: "engineer" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  const response = await request(app)
    .post("/api/incidents")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Bug",
      description: "Short",
      severity: "extreme",
    });

  expect(response.status).toBe(400);
  expect(Incident.create).not.toHaveBeenCalled();
});



test("GET /api/incidents should support pagination", async () => {
  process.env.JWT_SECRET = "test-secret-for-incidentflow";

  const token = jwt.sign(
    { sub: "1", role: "engineer" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  Incident.findAndCountAll.mockResolvedValue({
    count: 25,
    rows: [
      {
        id: 11,
        title: "Login bug",
        description: "Login fails intermittently",
        severity: "high",
        status: "open",
        userId: 1,
        isArchived: false,
      },
    ],
  });

  const response = await request(app)
    .get("/api/incidents?page=2&limit=10")
    .set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(200);
  expect(Incident.findAndCountAll).toHaveBeenCalledWith(
    expect.objectContaining({
      limit: 10,
      offset: 10,
    })
  );
});


test("GET /api/incidents should filter by status and severity", async () => {
  process.env.JWT_SECRET = "test-secret-for-incidentflow";

  const token = jwt.sign(
    { sub: "1", role: "engineer" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  Incident.findAndCountAll.mockResolvedValue({
    count: 0,
    rows: [],
  });

  const response = await request(app)
    .get("/api/incidents?status=open&severity=high")
    .set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(200);

  expect(Incident.findAndCountAll).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        status: "open",
        severity: "high",
        isArchived: false,
      }),
    })
  );
});

test("GET /api/incidents should support search", async () => {
  process.env.JWT_SECRET = "test-secret-for-incidentflow";

  const token = jwt.sign(
    { sub: "1", role: "engineer" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  Incident.findAndCountAll.mockResolvedValue({
    count: 0,
    rows: [],
  });

  const response = await request(app)
    .get("/api/incidents?search=login")
    .set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(200);

  expect(Incident.findAndCountAll).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        isArchived: false,
      }),
    })
  );

  const queryOptions = Incident.findAndCountAll.mock.calls[0][0];

  expect(queryOptions.where).toHaveProperty("userId", 1);
  expect(queryOptions.where).toHaveProperty("isArchived", false);
});

