import "dotenv/config";
import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("⏳ Seeding database...");

  try {
    // 1. Hash passwords
    const doctorPasswordHash = await bcrypt.hash("doctor123", 10);
    const assistantPasswordHash = await bcrypt.hash("assistant123", 10);

    // 2. Insert doctor user
    console.log("Inserting doctor user...");
    const [doctor] = await db.insert(users).values({
      name: "Dr. John Doe",
      email: "doctor@example.com",
      passwordHash: doctorPasswordHash,
      role: "doctor",
    }).returning();

    // 3. Insert assistant user
    console.log("Inserting assistant user...");
    const [assistant] = await db.insert(users).values({
      name: "Jane Smith",
      email: "assistant@example.com",
      passwordHash: assistantPasswordHash,
      role: "assistant",
    }).returning();

    console.log("✅ Seeding complete!");
    console.log("-----------------------------------------");
    console.log("Doctor credentials:");
    console.log(`  Email:    ${doctor.email}`);
    console.log("  Password: doctor123");
    console.log(`  Role:     ${doctor.role}`);
    console.log("-----------------------------------------");
    console.log("Assistant credentials:");
    console.log(`  Email:    ${assistant.email}`);
    console.log("  Password: assistant123");
    console.log(`  Role:     ${assistant.role}`);
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
