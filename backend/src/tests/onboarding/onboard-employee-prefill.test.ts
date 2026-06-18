import request from "supertest";
import { app } from "../../app";
import {
  VALID_PH_EMERGENCY_CONTACT,
  VALID_PH_EMERGENCY_CONTACT_DISPLAY,
  buildHrUser,
  buildOnboardBody,
  buildOnboardBodyWithPrefill,
  buildSupervisorRecord,
  employeeFindFirstMock,
  emergencyContactFindManyMock,
  mockOnboardingTransaction,
  resetOnboardingMocks,
  userFindUniqueMock,
} from "./onboarding-test.helpers";

jest.mock("../../core/middleware/auth.middleware", () => ({
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = buildHrUser();
    next();
  },
}));

jest.mock("../../core/database/prisma.service", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    employee: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    employeeEmergencyContact: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  },
}));

describe("POST /api/v1/onboarding - HR pre-fill profile fields", () => {
  beforeEach(() => {
    resetOnboardingMocks();
  });

  it("saves all pre-fill fields and returns them in the response", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    mockOnboardingTransaction({
      firstName: "John",
      middleName: "Michael",
      lastName: "Doe",
      personalEmail: "john.personal@gmail.com",
      birthday: new Date("1995-06-15T00:00:00.000Z"),
      address: "123 Main St, City, State",
      emergencyContact: VALID_PH_EMERGENCY_CONTACT_DISPLAY,
    });

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send(buildOnboardBodyWithPrefill())
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        employee: {
          firstName: "John",
          middleName: "Michael",
          lastName: "Doe",
          personalEmail: "john.personal@gmail.com",
          birthday: "1995-06-15T00:00:00.000Z",
          address: "123 Main St, City, State",
          emergencyContact: VALID_PH_EMERGENCY_CONTACT_DISPLAY,
        },
      },
    });
  });

  it("supports partial pre-fill with remaining fields as null", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    mockOnboardingTransaction({
      firstName: "John",
      lastName: "Doe",
      middleName: null,
      personalEmail: null,
      birthday: null,
      address: null,
      emergencyContact: null,
    });

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        ...buildOnboardBody(),
        firstName: "John",
        lastName: "Doe",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        employee: {
          firstName: "John",
          lastName: "Doe",
          middleName: null,
          personalEmail: null,
          birthday: null,
          address: null,
          emergencyContact: null,
        },
      },
    });
  });

  it("remains backward compatible when no pre-fill fields are sent", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    mockOnboardingTransaction();

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send(buildOnboardBody())
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        employee: {
          firstName: "new.hire",
          lastName: "",
          middleName: null,
          personalEmail: null,
          birthday: null,
          address: null,
          emergencyContact: null,
        },
      },
    });
  });

  it("returns 400 when birthday is invalid", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        ...buildOnboardBody(),
        birthday: "not-a-date",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Validation failed",
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "birthday",
          message: "Invalid birthday",
        }),
      ],
    });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when birthday is in the future", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        ...buildOnboardBody(),
        birthday: "2099-12-31",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "VALIDATION_FAILED",
      errors: [
        expect.objectContaining({
          field: "birthday",
          message: "Invalid birthday",
        }),
      ],
    });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when emergency contact phone is not a valid Philippine mobile number", async () => {
    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        ...buildOnboardBody(),
        emergencyContact: "Jane Doe - 555-1234",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Emergency contact must include a valid Philippine mobile number",
      errorCode: "INVALID_EMERGENCY_CONTACT_PHONE",
      errors: [
        expect.objectContaining({
          field: "emergencyContact",
        }),
      ],
    });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the emergency contact phone is already assigned to another employee", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    emergencyContactFindManyMock.mockResolvedValue([
      { emergencyContactNumber: "Existing Person - +63 917 123 4567" },
    ]);

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        ...buildOnboardBody(),
        emergencyContact: VALID_PH_EMERGENCY_CONTACT,
      })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      message: "This emergency contact phone number is already assigned to another employee",
      errorCode: "EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE",
      errors: [
        expect.objectContaining({
          field: "emergencyContact",
        }),
      ],
    });
  });

  it("treats differently formatted Philippine numbers as the same phone for duplicate checks", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    emergencyContactFindManyMock.mockResolvedValue([
      { emergencyContactNumber: "+63 917 123 4567" },
    ]);

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        ...buildOnboardBody(),
        emergencyContact: "09171234567",
      })
      .expect(409);

    expect(response.body.errorCode).toBe("EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE");
  });

  it("trims whitespace from pre-fill string fields", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    employeeFindFirstMock.mockResolvedValue(buildSupervisorRecord());
    mockOnboardingTransaction({
      firstName: "John",
      lastName: "Doe",
      address: "456 Oak Ave",
    });

    const response = await request(app)
      .post("/api/v1/onboarding")
      .send({
        ...buildOnboardBody(),
        firstName: "  John  ",
        lastName: "  Doe  ",
        address: "  456 Oak Ave  ",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        employee: {
          firstName: "John",
          lastName: "Doe",
          address: "456 Oak Ave",
        },
      },
    });
  });
});
