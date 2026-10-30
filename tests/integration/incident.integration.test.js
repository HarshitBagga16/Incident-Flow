import request from "supertest";
import app from "../../src/app.js";
import sequelize from "../../src/config/database.js";
import { User, Incident } from "../../src/models/associations.js";
import { hash } from "bcrypt";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

describe("Incident API - PostgreSQL Integration", () => {
  const testEmail = "incident.integration@test.com";
  let user;
  let accessToken;

  beforeAll(async () => {
    if (process.env.NODE_ENV !== "test") {
      throw new Error("Tests must run in test environment");
    }

    await sequelize.authenticate();

    expect(sequelize.getDatabaseName()).toBe("incidentflow_test");
  });

  beforeEach(async () => {
    user = await User.create({
      name: "Incident Tester",
      email: testEmail,
      password: await hash("StrongPassword123!", 10),
      role: "engineer",
    });

    accessToken = jwt.sign(
      {
        sub: String(user.id),
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
  });

  afterEach(async () => {
    await Incident.destroy({ where: { userId: user.id }, force: true });
    await User.destroy({ where: { id: user.id }, force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });
  test("should connect to the test PostgreSQL database", async () => {
    expect(sequelize.getDatabaseName()).toBe("incidentflow_test");
  });

  test("should create an incident in PostgreSQL", async () => {
    const incidentData = {
      title: "Production API is down",
      description: "Users are unable to access the production API.",
      severity: "critical",
    };

    const response = await request(app)
      .post("/api/incidents")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(incidentData);

    expect(response.status).toBe(201);

    expect(response.body).toHaveProperty("success", true);

    const incident = await Incident.findOne({
      where: {
        title: incidentData.title,
        userId: user.id,
      },
    });

    expect(incident).not.toBeNull();
    expect(incident.description).toBe(incidentData.description);
    expect(incident.severity).toBe("critical");
    expect(incident.status).toBe("open");
  });

  test("should fetch incidents from PostgreSQL", async () => {
    // First create an incident directly in PostgreSQL
    const createdIncident = await Incident.create({
      title: "Database connection failure",
      description: "Application cannot connect to PostgreSQL.",
      severity: "high",
      status: "open",
      userId: user.id,
    });

    // Fetch incidents through the actual API
    const response = await request(app)
      .get("/api/incidents")
      .set("Authorization", `Bearer ${accessToken}`);

    // console.log("GET INCIDENT RESPONSE:", response.body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const incidents = response.body.incidents;

    expect(Array.isArray(incidents)).toBe(true);

    const foundIncident = incidents.find(
      (incident) => incident.id === createdIncident.id,
    );

    expect(foundIncident).toBeDefined();
    expect(foundIncident.title).toBe("Database connection failure");
  });

  test("should update an incident in PostgreSQL", async () => {
    // Create an incident directly in PostgreSQL
    const incident = await Incident.create({
      title: "Payment service issue",
      description: "Payment service is responding slowly.",
      severity: "medium",
      status: "open",
      userId: user.id,
    });

    // Update it through the actual API
    const response = await request(app)
      .patch(`/api/incidents/${incident.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        status: "in_progress",
        severity: "high",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify the actual database record
    await incident.reload();

    expect(incident.status).toBe("in_progress");
    expect(incident.severity).toBe("high");
  });

  test("should archive an incident in PostgreSQL", async () => {
    // Create an incident
    const incident = await Incident.create({
      title: "Old server outage",
      description: "Server outage has already been resolved.",
      severity: "high",
      status: "resolved",
      userId: user.id,
    });

    // Archive through the API
    const response = await request(app)
      .delete(`/api/incidents/${incident.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify it still exists in PostgreSQL
    await incident.reload();

    expect(incident.isArchived).toBe(true);

    // Verify normal listing excludes archived incidents
    const listResponse = await request(app)
      .get("/api/incidents")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);

    const archivedIncident = listResponse.body.incidents.find(
      (item) => item.id === incident.id,
    );

    expect(archivedIncident).toBeUndefined();
  });

  test("should prevent users from updating another user's incident", async () => {
    // User A (current test user) creates an incident
    const incident = await Incident.create({
      title: "Confidential production issue",
      description: "This incident belongs to another engineer.",
      severity: "high",
      status: "open",
      userId: user.id,
    });

    // Create User B
    const anotherUser = await User.create({
      name: "Another Engineer",
      email: `another-${randomUUID()}@test.com`,
      password: await hash("StrongPassword123!", 10),
      role: "engineer",
    });

    try {
      const anotherUserToken = jwt.sign(
        {
          sub: String(anotherUser.id),
          email: anotherUser.email,
          role: anotherUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );

      // User B tries to update User A's incident
      const response = await request(app)
        .patch(`/api/incidents/${incident.id}`)
        .set("Authorization", `Bearer ${anotherUserToken}`)
        .send({
          status: "resolved",
        });

      expect(response.status).toBe(404);

      // Confirm original incident remains unchanged
      await incident.reload();

      expect(incident.status).toBe("open");
    } finally {
      // Clean up User B
      await User.destroy({
        where: { id: anotherUser.id },
        force: true,
      });
    }
  });

  test("should prevent viewers from changing incident status", async () => {
    const viewer = await User.create({
      name: "Viewer Tester",
      email: `viewer-${randomUUID()}@test.com`,
      password: await hash("StrongPassword123!", 10),
      role: "viewer",
    });

    try {
      const viewerToken = jwt.sign(
        {
          sub: String(viewer.id),
          email: viewer.email,
          role: viewer.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );

      const incident = await Incident.create({
        title: "Viewer permission test",
        description: "Testing viewer role restrictions.",
        severity: "medium",
        status: "open",
        userId: viewer.id,
      });

      const response = await request(app)
        .patch(`/api/incidents/${incident.id}`)
        .set("Authorization", `Bearer ${viewerToken}`)
        .send({ status: "resolved" });

      expect(response.status).toBe(403);

      await incident.reload();
      expect(incident.status).toBe("open");
    } finally {
      await Incident.destroy({
        where: { userId: viewer.id },
        force: true,
      });

      // Then delete viewer
      await User.destroy({
        where: { id: viewer.id },
        force: true,
      });
    }
  });
  
test("should allow viewers to update incident title and description", async () => {
  const viewer = await User.create({
    name: "Viewer Editor",
    email: `viewer-${randomUUID()}@test.com`,
    password: await hash("StrongPassword123!", 10),
    role: "viewer",
  });

  try {
    const viewerToken = jwt.sign(
      {
        sub: String(viewer.id),
        email: viewer.email,
        role: viewer.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const incident = await Incident.create({
      title: "Original incident title",
      description: "Original incident description.",
      severity: "medium",
      status: "open",
      userId: viewer.id,
    });

    const response = await request(app)
      .patch(`/api/incidents/${incident.id}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        title: "Updated incident title",
        description: "Updated incident description.",
      });

    expect(response.status).toBe(200);

    await incident.reload();

    expect(incident.title).toBe("Updated incident title");
    expect(incident.description).toBe("Updated incident description.");
    expect(incident.status).toBe("open");
    expect(incident.severity).toBe("medium");
  } finally {
    await Incident.destroy({
      where: { userId: viewer.id },
      force: true,
    });

    await User.destroy({
      where: { id: viewer.id },
      force: true,
    });
  }
});



test("should allow admin to update another user's incident", async () => {
  const admin = await User.create({
    name: "Admin Tester",
    email: `admin-${randomUUID()}@test.com`,
    password: await hash("StrongPassword123!", 10),
    role: "admin",
  });

  try {
    const adminToken = jwt.sign(
      {
        sub: String(admin.id),
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Create an incident owned by the existing engineer
    const incident = await Incident.create({
      title: "Engineer production incident",
      description: "Critical production issue requiring admin attention.",
      severity: "high",
      status: "open",
      userId: user.id,
    });

    // Admin updates another user's incident
    const response = await request(app)
      .patch(`/api/incidents/${incident.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "resolved",
      });

    expect(response.status).toBe(200);

    await incident.reload();

    expect(incident.status).toBe("resolved");
  } finally {
    await User.destroy({
      where: { id: admin.id },
      force: true,
    });
  }
});


});
