"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Joins the event's Socket.io room (path /ws on the same origin) and wires
 * up the given handlers. Reconnects automatically — venue Wi-Fi drops a lot.
 */
export function useEventSocket(
  eventId: string | null,
  role: "admin" | "slideshow" | "guest",
  handlers: Record<string, (payload: any) => void>
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!eventId) return;
    const socket: Socket = io({ path: "/ws" });

    const join = () => socket.emit("join", { eventId, role });
    socket.on("connect", join);

    const bound = Object.keys(handlersRef.current);
    for (const event of bound) {
      socket.on(event, (payload) => handlersRef.current[event]?.(payload));
    }

    return () => {
      socket.disconnect();
    };
  }, [eventId, role]);
}
