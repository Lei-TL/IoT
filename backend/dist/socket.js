import { Server } from "socket.io";
import { env } from "./env.js";
import { verifyToken } from "./auth.js";
export function setupSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: env.FRONTEND_ORIGIN,
            credentials: true
        }
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token ??
            (typeof socket.handshake.headers.authorization === "string" && socket.handshake.headers.authorization.startsWith("Bearer ")
                ? socket.handshake.headers.authorization.slice("Bearer ".length)
                : undefined);
        if (!token || typeof token !== "string") {
            return next(new Error("Unauthorized"));
        }
        try {
            const user = verifyToken(token);
            socket.data.user = user;
            return next();
        }
        catch {
            return next(new Error("Unauthorized"));
        }
    });
    return io;
}
