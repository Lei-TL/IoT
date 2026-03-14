import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db.js";
import { signToken } from "../auth.js";
export const authRouter = express.Router();
const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
});
authRouter.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request" });
    }
    const { username, password } = parsed.data;
    const result = await pool.query(`SELECT id::text as id, username, password_hash FROM users WHERE username = $1`, [
        username
    ]);
    const user = result.rows[0];
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken({ id: user.id, username: user.username });
    return res.json({ token });
});
