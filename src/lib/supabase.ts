import { createClient } from '@supabase/supabase-js'

// 这些值需要从Supabase项目中获取
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 数据库类型定义
export interface Product {
  id: string
  code: string
  name: string
  category: string
  unit: string
  min_stock: number
  max_stock: number
  current_stock: number
  image_url?: string
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  type: 'in' | 'out'
  quantity: number
  before_stock: number
  after_stock: number
  operator_id: string
  reason?: string
  supplier?: string
  department?: string
  batch_no?: string
  created_at: string
  product?: Product
}

export interface Alert {
  id: string
  product_id: string
  type: 'low_stock' | 'high_stock' | 'expired'
  message: string
  is_read: boolean
  created_at: string
  product?: Product
}
