import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  /**
   * GET /health
   * Basic liveness probe — confirms the server is running.
   */
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Health check",
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              timestamp: { type: "string" },
              uptime: { type: "number" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      reply.send({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    }
  );
}
