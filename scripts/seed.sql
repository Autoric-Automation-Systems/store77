-- Store77 · dados de demonstração
--
-- Requer as migrações 0000_initial e 0001_terms_accepted aplicadas.
--
-- Como usar: cole este arquivo inteiro no SQL Editor do Neon (ou rode
--   psql <connection string> -f scripts/seed.sql
-- ).
--
-- O script é escrito em SQL puro, sem bloco DO/plpgsql e sem dollar-quoting,
-- justamente para funcionar em qualquer cliente — inclusive nos editores que
-- enviam o script statement por statement.
--
-- É reexecutável: apaga a loja de demonstração (slug loja-demo) e recria tudo do
-- zero. As FKs usam ON DELETE CASCADE, então produtos, movimentações e usuários
-- vão junto.
--
-- Credenciais criadas (troque a senha ao assumir a loja):
--   demo@store77.app     · OWNER    · senha: store77demo
--   gerente@store77.app  · GERENTE  · senha: store77demo
--   vendedor@store77.app · VENDEDOR · senha: store77demo

-- 1. Remove a loja de demonstração anterior (cascata em todo o resto).
DELETE FROM stores WHERE slug = 'loja-demo';


-- 2. Loja + identidade visual da vitrine.
INSERT INTO stores (
  name, slug, email, phone, whatsapp, address,
  hero_title, hero_subtitle, about_text,
  primary_color, secondary_color, accent_color,
  is_public, show_out_of_stock
) VALUES (
  'Empório da Esquina',
  'loja-demo',
  'contato@emporiodaesquina.com.br',
  '(11) 3333-4444',
  '5511999999999',
  'Rua das Palmeiras, 120 — Vila Mariana, São Paulo/SP',
  'Do café da manhã ao churrasco do fim de semana',
  'Bebidas geladas, mercearia fina e entrega no mesmo dia para toda a região.',
  'Somos um empório de bairro desde 2009. Trabalhamos com produtores locais e mantemos o estoque atualizado em tempo real: o que aparece na vitrine está na prateleira.',
  '#0f766e',
  '#0f172a',
  '#f59e0b',
  TRUE,
  FALSE
);


-- 3. Usuários da loja. O hash é bcrypt da senha store77demo.
INSERT INTO users (store_id, name, email, password_hash, role, terms_accepted_at)
SELECT s.id, v.name, v.email, v.password_hash, v.role::user_role, now()
FROM stores s
CROSS JOIN (VALUES
  ('Ana Ribeiro', 'demo@store77.app', '$2b$10$DlXPztLgsWNpmJo7iuq/MeHbjLBVy9KduHulzgDX1KzFbdrn0Yt.y', 'OWNER'),
  ('Carlos Menezes', 'gerente@store77.app', '$2b$10$DlXPztLgsWNpmJo7iuq/MeHbjLBVy9KduHulzgDX1KzFbdrn0Yt.y', 'GERENTE'),
  ('Juliana Prado', 'vendedor@store77.app', '$2b$10$DlXPztLgsWNpmJo7iuq/MeHbjLBVy9KduHulzgDX1KzFbdrn0Yt.y', 'VENDEDOR')
) AS v(name, email, password_hash, role)
WHERE s.slug = 'loja-demo';


-- 4. Tipos de produto e nichos (organizam os carrosséis da vitrine).
INSERT INTO categories (store_id, name, slug, kind, description, sort_order)
SELECT s.id, v.name, v.slug, v.kind, v.description, v.sort_order
FROM stores s
CROSS JOIN (VALUES
  ('Bebidas', 'bebidas', 'TIPO', 'Geladas, prontas para levar.', 1),
  ('Mercearia', 'mercearia', 'TIPO', 'Itens de despensa do dia a dia.', 2),
  ('Limpeza', 'limpeza', 'TIPO', 'Casa limpa, sem esquecer nada.', 3),
  ('Cesta de café da manhã', 'nicho-cafe', 'NICHO', 'Combinação montada para presente.', 4)
) AS v(name, slug, kind, description, sort_order)
WHERE s.slug = 'loja-demo';


-- 5. Produtos. MER-005 começa zerado e LMP-003 / BEB-005 ficam abaixo do mínimo,
--    para os alertas de reposição do painel aparecerem preenchidos.
INSERT INTO products (
  store_id, category_id, code, name, description, barcode, unit,
  price_cents, cost_cents, quantity, min_quantity, location, active
)
SELECT
  s.id, c.id, v.code, v.name, v.description, v.barcode, v.unit,
  v.price_cents, v.cost_cents, v.quantity, v.min_quantity, v.location, TRUE
FROM stores s
CROSS JOIN (VALUES
  ('BEB-001', 'Água mineral sem gás 500ml', 'Garrafa de 500ml, gelada no balcão.', '7891000000017', 'UN', 350, 180, 120, 24, 'Corredor A · Prateleira 1'),
  ('BEB-002', 'Água mineral com gás 500ml', 'Garrafa de 500ml, gelada no balcão.', '7891000000024', 'UN', 400, 200, 84, 24, 'Corredor A · Prateleira 1'),
  ('BEB-003', 'Refrigerante cola 2L', 'Garrafa PET de 2 litros.', '7891000000031', 'UN', 1090, 640, 36, 12, 'Corredor A · Prateleira 2'),
  ('BEB-004', 'Cerveja pilsen lata 350ml', 'Lata 350ml, vendida por unidade.', '7891000000048', 'UN', 449, 270, 240, 48, 'Geladeira 2'),
  ('BEB-005', 'Suco de uva integral 1L', 'Sem açúcar adicionado.', '7891000000055', 'UN', 1790, 1120, 8, 12, 'Corredor A · Prateleira 3'),
  ('MER-001', 'Café torrado e moído 500g', 'Torra média, moagem fina.', '7891000000062', 'UN', 2190, 1450, 45, 10, 'Corredor B · Prateleira 1'),
  ('MER-002', 'Arroz branco tipo 1 5kg', 'Pacote de 5 quilos.', '7891000000079', 'UN', 2450, 1890, 28, 8, 'Corredor C · Pallet 1'),
  ('MER-003', 'Feijão carioca 1kg', 'Pacote de 1 quilo.', '7891000000086', 'UN', 890, 610, 52, 12, 'Corredor C · Pallet 1'),
  ('MER-004', 'Leite integral 1L', 'Caixa longa vida.', '7891000000093', 'UN', 549, 390, 96, 24, 'Corredor B · Prateleira 2'),
  ('MER-005', 'Pão de queijo congelado 1kg', 'Pacote de 1 quilo, pronto para assar.', '7891000000109', 'UN', 2890, 1980, 0, 6, 'Freezer 1'),
  ('LMP-001', 'Detergente neutro 500ml', 'Frasco de 500ml.', '7891000000116', 'UN', 399, 230, 64, 12, 'Corredor D · Prateleira 1'),
  ('LMP-002', 'Sabão em pó 1,6kg', 'Caixa de 1,6 quilo.', '7891000000123', 'UN', 1990, 1340, 22, 6, 'Corredor D · Prateleira 3'),
  ('LMP-003', 'Desinfetante lavanda 2L', 'Frasco de 2 litros.', '7891000000130', 'UN', 1290, 820, 5, 8, 'Corredor D · Prateleira 2')
) AS v(code, name, description, barcode, unit, price_cents, cost_cents, quantity, min_quantity, location)
JOIN categories c
  ON c.store_id = s.id
 AND c.name = CASE
   WHEN v.code LIKE 'BEB-%' THEN 'Bebidas'
   WHEN v.code LIKE 'MER-%' THEN 'Mercearia'
   ELSE 'Limpeza'
 END
WHERE s.slug = 'loja-demo';


-- 6. Estoque inicial: uma entrada por produto, com o saldo já cadastrado, para o
--    saldo de cada produto reconciliar com o último movimento do histórico.
INSERT INTO stock_movements (
  store_id, product_id, type, quantity, balance_after, unit_cost_cents, reason, user_id
)
SELECT
  p.store_id, p.id, 'ENTRADA'::movement_type, p.quantity, p.quantity, p.cost_cents,
  'Estoque inicial (seed)',
  (SELECT u.id FROM users u WHERE u.store_id = p.store_id AND u.role = 'OWNER' ORDER BY u.created_at LIMIT 1)
FROM products p
JOIN stores s ON s.id = p.store_id
WHERE s.slug = 'loja-demo' AND p.quantity > 0;


-- 7. Produtos zerados: entrada seguida de baixa, para o histórico fechar em 0.
INSERT INTO stock_movements (
  store_id, product_id, type, quantity, balance_after, unit_cost_cents, reason, user_id
)
SELECT
  p.store_id, p.id, 'ENTRADA'::movement_type, 6, 6, p.cost_cents,
  'Estoque inicial (seed)',
  (SELECT u.id FROM users u WHERE u.store_id = p.store_id AND u.role = 'OWNER' ORDER BY u.created_at LIMIT 1)
FROM products p
JOIN stores s ON s.id = p.store_id
WHERE s.slug = 'loja-demo' AND p.quantity = 0;

INSERT INTO stock_movements (
  store_id, product_id, type, quantity, balance_after, reason, user_id
)
SELECT
  p.store_id, p.id, 'SAIDA'::movement_type, 6, 0,
  'Perda por vencimento',
  (SELECT u.id FROM users u WHERE u.store_id = p.store_id AND u.role = 'OWNER' ORDER BY u.created_at LIMIT 1)
FROM products p
JOIN stores s ON s.id = p.store_id
WHERE s.slug = 'loja-demo' AND p.quantity = 0;


-- 8. Clientes da loja.
INSERT INTO customers (store_id, name, phone, document, address, notes)
SELECT s.id, v.name, v.phone, v.document, v.address, v.notes
FROM stores s
CROSS JOIN (VALUES
  ('Mercado Bom Preço (revenda)', '5511988887777', '12.345.678/0001-90', 'Av. Industrial, 900', 'Compra em volume, paga em 28 dias.'),
  ('Roberto Lima', '(11) 97777-1234', '123.456.789-00', 'Rua Alagoas, 45, apto 32', 'Prefere atendimento pelo WhatsApp.')
) AS v(name, phone, document, address, notes)
WHERE s.slug = 'loja-demo';
