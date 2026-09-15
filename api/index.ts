import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildApp } from "../src/app";
import type { FastifyInstance } from "fastify";

let fastifyApp: FastifyInstance | null = null;

async function getApp(): Promise<FastifyInstance> {
  if (!fastifyApp) {
    fastifyApp = await buildApp();
    await fastifyApp.ready();
  }
  return fastifyApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  app.server.emit("request", req, res);
}
