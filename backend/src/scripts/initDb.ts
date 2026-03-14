import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(client: pg.Client, attempts: number) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await client.connect();
      return;
    } catch (err) {
      lastErr = err;
      await delay(750);
    }
  }
  throw lastErr;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const schemaPath = path.resolve(process.cwd(), "db", "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");

  const client = new Client({ connectionString: databaseUrl });
  await connectWithRetry(client, 20);

  try {
    await client.query("BEGIN");
    await client.query(schemaSql);

    const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await client.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (username) DO NOTHING`,
      [adminUsername, passwordHash],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  process.stderr.write(String(err instanceof Error ? err.stack ?? err.message : err) + "\n");
  process.exit(1);
});
