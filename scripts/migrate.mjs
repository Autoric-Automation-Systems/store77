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

/**
 * Bancos criados fora do controle de migração (SQL colado no editor do Neon,
 * `db:push` antigo) já têm os objetos. Nesse caso o certo é reutilizar o que
 * existe e aplicar só o que falta, e não abortar o build com "already exists".
 */
const ALREADY_EXISTS_CODES = new Set([
  "42P06", // duplicate_schema
  "42P07", // duplicate_table / duplicate_index
  "42701", // duplicate_column
  "42710", // duplicate_object (tipo, constraint, enum)
]);

/** Colunas que as telas de autenticação usam; ausência delas quebra em runtime. */
const REQUIRED_COLUMNS = [
  ["users", "password_hash"],
  ["users", "email_verified_at"],
  ["users", "terms_accepted_at"],
  ["auth_tokens", "created_at"],
  ["auth_tokens", "used_at"],
  ["auth_tokens", "token_hash"],
  ["auth_tokens", "type"],
];

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
    if (value) return { url: value, source: name };
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

async function schemaAlreadyExists(tx) {
  const [row] = await tx`select to_regclass('public.users') as nome`;
  return Boolean(row?.nome);
}

async function applyMigration(tx, migration) {
  let reused = 0;

  for (const statement of migration.statements) {
    try {
      // Savepoint por comando: no Postgres um erro aborta a transação inteira,
      // então sem isso o primeiro objeto reaproveitado mataria o lote.
      await tx.savepoint((sp) => sp.unsafe(statement));
    } catch (error) {
      if (!ALREADY_EXISTS_CODES.has(error?.code)) throw error;
      reused += 1;
    }
  }

  await tx`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${migration.hash}, ${migration.when})
  `;

  const note = reused ? ` — ${reused} objeto(s) já existiam` : "";
  console.log(`[migrações] aplicada: ${migration.tag}${note}`);
}

async function missingColumns(sql) {
  const present = await sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('users', 'auth_tokens')
  `;
  const found = new Set(present.map((row) => `${row.table_name}.${row.column_name}`));
  return REQUIRED_COLUMNS.filter(([table, column]) => !found.has(`${table}.${column}`)).map(
    ([table, column]) => `${table}.${column}`,
  );
}

function describeTarget(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || 5432}${parsed.pathname}`;
  } catch {
    return "(URL inválida)";
  }
}

/**
 * `next build` precisa de `typescript` para transpilar `next.config.ts`.
 * Se o npm instalou sem devDependencies, o erro real aparece longe da causa.
 */
function warnIfBuildDepsMissing() {
  const missing = ["typescript", "@tailwindcss/postcss"].filter(
    (name) => !existsSync(join(ROOT, "node_modules", ...name.split("/"), "package.json")),
  );
  if (missing.length === 0) return;
  console.warn(
    `[build] aviso: ${missing.join(", ")} não encontrado(s) em node_modules. ` +
      "Se o build falhar com \"Cannot find module 'typescript'\", o npm instalou sem " +
      "devDependencies (NODE_ENV=production ou npm config production=true no projeto).",
  );
}

const target = databaseUrl();
if (!target) {
  if (process.env.SKIP_DB_MIGRATIONS === "1") {
    console.log("[migrações] SKIP_DB_MIGRATIONS=1: migrações ignoradas neste build.");
    process.exit(0);
  }
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
console.log(
  `[migrações] ${migrations.length} migração(ões) | banco ${describeTarget(url)} via ${source}`,
);
warnIfBuildDepsMissing();

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

    if (pending.length > 0 && lastApplied === 0 && (await schemaAlreadyExists(tx))) {
      console.log(
        "[migrações] banco sem histórico de migrações, mas com tabelas: reutilizando o que já existe.",
      );
    }

    for (const migration of pending) {
      await applyMigration(tx, migration);
      applied += 1;
    }
  });

  const missing = await missingColumns(sql);
  if (missing.length > 0) {
    fail(
      `schema incompleto após as migrações. Colunas ausentes: ${missing.join(", ")}. ` +
        "O banco foi criado fora das migrações e tem uma estrutura divergente; ajuste manualmente ou recrie o banco.",
    );
  }

  if (applied === 0) {
    console.log(`[migrações] schema já atualizado (${migrations.length} migrações registradas).`);
  } else {
    console.log(`[migrações] ${applied} de ${migrations.length} migrações aplicadas.`);
  }
} catch (error) {
  const code = error?.code ? ` (${error.code})` : "";
  fail(`falha ao aplicar migrações via ${source}${code}: ${error?.message ?? error}`);
} finally {
  await sql.end({ timeout: 5 });
}
