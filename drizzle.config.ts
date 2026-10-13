import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// O Next.js lê `.env.local`; o drizzle-kit leria apenas `.env` por padrão.
// Carregamos os dois, dando precedência ao `.env.local`.
config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";
const command = process.argv[2] ?? "";

// `generate` só compara o schema TypeScript com o histórico de migrações e não
// abre conexão; `migrate`/`push`/`studio` precisam da connection string.
const needsConnection = ["migrate", "push", "studio", "check"].includes(command);

if (needsConnection && !url) {
  throw new Error(
    "Defina DATABASE_URL_UNPOOLED (recomendado) ou DATABASE_URL em .env.local antes de rodar este comando.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: { url },
});
