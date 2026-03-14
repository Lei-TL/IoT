import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

export type JwtUser = {
  sub: string;
  username: string;
};

export function signToken(user: { id: string; username: string }) {
  const payload: JwtUser = { sub: user.id, username: user.username };
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token");
  }
  const { sub, username } = decoded as { sub?: unknown; username?: unknown };
  if (typeof sub !== "string" || typeof username !== "string") {
    throw new Error("Invalid token payload");
  }
  return { sub, username } satisfies JwtUser;
}

export type AuthenticatedRequest = Request & { user: JwtUser };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const user = verifyToken(token);
    (req as AuthenticatedRequest).user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
