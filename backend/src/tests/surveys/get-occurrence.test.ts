import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../core/database/prisma.service";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: jest.fn((req: any, _res: unknown, next: () => void) => {
    req.user = { id: "test-hr-user-id", role: "HR" };
    next();
  }),
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    surveyOccurrence: {
      findUnique: jest.fn(),
    },
  },
}));

const occurrenceFindUniqueMock = prisma.surveyOccurrence.findUnique as jest.Mock;

const URL = "/api/v1/pulse/occurrences";

describe("GET /api/v1/pulse/occurrences/:occurrenceId", () => {
  beforeEach(() => {
    occurrenceFindUniqueMock.mockReset();
  });

  it("returns 403 for non-HR roles", async () => {
    const authMock = jest.requireMock("../../core/middleware/auth.middleware");
    authMock.authenticate.mockImplementationOnce(
      (req: any, _res: unknown, next: () => void) => {
        req.user = { id: "test-employee-user-id", role: "EMPLOYEE" };
        next();
      },
    );

    const response = await request(app).get(`${URL}/occ-001`).expect(403);
    expect(response.body).toMatchObject({ success: false });
  });

  it("returns 404 for unknown occurrence ID", async () => {
    occurrenceFindUniqueMock.mockResolvedValue(null);

    const response = await request(app).get(`${URL}/nonexistent-id`).expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Occurrence not found",
      errorCode: "OCCURRENCE_NOT_FOUND",
    });
  });

  it("returns correct detail and counts", async () => {
    const mockOccurrence = {
      id: "occ-001",
      surveyId: "survey-001",
      occurrenceNumber: 1,
      releaseDate: new Date("2026-06-18T00:00:00.000Z"),
      deadline: new Date("2026-06-19T00:00:00.000Z"),
      isClosed: false,
      createdAt: new Date("2026-06-18T00:00:00.000Z"),
      updatedAt: new Date("2026-06-18T00:00:00.000Z"),
      _count: {
        audienceMembers: 5,
        completions: 2,
      },
    };

    occurrenceFindUniqueMock.mockResolvedValue(mockOccurrence);

    const response = await request(app).get(`${URL}/occ-001`).expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Pulse survey occurrence retrieved successfully",
      data: {
        id: "occ-001",
        surveyId: "survey-001",
        occurrenceNumber: 1,
        releaseDate: "2026-06-18T00:00:00.000Z",
        deadline: "2026-06-19T00:00:00.000Z",
        isClosed: false,
        audienceSize: 5,
        completionCount: 2,
      },
    });

    expect(occurrenceFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "occ-001" },
      select: {
        id: true,
        surveyId: true,
        occurrenceNumber: true,
        releaseDate: true,
        deadline: true,
        isClosed: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            audienceMembers: true,
            completions: true,
          },
        },
      },
    });
  });
});
