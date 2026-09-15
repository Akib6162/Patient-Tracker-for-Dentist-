import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { billing } from "../db/schema";
import { eq } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { broadcast } from "../lib/sse";

export async function billingRoutes(app: FastifyInstance) {
  // ── Register Global Auth Hook for all routes in this plugin ────────────────
  app.addHook("preHandler", authenticate);

  // ── POST /api/billing ──────────────────────────────────────────────────────
  // Assistant only
  app.post<{
    Body: {
      patient_id?: string;
      patientId?: string;
      total_bill?: number | string;
      totalBill?: number | string;
      amount_paid?: number | string;
      amountPaid?: number | string;
    };
  }>("/", { preHandler: requireRole("assistant") }, async (req, reply) => {
    const patientId = req.body.patient_id ?? req.body.patientId;
    const totalBillVal = req.body.total_bill ?? req.body.totalBill ?? 0;
    const amountPaidVal = req.body.amount_paid ?? req.body.amountPaid ?? 0;

    if (!patientId) {
      return reply.status(400).send({
        status: "error",
        message: "Patient ID is required",
      });
    }

    // Auto-calculate payment status
    const total = Number(totalBillVal);
    const paid = Number(amountPaidVal);
    const paymentStatus = total > 0 && paid >= total ? "clear" : total > 0 ? "due" : "processing";

    const [created] = await db
      .insert(billing)
      .values({
        patientId,
        totalBill: String(totalBillVal),
        amountPaid: String(amountPaidVal),
        paymentStatus,
      })
      .returning();

    broadcast("invalidate_patients");
    reply.status(201).send({ status: "ok", data: created });
  });

  // ── PUT /api/billing/:id ───────────────────────────────────────────────────
  // Assistant only
  app.put<{
    Params: { id: string };
    Body: {
      total_bill?: number | string;
      totalBill?: number | string;
      amount_paid?: number | string;
      amountPaid?: number | string;
    };
  }>("/:id", { preHandler: requireRole("assistant") }, async (req, reply) => {
    const { id } = req.params;

    // Fetch existing record to calculate status using combined values
    const [existing] = await db.select().from(billing).where(eq(billing.id, id));
    if (!existing) {
      return reply.status(404).send({
        status: "error",
        message: "Billing record not found",
      });
    }

    const totalBillVal = req.body.total_bill ?? req.body.totalBill ?? existing.totalBill;
    const amountPaidVal = req.body.amount_paid ?? req.body.amountPaid ?? existing.amountPaid;

    // Auto-recalculate status
    const total = Number(totalBillVal);
    const paid = Number(amountPaidVal);
    const paymentStatus = total > 0 && paid >= total ? "clear" : total > 0 ? "due" : "processing";

    const [updated] = await db
      .update(billing)
      .set({
        totalBill: String(totalBillVal),
        amountPaid: String(amountPaidVal),
        paymentStatus,
        updatedAt: new Date(),
      })
      .where(eq(billing.id, id))
      .returning();

    broadcast("invalidate_patients");
    reply.send({ status: "ok", data: updated });
  });

  // ── DELETE /api/billing/:id ────────────────────────────────────────────────
  // Assistant only
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: requireRole("assistant") }, async (req, reply) => {
    const { id } = req.params;

    const [deleted] = await db.delete(billing).where(eq(billing.id, id)).returning();
    if (!deleted) {
      return reply.status(404).send({
        status: "error",
        message: "Billing record not found",
      });
    }

    broadcast("invalidate_patients");
    reply.send({ status: "ok", message: "Billing record deleted successfully" });
  });

  // ── GET /api/billing/patient/:patient_id ───────────────────────────────────
  // Both roles can access
  app.get<{ Params: { patient_id: string } }>("/patient/:patient_id", async (req, reply) => {
    const { patient_id } = req.params;

    const rows = await db.select().from(billing).where(eq(billing.patientId, patient_id));

    reply.send({ status: "ok", data: rows });
  });
}
