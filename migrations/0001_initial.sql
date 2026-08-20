PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image TEXT,
  tag TEXT,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL DEFAULT 0,
  payment_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id, created_at);
INSERT OR IGNORE INTO tenants (id, name) VALUES ('noma', 'Noma Casa');
INSERT OR IGNORE INTO products (id, tenant_id, name, category, price_cents, stock, image, tag, description) VALUES
('1','noma','Luminária Nami','Iluminação',28990,8,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85','Novo','Luz suave e acolhedora com cúpula de linho e base em madeira certificada.'),
('2','noma','Poltrona Serena','Mobiliário',124900,4,'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1000&q=85','Mais vendido','Conforto generoso, linhas leves e tecido de alta durabilidade para desacelerar.'),
('3','noma','Vaso Terra','Decoração',13990,12,'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1000&q=85',NULL,'Cerâmica de acabamento fosco, moldada em pequenos lotes por artesãos locais.'),
('4','noma','Mesa Duna','Mobiliário',47990,6,'https://images.unsplash.com/photo-1532372320572-cda25653a694?auto=format&fit=crop&w=1000&q=85','Edição limitada','Mesa lateral compacta em madeira maciça com bordas suavemente arredondadas.'),
('5','noma','Manta Brisa','Têxteis',21990,10,'https://images.unsplash.com/photo-1583845112203-454c2254ed26?auto=format&fit=crop&w=1000&q=85',NULL,'Trama macia de algodão reciclado para trazer textura e aconchego ao ambiente.'),
('6','noma','Bandeja Orbe','Decoração',15990,9,'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1000&q=85','Novo','Uma peça versátil de cerâmica para organizar pequenos objetos com beleza.'),
('7','noma','Cadeira Linha','Mobiliário',69990,5,'https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=1000&q=85',NULL,'Estrutura leve, assento confortável e desenho atemporal para qualquer mesa.'),
('8','noma','Almofada Horizonte','Têxteis',11990,14,'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=85',NULL,'Capa removível de algodão com enchimento macio e toque natural.');
