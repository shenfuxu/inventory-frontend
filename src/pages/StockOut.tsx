import React, { useState, useEffect } from 'react'
import { Card, Form, Select, InputNumber, Input, Button, Table, message, DatePicker, Row, Col, Statistic, Alert } from 'antd'
import { MinusOutlined, SaveOutlined, WarningOutlined } from '@ant-design/icons'
import api from '../services/api'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface Product {
  id: number
  code: string
  name: string
  category: string
  unit: string
  current_stock: number
  min_stock: number
  max_stock: number
}

interface StockOutRecord {
  product_id: number
  product_name: string
  quantity: number
  department: string
  current_stock: number
  unit: string
}

const StockOut: React.FC = () => {
  const [form] = Form.useForm()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [stockOutList, setStockOutList] = useState<StockOutRecord[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [todayStats, setTodayStats] = useState({ count: 0, total: 0 })
  const [stockWarning, setStockWarning] = useState<string>('')

  useEffect(() => {
    fetchProducts()
    fetchTodayStats()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await api.getProducts()
      setProducts(response.products || [])
    } catch (error) {
      message.error('获取产品列表失败')
    }
  }

  const fetchTodayStats = async () => {
    try {
      const response = await api.getDashboardStats()
      setTodayStats({ 
        count: response.stats.todayOut || 0, 
        total: 0 
      })
    } catch (error) {
      console.error('获取统计失败', error)
    }
  }

  const handleProductChange = (productId: number) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
    if (product) {
      form.setFieldsValue({ 
        unit: product.unit,
        current_stock: product.current_stock 
      })
      
      // 检查库存是否充足
      const quantity = form.getFieldValue('quantity') || 0
      checkStockWarning(product, quantity)
    }
  }

  const checkStockWarning = (product: Product, quantity: number) => {
    if (quantity > product.current_stock) {
      setStockWarning(`库存不足！当前库存仅有 ${product.current_stock} ${product.unit}`)
    } else if (product.current_stock - quantity < product.min_stock) {
      setStockWarning(`警告：出库后库存将低于最低库存 ${product.min_stock} ${product.unit}`)
    } else {
      setStockWarning('')
    }
  }

  const handleQuantityChange = (value: number | null) => {
    if (selectedProduct && value) {
      checkStockWarning(selectedProduct, value)
    }
  }

  const handleAddToList = () => {
    form.validateFields(['product_id', 'quantity', 'department'])
      .then(values => {
        const product = products.find(p => p.id === values.product_id)
        if (!product) return

        // 检查库存
        if (values.quantity > product.current_stock) {
          message.error('库存不足！')
          return
        }

        // 检查是否已在列表中
        const existingItem = stockOutList.find(item => item.product_id === values.product_id)
        if (existingItem) {
          message.warning('该产品已在出库清单中！')
          return
        }

        const newRecord: StockOutRecord = {
          product_id: values.product_id,
          product_name: product.name,
          quantity: values.quantity,
          department: values.department,
          current_stock: product.current_stock,
          unit: product.unit
        }

        setStockOutList([...stockOutList, newRecord])
        
        // 更新产品列表中的库存（临时显示）
        const updatedProducts = products.map(p => {
          if (p.id === values.product_id) {
            return { ...p, current_stock: p.current_stock - values.quantity }
          }
          return p
        })
        setProducts(updatedProducts)

        form.resetFields(['product_id', 'quantity'])
        setSelectedProduct(null)
        setStockWarning('')
        message.success('已添加到出库清单')
      })
  }

  const handleRemoveFromList = (index: number) => {
    const item = stockOutList[index]
    
    // 恢复产品库存显示
    const updatedProducts = products.map(p => {
      if (p.id === item.product_id) {
        return { ...p, current_stock: p.current_stock + item.quantity }
      }
      return p
    })
    setProducts(updatedProducts)
    
    const newList = stockOutList.filter((_, i) => i !== index)
    setStockOutList(newList)
  }

  const handleSubmit = async () => {
    if (stockOutList.length === 0) {
      message.warning('请先添加出库产品')
      return
    }

    const values = await form.validateFields(['department', 'reason'])
    setLoading(true)

    try {
      for (const item of stockOutList) {
        await api.stockOut({
          product_id: item.product_id,
          quantity: item.quantity,
          department: values.department,
          reason: values.reason || '生产领用'
        })
      }

      message.success('出库成功')
      setStockOutList([])
      form.resetFields()
      fetchProducts() // 重新获取最新库存
      fetchTodayStats()
    } catch (error: any) {
      message.error(error.message || '出库失败')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '产品名称',
      dataIndex: 'product_name',
      key: 'product_name'
    },
    {
      title: '当前库存',
      key: 'current_stock',
      render: (_: any, record: StockOutRecord) => (
        <span style={{
          color: record.current_stock - record.quantity < 0 ? '#f5222d' : '#000'
        }}>
          {record.current_stock} {record.unit}
        </span>
      )
    },
    {
      title: '出库数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record: StockOutRecord) => (
        <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
          -{qty} {record.unit}
        </span>
      )
    },
    {
      title: '出库后库存',
      key: 'after_stock',
      render: (_: any, record: StockOutRecord) => {
        const afterStock = record.current_stock - record.quantity
        return (
          <span style={{
            color: afterStock < 0 ? '#f5222d' : afterStock < 10 ? '#faad14' : '#52c41a',
            fontWeight: 'bold'
          }}>
            {afterStock} {record.unit}
          </span>
        )
      }
    },
    {
      title: '领用部门',
      dataIndex: 'department',
      key: 'department'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: StockOutRecord, index: number) => (
        <Button
          type="link"
          danger
          onClick={() => handleRemoveFromList(index)}
        >
          移除
        </Button>
      )
    }
  ]

  const totalQuantity = stockOutList.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card>
            <Statistic
              title="今日出库次数"
              value={todayStats.count}
              prefix={<MinusOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="当前批次数量"
              value={totalQuantity}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="待出库品项"
              value={stockOutList.length}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="出库登记">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="product_id"
                label="选择产品"
                rules={[{ required: true, message: '请选择产品' }]}
              >
                <Select
                  placeholder="请选择产品"
                  onChange={handleProductChange}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {products.map(product => (
                    <Option 
                      key={product.id} 
                      value={product.id}
                      disabled={product.current_stock === 0}
                    >
                      {product.name} ({product.code}) - 库存: {product.current_stock} {product.unit}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="quantity"
                label="出库数量"
                rules={[
                  { required: true, message: '请输入数量' },
                  { type: 'number', min: 1, message: '数量必须大于0' }
                ]}
              >
                <InputNumber
                  min={1}
                  max={selectedProduct?.current_stock || 999999}
                  placeholder="数量"
                  style={{ width: '100%' }}
                  onChange={handleQuantityChange}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="unit"
                label="单位"
              >
                <Input disabled placeholder="单位" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="current_stock"
                label="当前库存"
              >
                <Input disabled placeholder="当前库存" />
              </Form.Item>
            </Col>
            <Col span={2}>
              <Form.Item label=" ">
                <Button
                  type="primary"
                  icon={<MinusOutlined />}
                  onClick={handleAddToList}
                  block
                >
                  添加
                </Button>
              </Form.Item>
            </Col>
          </Row>

          {stockWarning && (
            <Alert
              message={stockWarning}
              type="warning"
              icon={<WarningOutlined />}
              showIcon
              className="mb-3"
            />
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="department"
                label="领用部门"
                rules={[{ required: true, message: '请输入领用部门' }]}
              >
                <Input placeholder="请输入领用部门" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="applicant"
                label="申请人"
              >
                <Input placeholder="请输入申请人姓名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="date"
                label="出库日期"
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="出库用途"
          >
            <TextArea
              rows={3}
              placeholder="请输入出库用途或说明（选填）"
            />
          </Form.Item>

          {selectedProduct && (
            <Card size="small" className="mb-4" style={{ backgroundColor: '#f0f2f5' }}>
              <Row>
                <Col span={6}>
                  <Statistic
                    title="当前库存"
                    value={selectedProduct.current_stock}
                    suffix={selectedProduct.unit}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="最低库存"
                    value={selectedProduct.min_stock}
                    suffix={selectedProduct.unit}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="最高库存"
                    value={selectedProduct.max_stock}
                    suffix={selectedProduct.unit}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="出库后库存"
                    value={Math.max(0, selectedProduct.current_stock - (form.getFieldValue('quantity') || 0))}
                    suffix={selectedProduct.unit}
                    valueStyle={{
                      color: selectedProduct.current_stock - (form.getFieldValue('quantity') || 0) < selectedProduct.min_stock 
                        ? '#cf1322' 
                        : '#3f8600'
                    }}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Form>

        {stockOutList.length > 0 && (
          <>
            <h3 className="mb-3">出库清单</h3>
            <Table
              columns={columns}
              dataSource={stockOutList}
              rowKey={(record, index) => `${record.product_id}-${index}`}
              pagination={false}
              className="mb-4"
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>-</Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>{totalQuantity}</Table.Summary.Cell>
                    <Table.Summary.Cell index={3} colSpan={3}>-</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
            <div style={{ textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="large"
                loading={loading}
                onClick={handleSubmit}
              >
                确认出库
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default StockOut
