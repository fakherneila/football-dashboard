-- backend/schema_business.sql

-- Regions (replaces leagues)
CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY,
    name TEXT,
    territory TEXT,
    fiscal_year INTEGER
);

-- Branches/Sales Teams (replaces teams)
CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY,
    name TEXT,
    region_id INTEGER,
    manager TEXT,
    employee_count INTEGER,
    established_date TEXT,
    FOREIGN KEY(region_id) REFERENCES regions(id)
);

-- Sales Transactions (replaces matches)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY,
    branch_id INTEGER,
    customer_name TEXT,
    amount DECIMAL(10,2),
    transaction_date TEXT,
    status TEXT,  -- 'completed', 'pending', 'cancelled'
    product_category TEXT,
    payment_method TEXT,
    profit_margin DECIMAL(5,2),
    FOREIGN KEY(branch_id) REFERENCES branches(id)
);

-- Sales Rankings (replaces standings)
CREATE TABLE IF NOT EXISTS sales_rankings (
    id INTEGER PRIMARY KEY,
    region_id INTEGER,
    branch_id INTEGER,
    rank INTEGER,
    total_revenue DECIMAL(12,2),
    transactions_count INTEGER,
    avg_order_value DECIMAL(10,2),
    total_profit DECIMAL(12,2),
    snapshot_date TEXT,
    FOREIGN KEY(region_id) REFERENCES regions(id),
    FOREIGN KEY(branch_id) REFERENCES branches(id)
);

-- Top Performers (replaces top scorers)
CREATE TABLE IF NOT EXISTS top_performers (
    id INTEGER PRIMARY KEY,
    name TEXT,
    branch_id INTEGER,
    role TEXT,
    total_sales DECIMAL(10,2),
    deals_count INTEGER,
    achievement_percent DECIMAL(5,2),
    snapshot_date TEXT,
    FOREIGN KEY(branch_id) REFERENCES branches(id)
);