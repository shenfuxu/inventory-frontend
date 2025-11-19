import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Form, Input, InputNumber, Select, Modal, Space, message, Popconfirm, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import api from '../services/api'
import ImportProducts from './ImportProducts'

const { TabPane } = Tabs

interface Product {
  id: number
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

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await api.getProducts()
      setProducts(response.products || [])
    } catch (error: any) {
      message.error('获取产品列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, values)
        message.success('更新成功')
      } else {
        await api.createProduct(values)
        message.success('添加成功')
      }
      
      setModalVisible(false)
      form.resetFields()
      setEditingProduct(null)
      fetchProducts()
    } catch (error: any) {
      message.error(error.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    form.setFieldsValue(product)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await api.deleteProduct(id)
      message.success('删除成功')
      fetchProducts()
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const columns = [
    {
      title: '产品编号',
      dataIndex: 'code',
      key: 'code'
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category'
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit'
    },
    {
      title: '当前库存',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (stock: number, record: Product) => {
        const isLow = stock < record.min_stock
        const isHigh = stock > record.max_stock
        return (
          <span style={{ color: isLow ? 'red' : isHigh ? 'orange' : 'green' }}>
            {stock}
          </span>
        )
      }
    },
    {
      title: '最低库存',
      dataIndex: 'min_stock',
      key: 'min_stock'
    },
    {
      title: '最高库存',
      dataIndex: 'max_stock',
      key: 'max_stock'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Product) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Tabs defaultActiveKey="1">
        <TabPane 
          tab={<span><PlusOutlined /> 产品列表</span>} 
          key="1"
        >
          <Card
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingProduct(null)
                  form.resetFields()
                  setModalVisible(true)
                }}
              >
                添加产品
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={products}
              rowKey="id"
              loading={loading}
            />
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><UploadOutlined /> 批量导入</span>} 
          key="2"
        >
          <ImportProducts />
        </TabPane>
      </Tabs>

      <Modal
        title={editingProduct ? '编辑产品' : '添加产品'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingProduct(null)
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="产品编号"
            rules={[{ required: true, message: '请输入产品编号' }]}
          >
            <Input placeholder="请输入产品编号" />
          </Form.Item>
          <Form.Item
            name="name"
            label="产品名称"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请输入分类' }]}
          >
            <Input placeholder="请输入分类" />
          </Form.Item>
          <Form.Item
            name="unit"
            label="单位"
            rules={[{ required: true, message: '请输入单位' }]}
          >
            <Input placeholder="如：个、箱、千克" />
          </Form.Item>
          <Form.Item
            name="min_stock"
            label="最低库存"
            rules={[{ required: true, message: '请输入最低库存' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入最低库存" />
          </Form.Item>
          <Form.Item
            name="max_stock"
            label="最高库存"
            rules={[{ required: true, message: '请输入最高库存' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入最高库存" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                确定
              </Button>
              <Button onClick={() => {
                setModalVisible(false)
                form.resetFields()
                setEditingProduct(null)
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Products
