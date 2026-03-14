import express from "express";
import { z } from "zod";

export function createControlRouter(publishLed: (led: "n1" | "n2", state: "ON" | "OFF") => void) {
  const router = express.Router();

  const bodySchema = z.object({
    state: z.enum(["ON", "OFF"])
  });

  router.post("/led/:ledId", (req, res) => {
    const ledId = req.params.ledId;
    if (ledId !== "n1" && ledId !== "n2") {
      return res.status(400).json({ error: "Invalid LED" });
    }

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }

    publishLed(ledId, parsed.data.state);
    return res.json({ led: ledId, state: parsed.data.state });
  });

  return router;
}
