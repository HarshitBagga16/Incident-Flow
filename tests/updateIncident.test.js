
import { jest } from "@jest/globals";

jest.unstable_mockModule("../src/models/Incident.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

const { default: Incident } = await import("../src/models/Incident.js");
const { updateIncident } = await import(
  "../src/controllers/incident.controller.js"
);

const makeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("updateIncident permissions", () => {
  let res;
  let next;
  let incident;

  beforeEach(() => {
    jest.clearAllMocks();

    res = makeResponse();
    next = jest.fn();

    incident = {
      update: jest.fn().mockResolvedValue(undefined),
    };

    Incident.findOne.mockResolvedValue(incident);
  });

  test("viewer can edit their own title", async () => {
    await updateIncident(
      {
        params: { id: "1" },
        user: { sub: "10", role: "viewer" },
        body: { title: "Corrected incident title" },
      },
      res,
      next
    );

    expect(Incident.findOne).toHaveBeenCalledWith({
  where: { id: "1", isArchived: false, userId: 10 },
});
    expect(incident.update).toHaveBeenCalledWith({
      title: "Corrected incident title",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("viewer cannot change incident status", async () => {
    await updateIncident(
      {
        params: { id: "1" },
        user: { sub: "10", role: "viewer" },
        body: { status: "resolved" },
      },
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Incident.findOne).not.toHaveBeenCalled();
    expect(incident.update).not.toHaveBeenCalled();
  });

  test("engineer cannot edit another user's incident", async () => {
    Incident.findOne.mockResolvedValue(null);

    await updateIncident(
      {
        params: { id: "1" },
        user: { sub: "20", role: "engineer" },
        body: { title: "Changed title" },
      },
      res,
      next
    );

    expect(Incident.findOne).toHaveBeenCalledWith({
  where: { id: "1", isArchived: false, userId: 20 },
});
    expect(res.status).toHaveBeenCalledWith(404);
    expect(incident.update).not.toHaveBeenCalled();
  });

  test("admin can edit another user's incident", async () => {
    await updateIncident(
      {
        params: { id: "1" },
        user: { sub: "99", role: "admin" },
        body: { status: "resolved" },
      },
      res,
      next
    );

    expect(Incident.findOne).toHaveBeenCalledWith({
  where: { id: "1", isArchived: false },
});
    expect(incident.update).toHaveBeenCalledWith({
      status: "resolved",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});


test("viewer should not be allowed to update incident status", async () => {
  const req = {
    params: { id: "1" },
    body: { status: "resolved" },
    user: { sub: "1", role: "viewer" },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  // Reuse the same Incident mock/setup used by your existing
  // updateIncident tests so that the incident is found.

  await updateIncident(req, res);

  expect(res.status).toHaveBeenCalledWith(403);
});
