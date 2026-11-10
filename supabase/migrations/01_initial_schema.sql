-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. RESTAURANTS
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    currency VARCHAR(10) DEFAULT '₹',
    upi_id VARCHAR(100) DEFAULT 'hotel@upi',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100) DEFAULT 'hotel@upi';

-- 3. STAFF (Supabase Auth)
DO $$ BEGIN
    CREATE TYPE staff_role AS ENUM ('owner', 'cashier', 'kitchen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    role staff_role NOT NULL DEFAULT 'cashier',
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, auth_user_id)
);

-- 4. TABLES
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    qr_token UUID UNIQUE DEFAULT uuid_generate_v4(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

-- 5. MENU CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name_mr VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name_mr VARCHAR(150) NOT NULL,
    name_hi VARCHAR(150) NOT NULL,
    name_en VARCHAR(150) NOT NULL,
    description_mr TEXT,
    description_hi TEXT,
    description_en TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_veg BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLE SESSIONS
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 8. ORDERS
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('new', 'accepted', 'preparing', 'ready', 'served', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
    order_number SERIAL,
    status order_status NOT NULL DEFAULT 'new',
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    customer_notes TEXT,
    customer_phone VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    payment_mode VARCHAR(20) DEFAULT 'cash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'cash';

-- 9. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    notes TEXT
);

-- 10. BILLS
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
    payment_mode VARCHAR(30) DEFAULT 'cash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SERVICE CALLS
DO $$ BEGIN
    CREATE TYPE service_type AS ENUM ('waiter', 'water', 'bill');
    CREATE TYPE service_status AS ENUM ('pending', 'acknowledged', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS service_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    type service_type NOT NULL,
    status service_status NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES staff(id) ON DELETE SET NULL
);

-- 12. INDEXES
CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_service_calls_active ON service_calls(table_id, type, requested_at) WHERE status != 'completed';

-- 13. ENABLE REALTIME
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE service_calls;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 14. HELPER FUNCTION
CREATE OR REPLACE FUNCTION get_auth_restaurant_id()
RETURNS UUID AS $$
    SELECT restaurant_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 15. ROW LEVEL SECURITY (RLS) POLICIES (DROP IF EXISTS सह)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active restaurants" ON restaurants;
CREATE POLICY "Public can view active restaurants" ON restaurants FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public can view active tables by token" ON tables;
CREATE POLICY "Public can view active tables by token" ON tables FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public can view menu items" ON menu_items;
CREATE POLICY "Public can view menu items" ON menu_items FOR SELECT USING (is_available = TRUE);

DROP POLICY IF EXISTS "Public can view orders for table" ON orders;
CREATE POLICY "Public can view orders for table" ON orders FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public can view service calls" ON service_calls;
CREATE POLICY "Public can view service calls" ON service_calls FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Staff can manage all restaurant data" ON orders;
CREATE POLICY "Staff can manage all restaurant data" ON orders FOR ALL USING (restaurant_id = get_auth_restaurant_id());

DROP POLICY IF EXISTS "Staff can manage order items" ON order_items;
CREATE POLICY "Staff can manage order items" ON order_items FOR ALL USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.restaurant_id = get_auth_restaurant_id())
);

DROP POLICY IF EXISTS "Staff can manage service calls" ON service_calls;
CREATE POLICY "Staff can manage service calls" ON service_calls FOR ALL USING (restaurant_id = get_auth_restaurant_id());

DROP POLICY IF EXISTS "Staff can manage menu" ON menu_items;
CREATE POLICY "Staff can manage menu" ON menu_items FOR ALL USING (restaurant_id = get_auth_restaurant_id());

DROP POLICY IF EXISTS "Staff can manage categories" ON categories;
CREATE POLICY "Staff can manage categories" ON categories FOR ALL USING (restaurant_id = get_auth_restaurant_id());

DROP POLICY IF EXISTS "Staff can manage tables" ON tables;
CREATE POLICY "Staff can manage tables" ON tables FOR ALL USING (restaurant_id = get_auth_restaurant_id());

DROP POLICY IF EXISTS "Staff can manage bills" ON bills;
CREATE POLICY "Staff can manage bills" ON bills FOR ALL USING (restaurant_id = get_auth_restaurant_id());

-- नमुना डेटा (Sample seed data)
INSERT INTO restaurants (id, name, slug, phone, address, upi_id)
VALUES ('a0000000-0000-0000-0000-000000000001', 'हॉटेल स्वाद', 'hotel-swad', '9876543210', 'पुणे, महाराष्ट्र', 'hotel@upi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tables (id, restaurant_id, table_number, qr_token)
VALUES 
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '1', '11111111-1111-1111-1111-111111111111'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '2', '22222222-2222-2222-2222-222222222222'),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '3', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, restaurant_id, name_mr, name_hi, name_en, sort_order)
VALUES 
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'नाश्ता', 'नाश्ता', 'Breakfast', 1),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'मुख्य जेवण', 'मुख्य भोजन', 'Main Course', 2),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'पेये व चहा', 'पेय पदार्थ', 'Beverages', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (restaurant_id, category_id, name_mr, name_hi, name_en, description_mr, price, is_veg, is_available)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'झणझणीत मिसळ पाव', 'मिसल पाव', 'Misal Pav', 'रस्सा, फरसाण आणि २ पाव', 80.00, true, true),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'गरमागरम कांदा भजी', 'कांदा भजिया', 'Kanda Bhaji', 'कुरकुरीत कांदा भजी', 60.00, true, true),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'पनीर बटर मसाला', 'पनीर बटर मसाला', 'Paneer Butter Masala', 'शाही ग्रेव्हीमध्ये ताजे पनीर', 180.00, true, true),
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'स्पेशल मसाला चहा', 'मसाला चाय', 'Masala Tea', 'आले आणि वेलचीयुक्त चहा', 20.00, true, true)
ON CONFLICT (id) DO NOTHING;
