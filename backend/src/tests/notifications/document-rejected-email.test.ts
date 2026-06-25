jest.mock("../../core/database/prisma.service", () => ({ prisma: {} }));

import { NotificationsService } from "../../modules/notifications/notifications.service";

const employee = {
  id: "emp-1",
  userId: "user-1",
  companyEmail: "employee@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
};

function buildService() {
  const repository = {
    findEmployeeWithUserById: jest.fn().mockResolvedValue(employee),
    create: jest.fn().mockResolvedValue({
      id: "notif-1",
      type: "ONBOARDING_STATUS",
      subject: "Document needs to be re-uploaded",
      body: "...",
      linkUrl: "/employee/onboarding",
      isRead: false,
      createdAt: new Date("2026-06-21T00:00:00.000Z"),
    }),
  };
  const inAppChannel = { deliver: jest.fn() };
  const emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };
  // Default (no stored prefs) → all channels on, so the email still sends.
  const preferencesRepository = {
    findByEmployeeId: jest.fn().mockResolvedValue(null),
  };
  const service = new NotificationsService(
    repository as never,
    inAppChannel as never,
    emailService as never,
    preferencesRepository as never,
  );
  return { service, repository, inAppChannel, emailService };
}

describe("NotificationsService.notifyEmployeeDocumentRejected", () => {
  it("creates an in-app notification and emails the employee", async () => {
    const { service, repository, inAppChannel, emailService } = buildService();

    await service.notifyEmployeeDocumentRejected(
      "emp-1",
      "NBI Clearance",
      "The scan is too blurry. Please upload a clearer copy.",
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "emp-1",
        subject: "Document needs to be re-uploaded",
        linkUrl: "/employee/onboarding",
      }),
    );
    expect(inAppChannel.deliver).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "employee@example.com",
        subject: "Document needs changes",
        html: expect.stringContaining("NBI Clearance"),
      }),
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("http://localhost:3000/employee/onboarding"),
      }),
    );
  });

  it("does nothing when the employee cannot be found", async () => {
    const { service, repository, inAppChannel, emailService } = buildService();
    repository.findEmployeeWithUserById.mockResolvedValue(null);

    await service.notifyEmployeeDocumentRejected(
      "missing-employee",
      "NBI Clearance",
      "Please upload a clearer copy.",
    );

    expect(repository.create).not.toHaveBeenCalled();
    expect(inAppChannel.deliver).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});
