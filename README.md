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
| `DATABASE_URL_UNPOOLED` | Connection string direta. Usada pelas migrações (`npm run db:migrate`). |
| `AUTH_SECRET` | Assina o cookie de sessão (HS256). **Mínimo de 32 caracteres.** Gere com `openssl rand -base64 48`. |
| `APP_URL` | URL pública usada nos links de e-mail. Em produção, o domínio real (sem barra no final). |
| `EMAIL_PASS` | Senha de app do Gmail (16 caracteres) usada no envio SMTP. **Opcional em dev**: sem ela, o e-mail é impresso no terminal. **Obrigatória em produção** se não usar o Resend. |
| `EMAIL_USER` | Conta autenticada no SMTP. Se vazio, usa o endereço de `EMAIL_FROM`. |
| `EMAIL_FROM` | Remetente exibido. No Gmail, precisa ser a mesma conta autenticada. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Servidor SMTP. Padrões: `smtp.gmail.com`, `465`, `true`. |
| `RESEND_API_KEY` | Alternativa ao SMTP, usada como reserva se o SMTP falhar. **Opcional.** |
| `BLOB_READ_WRITE_TOKEN` | Upload de fotos no Vercel Blob. **Opcional em dev** (sem ele, as imagens vão para `public/uploads`). |

### 1.3 Crie as tabelas

```bash
npm install
npm run db:migrate    # aplica as migrações de drizzle/ na ordem
```

Alternativas:

- `npm run db:push` — sincroniza o schema sem versionar migração.
- `npm run db:studio` — navegador visual dos dados.
- **Sem CLI:** cole o conteúdo de cada arquivo de [`drizzle/`](./drizzle) no SQL
  Editor do Neon, **na ordem** (`0000_initial.sql`, `0001_terms_accepted.sql`,
  `0002_*`). Depois rode `npm run db:migrate` uma vez: ele percebe que os objetos
  já existem, registra as migrações no histórico e não tenta recriar nada.

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
| `/caixa/vendas` | Caixa | Vendas realizadas, itens de cada venda na própria lista e cancelamento (devolve estoque e estorna o caixa). |
| `/caixa/sessoes` | Caixa | Abertura/fechamento de turno, sangria, suprimento e conferência de valores. |
| `/clientes` | Caixa | Cadastro de clientes com quantidade de compras e total gasto. |
| `/clientes/[id]` | Caixa | Ficha do cliente: ticket médio, última compra, dados de contato e as vendas vinculadas. |
| `/financeiro` | Financeiro | Contas a pagar/receber, baixa, vencidos e receita de vendas. |
| `/vitrine` | Vitrine | Configuração da landing page: link, logo, hero, textos, paleta e contato. |
| `/usuarios` | Equipe | Membros, papéis, convite por e-mail, assentos do plano e redefinição de senha. |
| `/assinatura` | Assinatura | Plano atual, uso, adicionais, faturas e contratação. Só o proprietário altera. |
| `/admin` | Interno | Painel da plataforma: MRR, testes, afiliados, repasses e atalhos para cada seção. |
| `/admin/lojas` | Interno | Lojas e cobrança: MRR, testes, cortesias, inadimplência e lista de lojas. |
| `/admin/lojas/[id]` | Interno | Detalhe da loja: assinatura, eventos, faturas, cortesia e troca de plano. |
| `/admin/planos` | Interno | Catálogo em vigor: preço, limites, adicionais e prazos de cobrança. |
| `/admin/afiliados` | Interno | Cadastros, indicações, comissões e fila de repasse por Pix. |
| `/cadastro` | Autenticação | Criação da loja; o e-mail é confirmado e a senha é criada por link. |
| `/esqueci-senha` | Autenticação | Solicitação de link para redefinir a senha. |
| `/definir-senha/[token]` | Autenticação | Criação/redefinição de senha a partir do link enviado por e-mail. |
| `/loja/[slug]` | Pública | Landing page gerada automaticamente a partir do estoque. |
| `/ajuda` | Pública | Central de ajuda: primeiros passos, plano, guia dos módulos, permissões e FAQ. |
| `/ajuda/planos` | Pública | Comparativo dos planos, adicionais, atraso, cancelamento e reajuste. |
| `/afiliados` | Pública | Programa de afiliados: comissão, regras e cadastro. |
| `/termos` | Pública | Termos de Uso. |
| `/privacidade` | Pública | Política de Privacidade (LGPD). |

### Cadastro, confirmação de e-mail e senha

O cadastro não pede senha. O fluxo é:

1. `/cadastro` cria a loja e o usuário `OWNER` sem senha e com
   `email_verified_at` nulo.
2. Um e-mail com o link `/definir-senha/<token>` é enviado. O token tem 32 bytes
   aleatórios, é guardado apenas como hash SHA-256, expira em **48 horas** e só
   pode ser usado uma vez.
3. Ao criar a senha, a conta é marcada como verificada e a pessoa entra direto no
   painel.
4. `/esqueci-senha` envia um link de redefinição válido por **1 hora**. A resposta
   é sempre a mesma, exista ou não a conta, para não revelar e-mails cadastrados.
5. Em `/usuarios`, o admin convida por nome, e-mail e papel. O convite mostra
   **“Convite pendente”** até a pessoa criar a senha pelo link. A redefinição
   manual pelo admin continua disponível.
6. `/cadastro/confirmar` reenvia o link de confirmação/criação de senha. A tela
   também está acessível em **“Reenviar confirmação”** na página de login.
7. Gerar um link novo invalida os anteriores. Reenvios têm intervalo mínimo de
   60 segundos.

Em desenvolvimento, sem `EMAIL_PASS` nem `RESEND_API_KEY`, o e-mail (com o
link) é impresso no terminal do `npm run dev`. Em produção, configure o SMTP do
Gmail (`EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`) ou o Resend — sem isso, cadastro
e recuperação de senha ficam bloqueados com uma mensagem clara.

**Gmail:** ative a verificação em duas etapas na conta e gere uma **senha de
app** em <https://myaccount.google.com/apppasswords>. Use essa senha de 16
caracteres em `EMAIL_PASS` (não a senha normal da conta). O `EMAIL_FROM` precisa
ser a mesma conta autenticada; o Gmail reescreve o remetente caso contrário.

**Resend:** verifique um domínio em <https://resend.com/domains> e use esse
domínio em `EMAIL_FROM`. Se as duas opções estiverem configuradas, o SMTP é
tentado primeiro e o Resend entra como reserva.

Contas criadas antes da migração `0002` são marcadas como verificadas
automaticamente, desde que já tenham senha, para não perderem o acesso.

### Papéis e permissões

| Papel | Acesso |
| --- | --- |
| `OWNER` (Proprietário) | Tudo. Criado no cadastro da loja. |
| `GERENTE` | Tudo, exceto criar outro proprietário. |
| `VENDEDOR` | Painel, Estoque (leitura + movimentações), Caixa, Vendas e Clientes. |
| `CAIXA` | PDV, sessões do próprio turno e Clientes. Não movimenta estoque nem administra. |
| `CLIENTE` | Reservado para o consumidor final (vitrine). Não ocupa assento. |

`Financeiro`, `Vitrine` e `Equipe` são restritos à gestão (`OWNER`/`GERENTE`),
tanto no menu quanto na server action — o guard é `requireAdmin()`.

### A landing page é automática

`/loja/[slug]` lê a tabela `stores` (hero, logo, textos, paleta, contato) e a
tabela `products` (ativo, com estoque) e monta: hero, menu de categorias,
carrossel horizontal por tipo/nicho e seção "sobre". Os títulos de produto levam
direto para o WhatsApp da loja com a mensagem pronta. Nada é publicado à mão:
produto sem estoque sai do ar sozinho (a menos que `showOutOfStock` esteja ligado).

### Uma loja nova não precisa de deploy

Este é o ponto central do modelo: **existe um único código e um único deploy
para todas as lojas**. O arquivo da vitrine
([`src/app/loja/[slug]/page.tsx`](./src/app/loja/%5Bslug%5D/page.tsx)) não tem
nenhum dado de loja escrito nele — são só consultas ao banco. Quem define o que
aparece é o `slug` da URL.

Criar um cliente novo é inserir linhas, não publicar código:

| Ação | O que acontece |
| --- | --- |
| Loja se cadastra em `/cadastro` (ou você insere em `stores`) | Ganha um `slug` e a página já existe em `/loja/<slug>` |
| A loja configura `/vitrine` | Nome, logo, hero, paleta e contato passam a valer |
| A loja cadastra produtos | Eles aparecem no carrossel da categoria correspondente |
| Produto zera o estoque | Sai da vitrine automaticamente |

Ou seja: 100 lojas usam o mesmo deploy. O isolamento vem do `store_id`, não de
um ambiente por cliente. Deploy só acontece quando o **código** muda.

Se um dia for necessário endereço próprio por cliente (`minhaloja.com.br`), a
Vercel resolve isso por **domínio** apontando para o mesmo projeto, passando o
domínio como parâmetro — continua sem deploy separado.

---

## 3. Assinatura e cobrança

A cobrança é **por loja**, não por usuário. O catálogo de planos fica em
[`src/lib/billing/plans.ts`](./src/lib/billing/plans.ts) e é a única fonte de
preço e limite — a fatura guarda o valor cobrado como snapshot.

| Plano | Mensal | Anual | Usuários | Vendas/mês | Lojas |
| --- | --- | --- | --- | --- | --- |
| Essencial | R$ 19,90 | R$ 191,00 | 1 | 500 | 1 |
| Loja | R$ 39,90 | R$ 383,00 | 3 | 1.500 | 1 |
| Equipe | R$ 79,90 | R$ 767,00 | 8 | 5.000 | 1 |
| Rede | R$ 139,90 | R$ 1.343,00 | 20 | 12.000 | 3 |
| Corporativo | R$ 269,90 | R$ 2.591,00 | 50 | 30.000 | 10 |

O Essencial é a âncora de preço (1990 centavos). Os demais derivam dela em
múltiplos (2x, 4x, 7x e 13,5x) e são arredondados para terminar em `,90`. Plano
novo entra nessa lógica, não como valor solto. O anual aplica 20% de desconto.

A escada de assentos é **1, 3, 8, 20 e 50**, então o custo por usuário cai de
R$ 19,90 para R$ 5,40 — subir de plano sempre rende mais do que empilhar
assentos avulsos. É essa queda que sustenta o upgrade conforme a loja cresce.

**Adicionais:** usuário extra R$ 7,90/mês, loja extra R$ 26,90/mês e pacote de
5.000 vendas R$ 12,90/mês. O assento avulso fica entre o melhor preço por
usuário do catálogo (R$ 5,40) e o do Essencial (R$ 19,90): resolve o caso "só
preciso de mais uma pessoa", sem canibalizar o plano seguinte.

**Regras de acesso** (`src/lib/billing/access.ts`):

| Situação | Acesso |
| --- | --- |
| Em dia, teste ou cortesia válida | Completo. |
| Até 7 dias de atraso | Completo, com aviso no painel. |
| 7 a 30 dias | PDV, caixa e vitrine funcionam; catálogo, financeiro, equipe e vitrine (configuração) bloqueados. |
| Mais de 30 dias | Somente leitura; vitrine fora do ar. Nada é apagado. |
| Cancelada | Acesso até o fim do período pago; depois, somente leitura. |

**Assentos:** `OWNER`, `GERENTE`, `VENDEDOR` e `CAIXA` ocupam assento; `CLIENTE`
não. O convite e a reativação chamam `assertSeatAvailable()`. **Vendas** são
faixa de uso: o painel avisa em 80% e 100%, mas o PDV nunca é bloqueado por
volume.

**Teste:** 14 dias no plano Loja, sem cartão. Ao escolher o plano, a troca é
recusada se a equipe ativa (mais assentos extras) não couber — obriga a desativar
logins antes de descer para o Essencial, em vez de deixar a loja acima do limite.

**Diferenças entre planos:** hoje o que muda é capacidade (assentos, vendas e
lojas). Módulos, caixa por turno e papéis são iguais em todos. Multi-loja é
contratual e habilitado pelo suporte; a consolidação entre unidades está em
rollout — a página `/ajuda/planos` diz isso de forma explícita para não vender
recurso que ainda não está na conta.

**Provedor:** Asaas (`src/lib/billing/asaas.ts`), via Pix, boleto ou cartão. Sem
`ASAAS_API_KEY` a contratação online fica desligada e a tela mostra o aviso. O
webhook `POST /api/webhooks/asaas` valida `asaas-access-token`, grava o evento em
`payment_events` (chave única por provedor + id externo) e só então aplica
assinatura, fatura e comissão.

**Migração:** `drizzle/0003_billing.sql` cria as tabelas de cobrança e concede
**90 dias de cortesia** (`LEGACY`) às lojas existentes. Ao final, a loja segue a
regra normal de contratação.

**Painel interno:** `/admin` exige `PLATFORM_ADMIN_EMAILS`. Quem está na lista é
espelhado em `platform_admins` no primeiro acesso; remover da variável revoga.

---

## 4. Modelo de dados

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

## 5. Deploy na Vercel

1. Importe o repositório na Vercel (framework detectado automaticamente).
2. Em **Storage**, crie um **Blob store** com acesso **public** e conecte ao
   projeto — isso injeta `BLOB_READ_WRITE_TOKEN`.
3. Em **Settings → Environment Variables**, adicione `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `APP_URL`, `EMAIL_USER`,
   `EMAIL_PASS` e `EMAIL_FROM`. Se preferir o Resend, adicione
   `RESEND_API_KEY` em vez de `EMAIL_PASS`.
4. As migrações rodam automaticamente no build (`vercel-build` executa
   `npm run db:migrate` antes de `next build`). Se preferir aplicar antes do
   deploy, rode `npm run db:migrate` apontando para o banco de produção
   (localmente, com as variáveis de produção no `.env.local`, ou pela pipeline
   de CI).
5. Deploy.

### Modo de acesso do Blob store

O modo é escolhido quando a store é criada e **não muda depois**. O app funciona
nos dois, então você não fica bloqueado se já criou uma store privada:

| Modo | Como a imagem chega ao navegador | Quando usar |
| --- | --- | --- |
| **public** | URL do próprio Blob, servida direto pelo CDN | **Recomendado.** É o caso das fotos de produto, que precisam ser vistas por qualquer visitante da vitrine |
| **private** | Rota `/api/blob/...` lê o arquivo autenticado e devolve os bytes | Se a store já existe como privada, ou se o conteúdo exigir autenticação |

O modo é detectado na primeira imagem enviada e memorizado na instância. No modo
privado, a rota de leitura manda `cache-control: immutable` — como cada caminho
tem um UUID, a Vercel cacheia na borda e não há uma invocação de função por
visualização.

Trocar de store depois é seguro: a leitura tenta um modo e cai no outro, então
imagens antigas continuam abrindo.

### Dois detalhes que costumam pegar

**Migrações rodam no build, mas dependem das variáveis certas.** O
`vercel-build` aplica as migrações pendentes antes do `next build`
([`scripts/migrate.mjs`](./scripts/migrate.mjs)). O script usa a
`DATABASE_URL_UNPOOLED` quando ela existe — DDL por conexão direta evita o
pooler. Se a variável não estiver no ambiente do deploy, ele cai para
`DATABASE_URL` e avisa no log. Sem nenhuma das duas, o build para com a mensagem
"Nenhuma connection string encontrada".

Se o banco já tinha tabelas criadas à mão (SQL colado no editor do Neon, por
exemplo) e não tem a tabela `drizzle.__drizzle_migrations`, o runner reaproveita
os objetos existentes (`42P07`, `42701`, `42710`) e registra as migrações como
aplicadas, em vez de abortar o build com "already exists". Depois ele confere se
`users` e `auth_tokens` têm as colunas usadas pela autenticação; se faltar
alguma, o build falha nomeando a coluna, porque a tela quebraria em runtime.

Se algum build precisar passar sem banco (Preview sem `DATABASE_URL`, por
exemplo), defina `SKIP_DB_MIGRATIONS=1` no ambiente: o passo é ignorado e o log
registra isso.

**Deployment Protection pode barrar visitantes (não é tarefa de deploy).** É uma
configuração de acesso, em **Settings → Deployment Protection**. Quando ativa, o
domínio passa a exigir login na Vercel — inclusive `/loja/[slug]`, `/termos` e
`/privacidade`.

O detalhe que engana: **quem tem acesso ao projeto na Vercel entra sem ver nada**,
porque o Vercel Authentication reconhece a sessão. Por isso a proteção costuma
passar despercebida para o dono e só aparecer para o cliente final. Teste em uma
**janela anônima** (ou `curl -sI https://seu-dominio | head -3`): se vier `200`, a
vitrine está pública e não há nada a fazer; se vier `302` para `vercel.com/sso-api`,
desligue a proteção no domínio de produção e mantenha apenas nos *previews*.

---

## 6. Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento. |
| `npm run build` | Build de produção. |
| `npm run start` | Sobe o build de produção. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Testes de unidade (`node --test`, inclui as regras de cobrança). |
| `npm run db:generate` | Gera nova migração a partir do schema. |
| `npm run db:migrate` | Aplica as migrações pendentes. |
| `npm run db:push` | Sincroniza o schema sem versionar. |
| `npm run db:studio` | Abre o Drizzle Studio. |

---

## 7. Documentos legais e ajuda

Três páginas públicas completam o produto:

| Página | Conteúdo |
| --- | --- |
| `/termos` | Termos de Uso: conta, uso aceitável, titularidade dos dados, disponibilidade e limitação de responsabilidade. |
| `/privacidade` | Política de Privacidade alinhada à LGPD: papéis de controlador e operador, cookies, subprocessadores, retenção e direitos do titular. |
| `/ajuda` | Central de ajuda: primeiros passos, plano, guia de cada módulo, tabela de permissões por papel e perguntas frequentes. |
| `/ajuda/planos` | Planos e cobrança: comparativo, adicionais, teste, atraso, cancelamento e reajuste. |
| `/afiliados` | Programa de afiliados: comissão recorrente, regras de apuração e cadastro. |

Ficam no grupo de rotas `(public)` e compartilham o mesmo cabeçalho e rodapé
([`site-footer.tsx`](./src/components/site-footer.tsx)).

### Dados do fornecedor

Os dados do fornecedor estão em **um único lugar**:
[`src/lib/legal.ts`](./src/lib/legal.ts) — razão social, CNPJ, endereço, contato,
encarregado de dados e site. Os Termos e a Política leem desse arquivo, então
qualquer mudança vale para os dois documentos de uma vez.

### Acesso ao painel interno

`/admin` não depende de papel na loja: valida o e-mail do usuário contra
`PLATFORM_ADMIN_EMAILS`. A cada requisição o `requirePlatformAdmin()` confere a
variável, e a tabela `platform_admins` serve apenas como registro de quem já
entrou. Consequências:

- e-mail fora da lista → acesso negado, mesmo que já tenha entrado antes;
- variável vazia → ninguém acessa `/admin` (inclusive em produção);
- o usuário precisa ser uma conta ativa e com e-mail confirmado, o que já é
  exigido no login.

Quem está na lista vê o grupo **Plataforma → Administração interna** no menu
lateral do app. A visibilidade usa `isPlatformAdminEmail()`, que lê só a
variável (sem query, porque o menu é montado em toda página); a autorização
continua em `requirePlatformAdmin()`, no layout e em cada action de `/admin`.
Remover o e-mail da variável faz o item desaparecer do menu e as ações
passarem a redirecionar.

> Os textos foram redigidos como base técnica e cobrem os pontos que a LGPD e a
> prática de SaaS exigem, mas **não substituem revisão jurídica**. Peça a um
> advogado para validar cláusulas de responsabilidade e foro antes de tratar o
> documento como contrato definitivo.

### Registro do aceite

O cadastro em `/cadastro` exige marcar o aceite dos Termos e da Política, com
links para os dois documentos. O servidor valida o aceite (`registerSchema`) e
grava `users.terms_accepted_at`, que serve como prova de quando cada usuário
concordou.

---

## 8. Identidade visual

A marca do Store77 fica em [`public/`](./public):

| Arquivo | Uso |
| --- | --- |
| `logoname.png` | Logotipo horizontal com o nome — cabeçalho do app, login e landing ([`src/components/brand.tsx`](./src/components/brand.tsx)). |
| `logo.png` | Símbolo (sacola) isolado — avatar, redes sociais, ícone. |
| `logoDev.png` | Marca da AUTORIC, usada no rodapé das páginas públicas e no fim do menu lateral. |
| `favicon_io/` | Pacote completo de favicons, declarado no [`src/app/layout.tsx`](./src/app/layout.tsx) e no `site.webmanifest`. |

Use o componente `Brand` em vez de repetir o `<Image>` — assim trocar a arte
acontece em um lugar só. **Exceção:** a vitrine em [`/loja/[slug]`](./src/app/loja/%5Bslug%5D/page.tsx)
usa a logo *da loja* (`stores.logoUrl`, configurada em `/vitrine`), nunca a do Store77.

A cor da marca vive em [`src/app/globals.css`](./src/app/globals.css) (rampa
`--color-brand-*`, derivada do vermelho `#c01020` da logo). A paleta da *vitrine de
cada loja* é separada e configurável por loja em `/vitrine` — é ela que colore a
landing page do cliente final.

> Os arquivos `.jpeg` de resolução maior foram removidos: vinham **sem canal
> alfa**, com o xadrez de transparência gravado nos pixels, e somavam 4 MB sem
> uso. Os `.png` ao lado são os arquivos que o app consome.

---

## 9. Decisões e próximos passos

**Decisões**

- **Sessão própria** (JWT HS256 em cookie `httpOnly`) em vez de Auth.js: o
  modelo é multi-tenant com 5 papéis e não há login social. Trocar por Auth.js
  depois é uma mudança localizada em [`src/lib/auth.ts`](./src/lib/auth.ts).
- **Fotos**: Vercel Blob em produção; sem `BLOB_READ_WRITE_TOKEN`, o ambiente de
  desenvolvimento grava em `public/uploads` para não exigir token. O app se
  adapta aos dois modos de acesso da store — veja a seção 5.
- **Vendas não viram lançamento financeiro.** A receita é lida direto de `sales`
  (fonte única) e `financial_entries` guarda só lançamentos manuais, evitando
  contagem duplicada.
- **Preços e custos sempre relidos do banco** no fechamento da venda — nunca
  confiamos em valores enviados pelo cliente.
- Toda escrita de estoque roda em transação com `SELECT … FOR UPDATE` na linha do
  produto, e a numeração da venda trava a linha da loja.
- **Cobrança com catálogo em código.** Preço é regra versionada (`PRICE_VERSION`),
  não dado editável no banco; a fatura guarda o valor cobrado. O provedor inicial
  é o Asaas; `billing_provider_name` guarda `ASAAS`, `STRIPE` e `MANUAL`. A comissão
  de afiliado é apurada no webhook, com retenção de 30 dias para cobrir estorno.
  O repasse é um Pix de `/transfers`, na chave do afiliado, que só vira "pago"
  quando chega `TRANSFER_DONE`; falha devolve as comissões para a fila.
- **Vendas são faixa de uso, assentos são limite firme.** Travar o PDV por volume
  custa mais que o upgrade: o sistema avisa em 80% e 100% e sugere pacote.

**Próximos passos sugeridos**

- Checkout online de verdade (hoje a vitrine converte via WhatsApp).
- Leitor de código de barras no PDV (o campo `barcode` já existe).
- Relatórios por período (curva ABC, giro de estoque, lucratividade).
- Row Level Security no Neon, trocando o filtro por `store_id` na aplicação por
  política no banco.
- Portal do afiliado com link, cliques e extrato (hoje o credenciamento é manual).
- Cupons de desconto self-service (as tabelas `coupons` e `coupon_redemptions` já existem).
- Exportação CSV/JSON pelo próprio painel, inclusive em loja suspensa.
