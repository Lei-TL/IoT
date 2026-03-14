import { io, type Socket } from "socket.io-client";
import { getToken } from "./auth";

const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:4000";

export function createSocket(): Socket {
  return io(backendUrl, {
    auth: { token: getToken() ?? undefined },
    transports: ["websocket"]
  });
}

