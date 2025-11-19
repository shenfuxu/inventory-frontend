-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 产品表
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(50),
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 999999,
  current_stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 库存变动记录表
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK (type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  before_stock INTEGER,
  after_stock INTEGER,
  operator_id UUID,
  operator_email VARCHAR(255),
  reason TEXT,
  supplier VARCHAR(200),
  department VARCHAR(200),
  batch_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 预警表
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('low_stock', 'high_stock')),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_alerts_product_id ON alerts(product_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);

-- 插入一些默认分类
INSERT INTO categories (name, description) VALUES
  ('电子产品', '电脑、手机、平板等电子设备'),
  ('办公用品', '文具、纸张、文件夹等办公用品'),
  ('生产原料', '生产所需的原材料'),
  ('成品', '已完成的产品'),
  ('工具设备', '生产工具和设备'),
  ('其他', '其他未分类物品')
ON CONFLICT (name) DO NOTHING;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建库存预警触发器
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查低库存
  IF NEW.current_stock < NEW.min_stock THEN
    INSERT INTO alerts (product_id, type, message)
    VALUES (NEW.id, 'low_stock', 
            '产品 ' || NEW.name || ' (编号: ' || NEW.code || ') 库存不足，当前库存: ' || NEW.current_stock || '，最低库存: ' || NEW.min_stock);
  END IF;
  
  -- 检查高库存
  IF NEW.current_stock > NEW.max_stock THEN
    INSERT INTO alerts (product_id, type, message)
    VALUES (NEW.id, 'high_stock', 
            '产品 ' || NEW.name || ' (编号: ' || NEW.code || ') 库存过量，当前库存: ' || NEW.current_stock || '，最高库存: ' || NEW.max_stock);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_alert_trigger AFTER UPDATE OF current_stock ON products
  FOR EACH ROW EXECUTE FUNCTION check_stock_alerts();

-- 启用Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 创建访问策略（允许已认证用户访问）
CREATE POLICY "Enable read access for all authenticated users" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- 为其他表创建类似的策略
CREATE POLICY "Enable all access for authenticated users" ON stock_movements
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON alerts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- 插入一些示例产品数据（可选）
INSERT INTO products (code, name, category, unit, min_stock, max_stock, current_stock) VALUES
  ('P001', '笔记本电脑 ThinkPad X1', '电子产品', '台', 5, 50, 23),
  ('P002', 'A4打印纸', '办公用品', '箱', 10, 100, 45),
  ('P003', '无线鼠标', '电子产品', '个', 10, 200, 67),
  ('P004', '订书机', '办公用品', '个', 5, 50, 12),
  ('P005', '白板笔', '办公用品', '盒', 20, 200, 89)
ON CONFLICT (code) DO NOTHING;
