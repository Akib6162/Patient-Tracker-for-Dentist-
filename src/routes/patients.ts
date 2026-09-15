import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { patients, billing, treatments } from "../db/schema";
import { and, or, eq, ilike, count } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { broadcast } from "../lib/sse";

export async function patientRoutes(app: FastifyInstance) {
  // ── Register Global Auth Hook for all routes in this plugin ────────────────
  app.addHook("preHandler", authenticate);

  // ── GET /api/patients ──────────────────────────────────────────────────────
  // Both roles can access
  app.get<{
    Querystring: {
      search?: string;
      status?: string;
      page?: string;
      limit?: string;
    };
  }>("/", async (req, reply) => {
    const search = req.query.search;
    const status = req.query.status;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(patients.name, `%${search}%`),
          ilike(patients.phone, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(patients.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(patients)
      .where(whereClause);

    const total = Number(countResult?.total ?? 0);

    // Get data
    const data = await db
      .select({
        id: patients.id,
        name: patients.name,
        age: patients.age,
        phone: patients.phone,
        address: patients.address,
        status: patients.status,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        paymentStatus: billing.paymentStatus,
      })
      .from(patients)
      .leftJoin(billing, eq(patients.id, billing.patientId))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    reply.send({
      status: "ok",
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  });

  // ── POST /api/patients ─────────────────────────────────────────────────────
  // Assistant only
  app.post<{
    Body: {
      name: string;
      age?: number;
      phone?: string;
      address?: string;
    };
  }>("/", { preHandler: requireRole("assistant") }, async (req, reply) => {
    const { name, age, phone, address } = req.body;

    if (!name) {
      return reply.status(400).send({
        status: "error",
        message: "Name is required",
      });
    }

    const [created] = await db
      .insert(patients)
      .values({
        name,
        age,
        phone,
        address,
        status: "pending",
        createdBy: req.user!.id,
      })
      .returning();

    broadcast("invalidate_patients");
    reply.status(201).send({ status: "ok", data: created });
  });

  // ── PUT /api/patients/:id ──────────────────────────────────────────────────
  // Assistant only
  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      age?: number;
      phone?: string;
      address?: string;
    };
  }>("/:id", { preHandler: requireRole("assistant") }, async (req, reply) => {
    const { id } = req.params;
    const { name, age, phone, address } = req.body;

    const [updated] = await db
      .update(patients)
      .set({
        name,
        age,
        phone,
        address,
        updatedAt: new Date(),
      })
      .where(eq(patients.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ status: "error", message: "Patient not found" });
    }

    broadcast("invalidate_patients");
    reply.send({ status: "ok", data: updated });
  });

  // ── DELETE /api/patients/:id ───────────────────────────────────────────────
  // Assistant only - hard delete (using a transaction to clean up dependent records)
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: requireRole("assistant") },
    async (req, reply) => {
      const { id } = req.params;

      try {
        await db.transaction(async (tx) => {
          // Check patient exists
          const [patient] = await tx.select().from(patients).where(eq(patients.id, id));
          if (!patient) {
            const err = new Error("Patient not found");
            (err as any).statusCode = 404;
            throw err;
          }

          // Delete dependent billing and treatment entries
          await tx.delete(treatments).where(eq(treatments.patientId, id));
          await tx.delete(billing).where(eq(billing.patientId, id));
          // Delete patient
          await tx.delete(patients).where(eq(patients.id, id));
        });

        broadcast("invalidate_patients");
        reply.send({ status: "ok", message: "Patient deleted successfully" });
      } catch (err: any) {
        if (err.statusCode === 404) {
          return reply.status(404).send({ status: "error", message: "Patient not found" });
        }
        throw err;
      }
    }
  );

  // ── PATCH /api/patients/:id/approve ────────────────────────────────────────
  // Doctor only
  app.patch<{ Params: { id: string } }>(
    "/:id/approve",
    { preHandler: requireRole("doctor") },
    async (req, reply) => {
      const { id } = req.params;

      const [updated] = await db
        .update(patients)
        .set({
          status: "approved",
          approvedBy: req.user!.id,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, id))
        .returning();

      if (!updated) {
        return reply.status(404).send({ status: "error", message: "Patient not found" });
      }

      broadcast("invalidate_patients");
      reply.send({ status: "ok", data: updated });
    }
  );

  // ── PATCH /api/patients/:id/treated ────────────────────────────────────────
  // Doctor only
  app.patch<{ Params: { id: string } }>(
    "/:id/treated",
    { preHandler: requireRole("doctor") },
    async (req, reply) => {
      const { id } = req.params;

      const [updated] = await db
        .update(patients)
        .set({
          status: "treated",
          updatedAt: new Date(),
        })
        .where(eq(patients.id, id))
        .returning();

      if (!updated) {
        return reply.status(404).send({ status: "error", message: "Patient not found" });
      }

      await db
        .update(treatments)
        .set({
          completed: true,
          completedAt: new Date(),
        })
        .where(eq(treatments.patientId, id));

      broadcast("invalidate_patients");
      reply.send({ status: "ok", data: updated });
    }
  );

  // ── GET /api/patients/:id ──────────────────────────────────────────────────
  // Both roles can access
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = req.params;

    const [patient] = await db.select().from(patients).where(eq(patients.id, id));

    if (!patient) {
      return reply.status(404).send({ status: "error", message: "Patient not found" });
    }

    const billingInfo = await db.select().from(billing).where(eq(billing.patientId, id));
    const treatmentInfo = await db.select().from(treatments).where(eq(treatments.patientId, id));

    reply.send({
      status: "ok",
      data: {
        ...patient,
        billing: billingInfo,
        treatments: treatmentInfo,
      },
    });
  });
}
