-- ====================================================================
-- ChainPulse AI: Complete Supabase PostgreSQL Schema & Migrations
-- Intelligent Supply Chain Disruption Prediction & Recovery System
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'Operations Analyst',
        'Supply Chain Manager',
        'Warehouse Operator',
        'Procurement Approver',
        'Administrator'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'Operations Analyst',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT NOT NULL,
    reliability_score NUMERIC(5,2) NOT NULL DEFAULT 95.00 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended', 'High Risk')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Discontinued', 'Supply Constrained')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. WAREHOUSES TABLE
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    manager TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Operational' CHECK (status IN ('Operational', 'Congested', 'Maintenance', 'Inactive')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    available_stock INTEGER NOT NULL DEFAULT 0 CHECK (available_stock >= 0),
    reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    minimum_stock INTEGER NOT NULL DEFAULT 10 CHECK (minimum_stock >= 0),
    last_updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_warehouse UNIQUE (product_id, warehouse_id)
);

-- 8. SHIPMENTS TABLE
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_code TEXT UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    source_location TEXT NOT NULL,
    destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    carrier_name TEXT NOT NULL,
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'In Transit' CHECK (status IN ('Pending', 'In Transit', 'Delayed', 'Delivered', 'Cancelled')),
    tracking_reference TEXT,
    delay_days INTEGER NOT NULL DEFAULT 0 CHECK (delay_days >= 0),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CUSTOMER ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    destination_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    delivery_address TEXT NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_deadline DATE NOT NULL,
    priority priority_level NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'In Transit', 'Delivered', 'Delayed', 'Cancelled')),
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_category TEXT NOT NULL DEFAULT 'LOW' CHECK (risk_category IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    required_quantity INTEGER NOT NULL CHECK (required_quantity > 0),
    allocated_quantity INTEGER NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0),
    shortage_quantity INTEGER NOT NULL DEFAULT 0 CHECK (shortage_quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. DISRUPTIONS TABLE
CREATE TABLE IF NOT EXISTS disruptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disruption_code TEXT UNIQUE NOT NULL,
    disruption_type TEXT NOT NULL CHECK (disruption_type IN (
        'Supplier Delay', 'Shipment Delay', 'Inventory Shortage', 
        'Warehouse Disruption', 'Transportation Disruption', 'Unexpected Demand', 'Other'
    )),
    related_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    related_shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
    affected_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    affected_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    expected_delay_days INTEGER NOT NULL DEFAULT 0 CHECK (expected_delay_days >= 0),
    shortage_quantity INTEGER NOT NULL DEFAULT 0 CHECK (shortage_quantity >= 0),
    severity severity_level NOT NULL DEFAULT 'Medium',
    description TEXT NOT NULL,
    reported_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Investigating', 'Mitigating', 'Resolved')),
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. RECOVERY PLANS TABLE
CREATE TABLE IF NOT EXISTS recovery_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_code TEXT UNIQUE NOT NULL,
    disruption_id UUID NOT NULL REFERENCES disruptions(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('Stock Reallocation', 'Expedited Shipping', 'Alternative Supplier', 'Order Splitting')),
    proposed_by_user_id TEXT NOT NULL,
    proposed_by_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending Approval' CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Executed')),
    estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (estimated_cost >= 0),
    estimated_delay_reduction_days INTEGER NOT NULL DEFAULT 0,
    orders_recovered_count INTEGER NOT NULL DEFAULT 0,
    recovery_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    feasibility_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    rejection_reason TEXT,
    execution_result TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. RECOVERY PLAN ITEMS TABLE
CREATE TABLE IF NOT EXISTS recovery_plan_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recovery_plan_id UUID NOT NULL REFERENCES recovery_plans(id) ON DELETE CASCADE,
    item_action TEXT NOT NULL,
    source_entity_id TEXT,
    target_entity_id TEXT,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. APPROVALS TABLE
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recovery_plan_id UUID NOT NULL REFERENCES recovery_plans(id) ON DELETE CASCADE,
    approver_user_id TEXT NOT NULL,
    approver_name TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('Approved', 'Rejected', 'Modified')),
    comments TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT, -- NULL means broadcast to relevant roles
    target_role TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'danger', 'success')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. CARRIER WEBHOOK EVENTS TABLE
CREATE TABLE IF NOT EXISTS carrier_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id TEXT NOT NULL,
    event TEXT NOT NULL,
    delay_days INTEGER NOT NULL DEFAULT 0,
    location TEXT,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- TRIGGERS & FUNCTIONS
-- ====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_timestamp ON %I', t);
        EXECUTE format('CREATE TRIGGER trg_update_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column()', t);
    END LOOP;
END $$;

-- View for Dashboard KPI Analytics
CREATE OR REPLACE VIEW v_supply_chain_kpis AS
SELECT
    (SELECT COUNT(*) FROM suppliers WHERE status = 'Active') AS active_suppliers_count,
    (SELECT COUNT(*) FROM shipments WHERE status IN ('In Transit', 'Delayed')) AS active_shipments_count,
    (SELECT COUNT(*) FROM disruptions WHERE status IN ('Active', 'Investigating')) AS active_disruptions_count,
    (SELECT COUNT(*) FROM orders WHERE status NOT IN ('Delivered', 'Cancelled')) AS open_orders_count,
    (SELECT COUNT(*) FROM orders WHERE risk_category IN ('HIGH', 'CRITICAL') AND status NOT IN ('Delivered', 'Cancelled')) AS critical_orders_count,
    (SELECT COUNT(*) FROM inventory WHERE available_stock < minimum_stock) AS stock_shortage_count,
    (SELECT COUNT(*) FROM recovery_plans WHERE status = 'Pending Approval') AS pending_approvals_count;

-- Row Level Security (RLS) Enablement
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated read/write based on application roles
CREATE POLICY "Public read for authenticated users" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Public read for authenticated users" ON products FOR SELECT USING (true);
CREATE POLICY "Public read for authenticated users" ON warehouses FOR SELECT USING (true);
CREATE POLICY "Public read for authenticated users" ON inventory FOR SELECT USING (true);
CREATE POLICY "Public read for authenticated users" ON shipments FOR SELECT USING (true);
CREATE POLICY "Public read for authenticated users" ON orders FOR SELECT USING (true);
CREATE POLICY "Public read for authenticated users" ON disruptions FOR SELECT USING (true);
CREATE POLICY "Public read for authenticated users" ON recovery_plans FOR SELECT USING (true);
CREATE POLICY "Public read for authenticated users" ON audit_logs FOR SELECT USING (true);
