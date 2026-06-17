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
      { name: "Evaluations", description: "Performance evaluation management for supervisors" },
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
