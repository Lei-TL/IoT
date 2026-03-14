import jwt from "jsonwebtoken";
import { env } from "./env.js";
export function signToken(user) {
    const payload = { sub: user.id, username: user.username };
    const options = { expiresIn: env.JWT_EXPIRES_IN };
    return jwt.sign(payload, env.JWT_SECRET, options);
}
export function verifyToken(token) {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded !== "object" || decoded === null) {
        throw new Error("Invalid token");
    }
    const { sub, username } = decoded;
    if (typeof sub !== "string" || typeof username !== "string") {
        throw new Error("Invalid token payload");
    }
    return { sub, username };
}
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing Authorization header" });
    }
    const token = header.slice("Bearer ".length);
    try {
        const user = verifyToken(token);
        req.user = user;
        return next();
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
