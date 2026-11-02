import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL or service role key in .env");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function columnExists() {
  const { error } = await admin.from("rsvps").select("plus_one_name").limit(1);
  if (!error) return true;
  if (/plus_one_name/i.test(error.message) || /column/i.test(error.message)) {
    return false;
  }
  throw new Error(error.message);
}

async function tryRunSql(sql) {
  const endpoints = [
    `${url}/pg/query`,
    `${url}/postgres/v1/query`,
    `${url}/rest/v1/rpc/exec_sql`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          endpoint.includes("rpc")
            ? { query: sql }
            : { query: sql }
        ),
      });
      const text = await res.text();
      if (res.ok) {
        return { ok: true, endpoint, text };
      }
      console.log(`SQL endpoint ${endpoint} -> ${res.status}`);
    } catch (error) {
      console.log(
        `SQL endpoint ${endpoint} failed:`,
        error instanceof Error ? error.message : error
      );
    }
  }
  return { ok: false };
}

const already = await columnExists();
if (already) {
  console.log("plus_one_name column already exists on rsvps.");
  process.exit(0);
}

const sql = fs.readFileSync(
  path.join(root, "supabase", "migration_plus_one.sql"),
  "utf8"
);
const ran = await tryRunSql(sql);
if (ran.ok) {
  const confirmed = await columnExists();
  if (confirmed) {
    console.log("Migration applied via", ran.endpoint);
    process.exit(0);
  }
}

console.error(
  [
    "Could not apply DDL automatically with the service role key.",
    "Open Supabase → SQL → New query, paste supabase/migration_plus_one.sql, and Run.",
  ].join("\n")
);
process.exit(2);
