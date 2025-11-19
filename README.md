# 库存管理系统

一个基于 React + Ant Design + Supabase 的现代化库存管理系统，支持多用户协作、实时数据同步和库存预警功能。

## 功能特性

- 🔐 **用户认证**：支持注册、登录和权限管理
- 📦 **产品管理**：产品信息的增删改查
- 📥 **入库管理**：记录产品入库信息
- 📤 **出库管理**：记录产品出库信息
- 📊 **数据统计**：实时库存概览和统计图表
- ⚠️ **库存预警**：自动监控库存水平，及时预警
- 📜 **历史记录**：完整的操作历史追踪
- 📈 **报表导出**：支持数据导出功能

## 技术栈

- **前端框架**：React 18 + TypeScript
- **UI 组件库**：Ant Design 5
- **构建工具**：Vite
- **样式处理**：TailwindCSS
- **后端服务**：Supabase (PostgreSQL + Auth + Realtime)
- **部署平台**：Vercel

## 快速开始

### 前置要求

- Node.js 16+
- npm 或 yarn
- Supabase 账号

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd inventory-management
```

2. **安装依赖**
```bash
npm install
```

3. **配置 Supabase**

访问 [Supabase](https://supabase.com) 创建新项目，获取项目 URL 和 API Key。

4. **配置环境变量**

复制 `.env.example` 为 `.env`，填入您的 Supabase 配置：
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. **创建数据库表**

在 Supabase SQL 编辑器中执行以下 SQL：

```sql
-- 产品表
CREATE TABLE products (
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
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK (type IN ('in', 'out')),
  quantity INTEGER NOT NULL,
  before_stock INTEGER,
  after_stock INTEGER,
  operator_id UUID,
  reason TEXT,
  supplier VARCHAR(200),
  department VARCHAR(200),
  batch_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 预警表
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(20),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 分类表
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);
```

6. **启动开发服务器**
```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 部署到 Vercel

1. **推送代码到 GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **连接 Vercel**
- 访问 [Vercel](https://vercel.com)
- 导入 GitHub 仓库
- 配置环境变量
- 点击部署

## 项目结构

```
inventory-management/
├── src/
│   ├── pages/          # 页面组件
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Products.tsx
│   │   ├── StockIn.tsx
│   │   ├── StockOut.tsx
│   │   ├── History.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── lib/            # 工具库
│   │   └── supabase.ts
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 入口文件
│   └── index.css       # 全局样式
├── public/             # 静态资源
├── package.json        # 项目配置
└── vite.config.ts      # Vite 配置
```

## 使用说明

1. **注册账号**：首次使用需要注册账号
2. **登录系统**：使用邮箱和密码登录
3. **添加产品**：在产品管理页面添加产品信息
4. **出入库操作**：记录产品的入库和出库
5. **查看报表**：在仪表盘查看库存概览和统计

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
