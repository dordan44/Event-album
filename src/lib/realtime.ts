import type { Server } from "socket.io";

/**
 * The Socket.io server is attached to `global.__io` by server.js.
 * API routes run in the same process, so they can broadcast directly.
 */
export function getIO(): Server | null {
  return (global as any).__io ?? null;
}

export function emitToEvent(eventId: string, event: string, payload: unknown) {
  getIO()?.to(`event:${eventId}`).emit(event, payload);
}
