/**
 * Custom Node server for Railway.
 *
 * Runs Next.js and Socket.io on the SAME HTTP server / port so API route
 * handlers (which live in the same process) can broadcast real-time events
 * to admin dashboards and venue slideshows via the shared `global.__io`.
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const io = new Server(httpServer, {
    path: "/ws",
    cors: { origin: "*" },
    // Venue screens sit on flaky Wi-Fi; be generous before dropping them.
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on("connection", (socket) => {
    // Clients join a room per event. Roles:
    //  - "admin"     -> receives media:new + live guest counters
    //  - "slideshow" -> receives media:approved / media:rejected
    //  - "guest"     -> counted for the "active guests online" stat
    socket.on("join", ({ eventId, role }) => {
      if (typeof eventId !== "string" || eventId.length > 100) return;
      socket.data.eventId = eventId;
      socket.data.role = role;
      socket.join(`event:${eventId}`);
      if (role === "guest") {
        socket.join(`event:${eventId}:guests`);
        broadcastGuestCount(eventId);
      }
    });

    socket.on("disconnect", () => {
      if (socket.data.eventId && socket.data.role === "guest") {
        broadcastGuestCount(socket.data.eventId);
      }
    });
  });

  async function broadcastGuestCount(eventId) {
    const room = await io.in(`event:${eventId}:guests`).fetchSockets();
    io.to(`event:${eventId}`).emit("guests:count", { count: room.length });
  }

  // Expose to Next.js API routes (same process).
  global.__io = io;

  httpServer.listen(port, hostname, () => {
    console.log(`> SnapEvent ready on http://${hostname}:${port} (dev=${dev})`);
  });
});
