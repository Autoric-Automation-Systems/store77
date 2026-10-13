import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let sql: ReturnType<typeof postgres> | undefined;
let instance: Database | undefined;

/**
 * Conexão criada de forma preguiçosa: `next build` roda sem `DATABASE_URL`
 * e só falha se uma rota realmente consultar o banco.
 */
export function db(): Database {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL não configurada. Copie .env.example para .env.local e informe a connection string do Neon.",
      );
    }
    // `prepare: false` mantém compatibilidade com o pooler (PgBouncer) do Neon.
    sql = postgres(url, { max: 1, prepare: false, idle_timeout: 20 });
    instance = drizzle(sql, { schema });
  }
  return instance;
}

/** Usado por scripts de CLI para encerrar o pool sem deixar o processo pendurado. */
export async function closeDb() {
  await sql?.end({ timeout: 5 });
  sql = undefined;
  instance = undefined;
}

export { schema };
export * from "./schema";
