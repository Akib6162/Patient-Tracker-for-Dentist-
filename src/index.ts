import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { errorHandler } from "./middleware/errorHandler";
import { healthRoutes } from "./routes/health";
import { patientRoutes } from "./routes/patients";
import { authRoutes } from "./routes/auth";
import { billingRoutes } from "./routes/billing";
import { treatmentsRoutes } from "./routes/treatments";
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function bootstrap() {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? true,
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

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen({ port: PORT, host: HOST });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
