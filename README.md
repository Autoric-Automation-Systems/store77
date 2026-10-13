# Store77

SaaS de gestão para lojas físicas e online. O estoque é cadastrado uma única vez
e alimenta o caixa, o financeiro e a vitrine pública da loja.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Drizzle ORM · Neon (Postgres) · Vercel Blob · Vercel

---

## 1. Rodando localmente

### 1.1 Crie o banco no Neon

1. Acesse <https://console.neon.tech>, crie o projeto e copie as duas connection
   strings em **Connection Details**:
   - **Pooled connection** (host com `-pooler`) → usada pela aplicação.
   - **Direct connection** (sem `-pooler`) → usada pelas migrações.

### 1.2 Variáveis de ambiente

```bash
cp .env.example .env.local
```

| Variável | Para que serve |
| --- | --- |
| `DATABASE_URL` | Connection string *pooled*. Usada em runtime. |
| `DATABASE_URL_UNPOOLED` | Connection string direta. Usada por `drizzle-kit migrate`. |
| `AUTH_SECRET` | Assina o cookie de sessão (HS256). **Mínimo de 32 caracteres.** Gere com `openssl rand -base64 48`. |
| `BLOB_READ_WRITE_TOKEN` | Upload de fotos no Vercel Blob. **Opcional em dev** (sem ele, as imagens vão para `public/uploads`). |

### 1.3 Crie as tabelas

```bash
npm install
npm run db:migrate    # aplica drizzle/0000_initial.sql
```

Alternativas:

- `npm run db:push` — sincroniza o schema sem versionar migração.
- `npm run db:studio` — navegador visual dos dados.
- **Sem CLI:** cole o conteúdo de [`drizzle/0000_initial.sql`](./drizzle/0000_initial.sql)
  no SQL Editor do Neon.

### 1.4 (Opcional) Dados de demonstração

Cole [`scripts/seed.sql`](./scripts/seed.sql) no SQL Editor do Neon. Ele cria a
loja `Empório da Esquina` com 13 produtos, 4 categorias, 2 clientes e 3 usuários:

| E-mail | Papel | Senha |
| --- | --- | --- |
| `demo@store77.app` | Proprietário | `store77demo` |
| `gerente@store77.app` | Gerente | `store77demo` |
| `vendedor@store77.app` | Vendedor | `store77demo` |

A vitrine fica em `/loja/loja-demo`. **Troque as senhas** antes de usar de verdade.

> O seed é reexecutável: ele apaga a loja `loja-demo` (com produtos, movimentações
> e usuários, via `ON DELETE CASCADE`) e recria tudo.

### 1.5 Suba o servidor

```bash
npm run dev     # http://localhost:3000
```

Sem conta ainda? `/cadastro` cria a loja e o usuário proprietário em um passo.

---

## 2. Módulos

| Rota | Módulo | O que faz |
| --- | --- | --- |
| `/dashboard` | Painel | Vendas do dia, valor do estoque, alertas de reposição, sessão de caixa. |
| `/estoque` | Estoque | Produtos com código/SKU, descrição, fotos, quantidade, estoque mínimo e endereço de armazenagem. Filtros por tipo e situação. |
| `/estoque/movimentacoes` | Estoque | Entradas, saídas e ajustes com saldo resultante e histórico auditável. |
| `/estoque/categorias` | Estoque | Tipos de produto e nichos da loja (usados nos carrosséis da vitrine). |
| `/caixa` | Caixa | PDV com carrinho, desconto, cliente e forma de pagamento. |
| `/caixa/vendas` | Caixa | Vendas realizadas e cancelamento (devolve estoque e estorna o caixa). |
| `/caixa/sessoes` | Caixa | Abertura/fechamento de turno, sangria, suprimento e conferência de valores. |
| `/clientes` | Caixa | Cadastro de clientes com histórico de compras. |
| `/financeiro` | Financeiro | Contas a pagar/receber, baixa, vencidos e receita de vendas. |
| `/vitrine` | Vitrine | Configuração da landing page: link, logo, hero, textos, paleta e contato. |
| `/usuarios` | Equipe | Membros, papéis, redefinição de senha. |
| `/loja/[slug]` | Pública | Landing page gerada automaticamente a partir do estoque. |

### Papéis e permissões

| Papel | Acesso |
| --- | --- |
| `OWNER` (Proprietário) | Tudo. Criado no cadastro da loja. |
| `GERENTE` | Tudo, exceto criar outro proprietário. |
| `VENDEDOR` | Painel, Estoque (leitura + movimentações), Caixa, Vendas e Clientes. |
| `CLIENTE` | Reservado para o consumidor final (vitrine). |

`Financeiro`, `Vitrine` e `Equipe` são restritos à gestão (`OWNER`/`GERENTE`),
tanto no menu quanto na server action — o guard é `requireAdmin()`.

### A landing page é automática

`/loja/[slug]` lê a tabela `stores` (hero, logo, textos, paleta, contato) e a
tabela `products` (ativo, com estoque) e monta: hero, menu de categorias,
carrossel horizontal por tipo/nicho e seção "sobre". Os títulos de produto levam
direto para o WhatsApp da loja com a mensagem pronta. Nada é publicado à mão:
produto sem estoque sai do ar sozinho (a menos que `showOutOfStock` esteja ligado).

---

## 3. Modelo de dados

12 tabelas, todas as entidades de negócio com `store_id` (isolamento multi-tenant).

```
stores ─┬─ users            products ─┬─ product_images
        ├─ categories ──────┘         └─ stock_movements   (razão do estoque)
        ├─ customers
        ├─ cash_sessions ─── cash_movements
        ├─ sales ─────────── sale_items
        └─ financial_entries
```

Convenções:

- Dinheiro em **centavos** (`integer`) — nunca `float`.
- `sale_items` guarda *snapshots* de código, nome, preço e custo: mudar o
  cadastro depois não reescreve vendas passadas.
- `stock_movements` é um razão append-only com `balance_after` e uma coluna
  `seq` (bigserial) que define a ordem real da escrita quando vários lançamentos
  entram na mesma transação.
- Alterar a quantidade pela tela do produto gera um `AJUSTE`; a quantidade nunca
  é escrita direto, para o saldo sempre reconciliar com o histórico.

---

## 4. Deploy na Vercel

1. Importe o repositório na Vercel (framework detectado automaticamente).
2. Em **Storage**, crie um **Blob store** e conecte ao projeto — isso injeta
   `BLOB_READ_WRITE_TOKEN`.
3. Em **Settings → Environment Variables**, adicione `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED` e `AUTH_SECRET`.
4. Rode `npm run db:migrate` apontando para o banco de produção (localmente, com
   as variáveis de produção no `.env.local`, ou pela pipeline de CI).
5. Deploy.

---

## 5. Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` | Build de produção. |
| `npm run start` | Sobe o build de produção. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run db:generate` | Gera nova migração a partir do schema. |
| `npm run db:migrate` | Aplica as migrações pendentes. |
| `npm run db:push` | Sincroniza o schema sem versionar. |
| `npm run db:studio` | Abre o Drizzle Studio. |

---

## 6. Identidade visual

A marca do Store77 fica em [`public/`](./public):

| Arquivo | Uso |
| --- | --- |
| `logoname.png` | Logotipo horizontal com o nome — cabeçalho do app, login e landing ([`src/components/brand.tsx`](./src/components/brand.tsx)). |
| `logo.png` | Símbolo (sacola) isolado — avatar, redes sociais, ícone. |
| `favicon_io/` | Pacote completo de favicons, declarado no [`src/app/layout.tsx`](./src/app/layout.tsx) e no `site.webmanifest`. |

Use o componente `Brand` em vez de repetir o `<Image>` — assim trocar a arte
acontece em um lugar só. **Exceção:** a vitrine em [`/loja/[slug]`](./src/app/loja/%5Bslug%5D/page.tsx)
usa a logo *da loja* (`stores.logoUrl`, configurada em `/vitrine`), nunca a do Store77.

A cor da marca vive em [`src/app/globals.css`](./src/app/globals.css) (rampa
`--color-brand-*`, derivada do vermelho `#c01020` da logo). A paleta da *vitrine de
cada loja* é separada e configurável por loja em `/vitrine` — é ela que colore a
landing page do cliente final.

> Os `logo.jpeg` / `logoname.jpeg` são masters em resolução maior (2528px) mas
> **sem canal alfa**: trazem o xadrez de transparência gravado nos pixels, então
> não servem para a interface. Os `.png` são os arquivos usados pelo app. Mantenha
> os `.jpeg` como fonte para reexportar quando a arte mudar.

---

## 7. Decisões e próximos passos

**Decisões**

- **Sessão própria** (JWT HS256 em cookie `httpOnly`) em vez de Auth.js: o
  modelo é multi-tenant com 4 papéis e não há login social. Trocar por Auth.js
  depois é uma mudança localizada em [`src/lib/auth.ts`](./src/lib/auth.ts).
- **Fotos**: Vercel Blob em produção; sem `BLOB_READ_WRITE_TOKEN`, o ambiente de
  desenvolvimento grava em `public/uploads` para não exigir token.
- **Vendas não viram lançamento financeiro.** A receita é lida direto de `sales`
  (fonte única) e `financial_entries` guarda só lançamentos manuais, evitando
  contagem duplicada.
- **Preços e custos sempre relidos do banco** no fechamento da venda — nunca
  confiamos em valores enviados pelo cliente.
- Toda escrita de estoque roda em transação com `SELECT … FOR UPDATE` na linha do
  produto, e a numeração da venda trava a linha da loja.

**Próximos passos sugeridos**

- Checkout online de verdade (hoje a vitrine converte via WhatsApp).
- Leitor de código de barras no PDV (o campo `barcode` já existe).
- Relatórios por período (curva ABC, giro de estoque, lucratividade).
- Convite de equipe por e-mail com token de uso único.
- Row Level Security no Neon, trocando o filtro por `store_id` na aplicação por
  política no banco.
