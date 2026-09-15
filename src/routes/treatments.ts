import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { treatments } from "../db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";

export async function treatmentsRoutes(app: FastifyInstance) {
  // ── Register Global Auth Hook for all routes in this plugin ────────────────
  app.addHook("preHandler", authenticate);

  // ── POST /api/treatments ───────────────────────────────────────────────────
  // Doctor only
  app.post<{
    Body: {
      patientId: string;
      notes: string;
    };
  }>("/", { preHandler: requireRole("doctor") }, async (req, reply) => {
    const { patientId, notes } = req.body;

    if (!patientId) {
      return reply.status(400).send({
        status: "error",
        message: "patientId is required",
      });
    }

    const [created] = await db
      .insert(treatments)
      .values({
        patientId,
        notes,
        updatedBy: req.user!.id,
      })
      .returning();

    reply.status(201).send({ status: "ok", data: created });
  });

  // ── PUT /api/treatments/:id ────────────────────────────────────────────────
  // Doctor only
  app.put<{
    Params: { id: string };
    Body: {
      notes: string;
    };
  }>("/:id", { preHandler: requireRole("doctor") }, async (req, reply) => {
    const { id } = req.params;
    const { notes } = req.body;

    const [updated] = await db
      .update(treatments)
      .set({
        notes,
        updatedBy: req.user!.id,
      })
      .where(eq(treatments.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ status: "error", message: "Treatment record not found" });
    }

    reply.send({ status: "ok", data: updated });
  });
}
