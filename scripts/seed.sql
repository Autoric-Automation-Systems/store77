-- Store77 · dados de demonstração
--
-- Como usar: cole este arquivo no SQL Editor do Neon (ou rode
--   psql "$DATABASE_URL_UNPOOLED" -f scripts/seed.sql
-- ) DEPOIS de aplicar a migração drizzle/0000_initial.sql.
--
-- O script é reexecutável: apaga a loja de demonstração (slug `loja-demo`) e
-- recria tudo do zero. As FKs usam ON DELETE CASCADE, então produtos,
-- movimentações e usuários vão junto.
--
-- Credenciais criadas (troque a senha ao assumir a loja):
--   demo@store77.app     · OWNER    · senha: store77demo
--   gerente@store77.app  · GERENTE  · senha: store77demo
--   vendedor@store77.app · VENDEDOR · senha: store77demo

DO $$
DECLARE
  v_store_id uuid;
  v_owner_id uuid;
  v_manager_id uuid;
  v_seller_id uuid;
  v_hash text := '$2b$10$DlXPztLgsWNpmJo7iuq/MeHbjLBVy9KduHulzgDX1KzFbdrn0Yt.y';
BEGIN
  DELETE FROM stores WHERE slug = 'loja-demo';

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
    '#0f766e', '#0f172a', '#f59e0b',
    true, false
  ) RETURNING id INTO v_store_id;

  INSERT INTO users (store_id, name, email, password_hash, role, terms_accepted_at)
  VALUES (v_store_id, 'Ana Ribeiro', 'demo@store77.app', v_hash, 'OWNER', now())
  RETURNING id INTO v_owner_id;

  INSERT INTO users (store_id, name, email, password_hash, role, terms_accepted_at)
  VALUES (v_store_id, 'Carlos Menezes', 'gerente@store77.app', v_hash, 'GERENTE', now())
  RETURNING id INTO v_manager_id;

  INSERT INTO users (store_id, name, email, password_hash, role, terms_accepted_at)
  VALUES (v_store_id, 'Juliana Prado', 'vendedor@store77.app', v_hash, 'VENDEDOR', now())
  RETURNING id INTO v_seller_id;

  INSERT INTO categories (store_id, name, slug, kind, description, sort_order) VALUES
    (v_store_id, 'Bebidas', 'bebidas', 'TIPO', 'Geladas, prontas para levar.', 1),
    (v_store_id, 'Mercearia', 'mercearia', 'TIPO', 'Itens de despensa do dia a dia.', 2),
    (v_store_id, 'Limpeza', 'limpeza', 'TIPO', 'Casa limpa, sem esquecer nada.', 3),
    (v_store_id, 'Cesta de café da manhã', 'nicho-cafe', 'NICHO', 'Combinação montada para presente.', 4);

  INSERT INTO products (
    store_id, category_id, code, name, description, barcode, unit,
    price_cents, cost_cents, quantity, min_quantity, location, active
  )
  SELECT
    v_store_id,
    c.id,
    d.code,
    d.name,
    d.description,
    d.barcode,
    d.unit,
    d.price_cents,
    d.cost_cents,
    d.quantity,
    d.min_quantity,
    d.location,
    true
  FROM (VALUES
    ('BEB-001', 'Água mineral sem gás 500ml', 'Garrafa de 500ml, gelada no balcão.', '7891000000017', 'UN',  350,  180, 120, 24, 'Corredor A · Prateleira 1'),
    ('BEB-002', 'Água mineral com gás 500ml', 'Garrafa de 500ml, gelada no balcão.', '7891000000024', 'UN',  400,  200,  84, 24, 'Corredor A · Prateleira 1'),
    ('BEB-003', 'Refrigerante cola 2L',       'Garrafa PET de 2 litros.',            '7891000000031', 'UN', 1090,  640,  36, 12, 'Corredor A · Prateleira 2'),
    ('BEB-004', 'Cerveja pilsen lata 350ml',  'Lata 350ml, vendida por unidade.',    '7891000000048', 'UN',  449,  270, 240, 48, 'Geladeira 2'),
    ('BEB-005', 'Suco de uva integral 1L',    'Sem açúcar adicionado.',              '7891000000055', 'UN', 1790, 1120,   8, 12, 'Corredor A · Prateleira 3'),
    ('MER-001', 'Café torrado e moído 500g',  'Torra média, moagem fina.',           '7891000000062', 'UN', 2190, 1450,  45, 10, 'Corredor B · Prateleira 1'),
    ('MER-002', 'Arroz branco tipo 1 5kg',    'Pacote de 5 quilos.',                 '7891000000079', 'UN', 2450, 1890,  28,  8, 'Corredor C · Pallet 1'),
    ('MER-003', 'Feijão carioca 1kg',         'Pacote de 1 quilo.',                  '7891000000086', 'UN',  890,  610,  52, 12, 'Corredor C · Pallet 1'),
    ('MER-004', 'Leite integral 1L',          'Caixa longa vida.',                   '7891000000093', 'UN',  549,  390,  96, 24, 'Corredor B · Prateleira 2'),
    ('MER-005', 'Pão de queijo congelado 1kg', 'Pacote de 1 quilo, pronto para assar.', '7891000000109', 'UN', 2890, 1980,  0,  6, 'Freezer 1'),
    ('LMP-001', 'Detergente neutro 500ml',    'Frasco de 500ml.',                    '7891000000116', 'UN',  399,  230,  64, 12, 'Corredor D · Prateleira 1'),
    ('LMP-002', 'Sabão em pó 1,6kg',          'Caixa de 1,6 quilo.',                 '7891000000123', 'UN', 1990, 1340,  22,  6, 'Corredor D · Prateleira 3'),
    ('LMP-003', 'Desinfetante lavanda 2L',    'Frasco de 2 litros.',                 '7891000000130', 'UN', 1290,  820,   5,  8, 'Corredor D · Prateleira 2')
  ) AS d(code, name, description, barcode, unit, price_cents, cost_cents, quantity, min_quantity, location)
  JOIN categories c ON c.store_id = v_store_id AND c.name = CASE
    WHEN d.code LIKE 'BEB-%' THEN 'Bebidas'
    WHEN d.code LIKE 'MER-%' THEN 'Mercearia'
    ELSE 'Limpeza'
  END;

  -- Entrada inicial condizente com o saldo cadastrado (o estoque sempre
  -- reconcilia com o histórico de movimentações).
  INSERT INTO stock_movements (
    store_id, product_id, type, quantity, balance_after, unit_cost_cents, reason, user_id
  )
  SELECT
    v_store_id, p.id, 'ENTRADA', p.quantity, p.quantity, p.cost_cents, 'Estoque inicial (seed)', v_owner_id
  FROM products p
  WHERE p.store_id = v_store_id AND p.quantity > 0;

  -- Produtos zerados: entrada seguida de baixa, para o histórico fechar em 0.
  INSERT INTO stock_movements (
    store_id, product_id, type, quantity, balance_after, unit_cost_cents, reason, user_id
  )
  SELECT
    v_store_id, p.id, 'ENTRADA', 6, 6, p.cost_cents, 'Estoque inicial (seed)', v_owner_id
  FROM products p
  WHERE p.store_id = v_store_id AND p.quantity = 0;

  INSERT INTO stock_movements (
    store_id, product_id, type, quantity, balance_after, reason, user_id
  )
  SELECT
    v_store_id, p.id, 'SAIDA', 6, 0, 'Perda por vencimento', v_owner_id
  FROM products p
  WHERE p.store_id = v_store_id AND p.quantity = 0;

  INSERT INTO customers (store_id, name, phone, document, address, notes)
  VALUES
    (v_store_id, 'Mercado Bom Preço (revenda)', '5511988887777', '12.345.678/0001-90', 'Av. Industrial, 900', 'Compra em volume, paga em 28 dias.'),
    (v_store_id, 'Roberto Lima', '(11) 97777-1234', '123.456.789-00', 'Rua Alagoas, 45, apto 32', 'Prefere atendimento pelo WhatsApp.');

  RAISE NOTICE 'Seed concluído. Loja: % (slug loja-demo)', v_store_id;
END $$;
