import { pgTable, uuid, text, integer, numeric, boolean, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    roleCheck: check("role_check", sql`${table.role} in ('doctor', 'assistant')`),
  };
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ─── Patients ────────────────────────────────────────────────────────────────
export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  phone: text("phone"),
  address: text("address"),
  status: text("status").default("pending").notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    statusCheck: check("status_check", sql`${table.status} in ('pending', 'approved', 'treated')`),
  };
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;

// ─── Billing ─────────────────────────────────────────────────────────────────
export const billing = pgTable("billing", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  totalBill: numeric("total_bill", { precision: 10, scale: 2 }).default("0").notNull(),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).default("0").notNull(),
  paymentStatus: text("payment_status").default("processing").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    paymentStatusCheck: check("payment_status_check", sql`${table.paymentStatus} in ('clear', 'due', 'processing')`),
  };
});

export type Billing = typeof billing.$inferSelect;
export type NewBilling = typeof billing.$inferInsert;

// ─── Treatments ──────────────────────────────────────────────────────────────
export const treatments = pgTable("treatments", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  notes: text("notes"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  updatedBy: uuid("updated_by").references(() => users.id).notNull(),
});

export type Treatment = typeof treatments.$inferSelect;
export type NewTreatment = typeof treatments.$inferInsert;
