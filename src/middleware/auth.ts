import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-change-me";

export interface JWTPayload {
  id: string;
  name: string;
  role: string;
  email: string;
}

/**
 * Fastify preHandler hook to verify the JWT Bearer token
 * and attach the decoded user payload to request.user.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    const queryToken = (request.query as any)?.token;
    
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (queryToken) {
      token = queryToken;
    }

    if (!token) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized: Missing or invalid authorization token",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    request.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
      email: decoded.email,
    };
  } catch (error) {
    return reply.status(401).send({
      status: "error",
      message: "Unauthorized: Invalid or expired token",
    });
  }
}

/**
 * Fastify preHandler hook generator to restrict access to specific roles.
 */
export function requireRole(...allowedRoles: ("doctor" | "assistant")[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        status: "error",
        message: "Unauthorized: Authentication required",
      });
    }

    if (!allowedRoles.includes(request.user.role as any)) {
      return reply.status(403).send({
        status: "error",
        message: "Forbidden: Access denied",
      });
    }
  };
}
