import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { errorHandler } from "./middleware/errorHandler";
import { healthRoutes } from "./routes/health";
import { patientRoutes } from "./routes/patients";
import { authRoutes } from "./routes/auth";
import { billingRoutes } from "./routes/billing";
import { treatmentsRoutes } from "./routes/treatments";

export async function buildApp() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV !== "production"
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true },
            },
          }
        : false,
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : true,
    credentials: true,
  });

  // ── Global error handler ─────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── Routes ───────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(patientRoutes, { prefix: "/api/patients" });
  await app.register(billingRoutes, { prefix: "/api/billing" });
  await app.register(treatmentsRoutes, { prefix: "/api/treatments" });

  app.get("/api/events", { preHandler: require("./middleware/auth").authenticate }, (req, reply) => {
    const { addClient } = require("./lib/sse");
    addClient(req, reply);
  });

  return app;
}
