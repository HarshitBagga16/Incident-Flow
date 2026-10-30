import request from "supertest";
import app from "../src/app.js";
import {test, expect } from "@jest/globals";

test("GET /health should return 200", async () => {
  const response = await request(app).get("/health");

  expect(response.status).toBe(200);
});
