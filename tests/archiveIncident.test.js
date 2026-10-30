
import { jest } from "@jest/globals";

jest.unstable_mockModule("../src/models/Incident.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

const { default: Incident } = await import("../src/models/Incident.js");
const { archiveIncident } = await import(
  "../src/controllers/incident.controller.js"
);

const makeResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("archiveIncident", () => {
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

  test("owner can archive their own incident", async () => {
    await archiveIncident(
      {
        params: { id: "1" },
        user: { sub: "10", role: "engineer" },
      },
      res,
      next
    );

    expect(Incident.findOne).toHaveBeenCalledWith({
      where: { id: "1", isArchived: false, userId: 10 },
    });

    expect(incident.update).toHaveBeenCalledWith({
      isArchived: true,
    });

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("admin can archive any incident", async () => {
    await archiveIncident(
      {
        params: { id: "1" },
        user: { sub: "99", role: "admin" },
      },
      res,
      next
    );

    expect(Incident.findOne).toHaveBeenCalledWith({
      where: { id: "1", isArchived: false },
    });

    expect(incident.update).toHaveBeenCalledWith({
      isArchived: true,
    });

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("returns 404 if incident is missing or already archived", async () => {
    Incident.findOne.mockResolvedValue(null);

    await archiveIncident(
      {
        params: { id: "1" },
        user: { sub: "10", role: "engineer" },
      },
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(incident.update).not.toHaveBeenCalled();
  });
});
