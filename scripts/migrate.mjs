#!/usr/bin/env node
/**
 * Aplica as migrações de `drizzle/` sem depender do drizzle-kit.
 *
 * O deploy roda este script antes do `next build`, e o drizzle-kit é uma
 * devDependency: em ambientes que instalam só dependências de produção ele
 * não existiria. Aqui usamos apenas o driver `postgres`, que o app já usa.
 *
 * O histórico fica em `drizzle.__drizzle_migrations` no mesmo formato do
 * drizzle-kit (hash SHA-256 do arquivo + `when` do journal), então
 * `drizzle-kit migrate` e este script continuam compatíveis entre si.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "drizzle");
const JOURNAL_PATH = join(MIGRATIONS_DIR, "meta", "_journal.json");
const LOCK_KEY = 7710077;

function fail(message) {
  console.error(`\n[migrações] ${message}\n`);
  process.exit(1);
}

function databaseUrl() {
  for (const name of [
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL",
    "POSTGRES_URL",
  ]) {
    const value = process.env[name]?.trim();
    if (value) {
      const source = name;
      return { url: value, source };
    }
  }
  return null;
}

function readMigrations() {
  if (!existsSync(JOURNAL_PATH)) {
    fail(`journal não encontrado em ${JOURNAL_PATH}.`);
  }

  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8"));
  return journal.entries
    .map((entry) => {
      const file = join(MIGRATIONS_DIR, `${entry.tag}.sql`);
      if (!existsSync(file)) {
        fail(`arquivo da migração "${entry.tag}" não encontrado em ${file}.`);
      }
      const content = readFileSync(file, "utf8");
      return {
        tag: entry.tag,
        when: entry.when,
        hash: createHash("sha256").update(content).digest("hex"),
        statements: content
          .split("--> statement-breakpoint")
          .map((statement) => statement.trim())
          .filter(Boolean),
      };
    })
    .sort((a, b) => a.when - b.when);
}

async function lastAppliedAt(tx) {
  const [row] = await tx`
    select created_at from drizzle.__drizzle_migrations
    order by created_at desc limit 1
  `;
  return row ? Number(row.created_at) : 0;
}

const target = databaseUrl();
if (!target) {
  fail(
    "Nenhuma connection string encontrada. Defina DATABASE_URL_UNPOOLED (recomendado para DDL) ou DATABASE_URL.",
  );
}

const { url, source } = target;
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
const isLocal = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);

const sql = postgres(url, {
  max: 1,
  prepare: false,
  idle_timeout: 20,
  // NOTICE de "already exists, skipping" polui o log do build sem informar nada.
  onnotice: () => {},
  ...(isLocal || /sslmode=/.test(url) ? {} : { ssl: "require" }),
});

const migrations = readMigrations();

try {
  await sql`create schema if not exists drizzle`;
  await sql`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  let applied = 0;
  await sql.begin(async (tx) => {
    // Serializa builds concorrentes: dois deploys não aplicam a mesma migração.
    await tx`select pg_advisory_xact_lock(${LOCK_KEY})`;

    const lastApplied = await lastAppliedAt(tx);
    const pending = migrations.filter((migration) => migration.when > lastApplied);

    for (const migration of pending) {
      for (const statement of migration.statements) {
        await tx.unsafe(statement);
      }
      await tx`
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values (${migration.hash}, ${migration.when})
      `;
      console.log(`[migrações] aplicada: ${migration.tag}`);
      applied += 1;
    }
  });

  const total = migrations.length;
  if (applied === 0) {
    console.log(`[migrações] schema já atualizado (${total} migrações registradas).`);
  } else {
    console.log(`[migrações] ${applied} de ${total} migrações aplicadas via ${source}.`);
  }
} catch (error) {
  const code = error?.code ? ` (${error.code})` : "";
  fail(`falha ao aplicar migrações via ${source}${code}: ${error?.message ?? error}`);
} finally {
  await sql.end({ timeout: 5 });
}
