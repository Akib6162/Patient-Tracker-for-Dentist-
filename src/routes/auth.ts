import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-change-me";

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/login
   * Authenticates a user and returns a 7-day JWT access token.
   */
  app.post<{
    Body: {
      email?: string;
      password?: string;
    };
  }>("/login", async (req, reply) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return reply.status(400).send({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Fetch user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return reply.status(401).send({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return reply.status(401).send({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Sign 7d JWT token
    const payload = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "7d",
    });

    reply.send({
      status: "ok",
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  });
}
