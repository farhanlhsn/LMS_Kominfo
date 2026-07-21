/** Minimal OpenAPI 3.0 document for core LMS/auth surfaces (hand-maintained). */
export function buildOpenApiDocument() {
  return {
    openapi: "3.0.3",
    info: {
      title: "LMS API",
      version: "1.0.0",
      description:
        "Multi-tenant LMS REST API under /api/v1. Full surface is larger; this doc covers auth, health, and core learner/instructor paths.",
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        organizationHeader: {
          type: "apiKey",
          in: "header",
          name: "x-organization-id",
        },
      },
      schemas: {
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {},
            meta: { type: "object", additionalProperties: true },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: {},
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [], organizationHeader: [] }],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          security: [],
          summary: "Dependency health",
          responses: {
            "200": {
              description: "Health payload",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiSuccess" },
                },
              },
            },
          },
        },
      },
      "/health/live": {
        get: {
          tags: ["Health"],
          security: [],
          summary: "Liveness",
          responses: { "200": { description: "OK" } },
        },
      },
      "/health/metrics": {
        get: {
          tags: ["Health"],
          security: [],
          summary: "Process metrics (private / token)",
          parameters: [
            {
              name: "x-metrics-token",
              in: "header",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Metrics snapshot" },
            "403": { description: "Restricted" },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Tokens + user" },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current user + active organization",
          responses: {
            "200": { description: "Session user" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/courses": {
        get: {
          tags: ["Catalog"],
          summary: "Published course catalog (paginated)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Catalog page" } },
        },
      },
      "/courses/{slugOrId}": {
        get: {
          tags: ["Catalog"],
          summary: "Course detail",
          parameters: [
            {
              name: "slugOrId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Course" } },
        },
      },
      "/my/enrollments": {
        get: {
          tags: ["Learning"],
          summary: "Current user enrollments",
          responses: { "200": { description: "Enrollment list" } },
        },
      },
      "/learn/courses/{courseId}": {
        get: {
          tags: ["Learning"],
          summary: "Learning workspace course payload",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Enrollment + curriculum + progress" } },
        },
      },
      "/payments/confirm": {
        post: {
          tags: ["Marketplace"],
          summary: "Submit payment proof (PENDING → AWAITING_REVIEW)",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["paymentId"],
                  properties: {
                    paymentId: { type: "string" },
                    bankName: { type: "string" },
                    accountName: { type: "string" },
                    accountNumber: { type: "string" },
                    proofImageUrl: { type: "string" },
                    notes: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Payment updated" },
            "404": { description: "Not found / not owned" },
          },
        },
      },
      "/payments/approve": {
        post: {
          tags: ["Marketplace"],
          summary: "Admin approve payment (AWAITING_REVIEW → PAID + enroll)",
          responses: {
            "200": { description: "Approved" },
            "403": { description: "Forbidden" },
          },
        },
      },
      "/orders": {
        post: {
          tags: ["Marketplace"],
          summary: "Create order for course IDs",
          responses: { "200": { description: "Order created" } },
        },
      },
      "/orders/mine": {
        get: {
          tags: ["Marketplace"],
          summary: "List my orders",
          responses: { "200": { description: "Paginated orders" } },
        },
      },
      "/orders/{id}": {
        get: {
          tags: ["Marketplace"],
          summary: "Get own order by id",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Order" },
            "404": { description: "Not found / not owned" },
          },
        },
      },
      "/learn/notes": {
        get: {
          tags: ["Learning"],
          summary: "List private learner notes",
          responses: { "200": { description: "Notes" } },
        },
        post: {
          tags: ["Learning"],
          summary: "Create private note",
          responses: { "200": { description: "Created note" } },
        },
      },
      "/learn/notes/{noteId}": {
        patch: {
          tags: ["Learning"],
          summary: "Update own note",
          parameters: [
            {
              name: "noteId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Updated" },
            "403": { description: "Not owner" },
            "404": { description: "Not found" },
          },
        },
        delete: {
          tags: ["Learning"],
          summary: "Soft-delete own note",
          parameters: [
            {
              name: "noteId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Deleted" },
            "404": { description: "Not found" },
          },
        },
      },
      "/learn/goals": {
        get: {
          tags: ["Learning"],
          summary: "List learning goals",
          responses: { "200": { description: "Goals" } },
        },
        post: {
          tags: ["Learning"],
          summary: "Create learning goal",
          responses: { "200": { description: "Created" } },
        },
      },
      "/code-runner/execute": {
        post: {
          tags: ["Code runner"],
          summary: "Execute code in sandbox (Judge0 in prod)",
          responses: {
            "200": { description: "Execution result" },
            "400": { description: "Sandbox disabled / invalid" },
          },
        },
      },
      "/openapi/json": {
        get: {
          tags: ["Docs"],
          security: [],
          summary: "This OpenAPI document",
          responses: { "200": { description: "OpenAPI JSON" } },
        },
      },
    },
  };
}
