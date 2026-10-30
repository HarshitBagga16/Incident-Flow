import request from "supertest";
import app from "../src/app.js";

describe("CORS middleware", () => {
  it("should allow requests from approved origins", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:3000");

    expect(response.statusCode).toBe(200);

    expect(response.headers["access-control-allow-origin"])
      .toBe("http://localhost:3000");
  });

  it("should not allow unapproved origins", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://malicious-site.com");

    expect(response.statusCode).toBe(200);

    expect(response.headers["access-control-allow-origin"])
      .toBeUndefined();
  });

  it("should allow requests without an origin", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
  });
});