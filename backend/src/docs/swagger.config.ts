import swaggerJsdoc from "swagger-jsdoc";

const port = process.env.PORT ?? "3001";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ERP API",
      version: "0.1.0",
      description: "Launchpad ERP backend API documentation",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Local development",
      },
    ],
    tags: [
      { name: "System", description: "Health checks and API info" },
      { name: "Auth", description: "Authentication and session" },
      { name: "Dashboard", description: "Home screen stats" },
      { name: "Employees", description: "Employee directory and profile records" },
      { name: "Users", description: "Admin user management (add and deactivate accounts)" },
      { name: "Onboarding", description: "HR employee onboarding (create employee and start onboarding)" },
      { name: "Onboarding Documents", description: "HR required document checklist for employee onboarding" },
      { name: "Document Reviews", description: "HR review of employee onboarding document submissions (approve or reject)" },
      { name: "Onboarding Custom Fields", description: "HR custom text fields for employee onboarding" },
      { name: "Invitations", description: "HR invitation management for onboarding" },
      {
        name: "Employee Onboarding",
        description: "Employee self-service onboarding (accept invite, profile, documents, complete)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Firebase ID token",
        },
      },
    },
  },
  apis: ["./src/docs/**/paths.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
