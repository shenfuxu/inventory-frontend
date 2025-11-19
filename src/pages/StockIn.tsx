import React, { useState, useEffect } from 'react'
import { Card, Form, Select, InputNumber, Input, Button, Table, message, DatePicker, Row, Col, Statistic } from 'antd'
import { PlusOutlined, SaveOutlined } from '@ant-design/icons'
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

interface StockInRecord {
  product_id: number
  product_name: string
  quantity: number
  supplier: string
  batch_no: string
  price?: number
  total?: number
}

const StockIn: React.FC = () => {
  const [form] = Form.useForm()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [stockInList, setStockInList] = useState<StockInRecord[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [todayStats, setTodayStats] = useState({ count: 0, total: 0 })

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
        count: response.stats.todayIn || 0, 
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
      form.setFieldsValue({ unit: product.unit })
    }
  }

  const handleAddToList = () => {
    form.validateFields(['product_id', 'quantity', 'supplier', 'batch_no', 'price'])
      .then(values => {
        const product = products.find(p => p.id === values.product_id)
        if (!product) return

        const newRecord: StockInRecord = {
          product_id: values.product_id,
          product_name: product.name,
          quantity: values.quantity,
          supplier: values.supplier,
          batch_no: values.batch_no,
          price: values.price || 0,
          total: (values.price || 0) * values.quantity
        }

        setStockInList([...stockInList, newRecord])
        form.resetFields(['product_id', 'quantity', 'price'])
        message.success('已添加到入库清单')
      })
  }

  const handleSubmit = async () => {
    if (stockInList.length === 0) {
      message.warning('请先添加入库产品')
      return
    }

    const values = await form.validateFields()
    setLoading(true)

    try {
      for (const item of stockInList) {
        await api.stockIn({
          product_id: item.product_id,
          quantity: item.quantity,
          supplier: item.supplier,
          batch_no: item.batch_no,
          reason: values.reason || '采购入库'
        })
      }

      message.success('入库成功')
      setStockInList([])
      form.resetFields()
      fetchTodayStats()
    } catch (error: any) {
      message.error(error.message || '入库失败')
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
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity'
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `¥${price.toFixed(2)}`
    },
    {
      title: '总价',
      dataIndex: 'total',
      key: 'total',
      render: (total: number) => `¥${total.toFixed(2)}`
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier'
    },
    {
      title: '批次号',
      dataIndex: 'batch_no',
      key: 'batch_no'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: StockInRecord, index: number) => (
        <Button
          type="link"
          danger
          onClick={() => {
            const newList = stockInList.filter((_, i) => i !== index)
            setStockInList(newList)
          }}
        >
          删除
        </Button>
      )
    }
  ]

  const totalAmount = stockInList.reduce((sum, item) => sum + (item.total || 0), 0)
  const totalQuantity = stockInList.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card>
            <Statistic
              title="今日入库次数"
              value={todayStats.count}
              prefix={<PlusOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="当前批次数量"
              value={totalQuantity}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="当前批次金额"
              value={totalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="入库登记">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={8}>
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
                    (option?.children as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {products.map(product => (
                    <Option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="quantity"
                label="入库数量"
                rules={[
                  { required: true, message: '请输入数量' },
                  { type: 'number', min: 1, message: '数量必须大于0' }
                ]}
              >
                <InputNumber
                  min={1}
                  placeholder="数量"
                  style={{ width: '100%' }}
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
                name="price"
                label="单价(元)"
              >
                <InputNumber
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label=" ">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddToList}
                  block
                >
                  添加到清单
                </Button>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="supplier"
                label="供应商"
                rules={[{ required: true, message: '请输入供应商' }]}
              >
                <Input placeholder="请输入供应商名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="batch_no"
                label="批次号"
                rules={[{ required: true, message: '请输入批次号' }]}
              >
                <Input placeholder="如：BATCH20241119001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="date"
                label="入库日期"
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="入库说明"
          >
            <TextArea
              rows={3}
              placeholder="请输入入库原因或说明（选填）"
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
                    title="入库后库存"
                    value={selectedProduct.current_stock + (form.getFieldValue('quantity') || 0)}
                    suffix={selectedProduct.unit}
                    valueStyle={{
                      color: selectedProduct.current_stock + (form.getFieldValue('quantity') || 0) > selectedProduct.max_stock 
                        ? '#cf1322' 
                        : '#3f8600'
                    }}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Form>

        {stockInList.length > 0 && (
          <>
            <h3 className="mb-3">入库清单</h3>
            <Table
              columns={columns}
              dataSource={stockInList}
              rowKey={(record, index) => `${record.product_id}-${index}`}
              pagination={false}
              className="mb-4"
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>{totalQuantity}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>¥{totalAmount.toFixed(2)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={4} colSpan={3}>-</Table.Summary.Cell>
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
                确认入库
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export default StockIn
