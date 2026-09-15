import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServerResponse } from "http";

// Keep track of all connected raw Node responses
const clients = new Set<ServerResponse>();

export function addClient(req: FastifyRequest, reply: FastifyReply) {
  // CRITICAL: Tell Fastify NOT to auto-close/serialize this response.
  // We hijack the raw Node.js response to keep it open for SSE.
  reply.hijack();

  const raw = reply.raw;

  // SSE headers
  raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no", // disable nginx buffering if behind proxy
  });

  // Send initial heartbeat so the browser knows the connection is live
  raw.write(":ok\n\n");

  clients.add(raw);

  // Keep-alive: send a comment every 15s so proxies don't close the stream
  const keepAlive = setInterval(() => {
    raw.write(":ping\n\n");
  }, 15_000);

  // Cleanup when client disconnects
  req.raw.on("close", () => {
    clearInterval(keepAlive);
    clients.delete(raw);
  });
}

export function broadcast(eventType: string, payload?: any) {
  const message = `data: ${JSON.stringify({ type: eventType, payload })}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      // client may have disconnected, remove it
      clients.delete(client);
    }
  }
}
