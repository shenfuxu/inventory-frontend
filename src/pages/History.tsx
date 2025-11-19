import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, DatePicker, Select, Input, Button, Row, Col, Space, Modal, Descriptions } from 'antd'
import { SearchOutlined, ExportOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons'
import api from '../services/api'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { RangePicker } = DatePicker
const { Option } = Select

interface MovementRecord {
  id: number
  product_id: number
  product_name?: string
  product_code?: string
  type: 'in' | 'out'
  quantity: number
  before_stock: number
  after_stock: number
  operator_name?: string
  supplier?: string
  department?: string
  batch_no?: string
  reason?: string
  created_at: string
}

const History: React.FC = () => {
  const [movements, setMovements] = useState<MovementRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    type: '',
    product_id: '',
    start_date: '',
    end_date: '',
    keyword: ''
  })
  const [products, setProducts] = useState<any[]>([])
  const [selectedRecord, setSelectedRecord] = useState<MovementRecord | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  useEffect(() => {
    fetchProducts()
    fetchMovements()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await api.getProducts()
      setProducts(response.products || [])
    } catch (error) {
      console.error('获取产品列表失败', error)
    }
  }

  const fetchMovements = async () => {
    setLoading(true)
    try {
      const params: any = {
        limit: pagination.pageSize,
        ...filters
      }
      
      // 移除空值参数
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key]
      })

      const response = await api.getStockMovements(params)
      setMovements(response.movements || [])
      setPagination({
        ...pagination,
        total: response.movements?.length || 0
      })
    } catch (error) {
      console.error('获取历史记录失败', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchMovements()
  }

  const handleReset = () => {
    setFilters({
      type: '',
      product_id: '',
      start_date: '',
      end_date: '',
      keyword: ''
    })
    fetchMovements()
  }

  const handleDateChange = (dates: any) => {
    if (dates) {
      setFilters({
        ...filters,
        start_date: dates[0].format('YYYY-MM-DD'),
        end_date: dates[1].format('YYYY-MM-DD')
      })
    } else {
      setFilters({
        ...filters,
        start_date: '',
        end_date: ''
      })
    }
  }

  const handleExport = () => {
    // 导出为CSV
    const headers = ['日期', '产品', '类型', '数量', '操作前库存', '操作后库存', '操作人', '供应商/部门', '批次号', '原因']
    const data = movements.map(m => [
      dayjs(m.created_at).format('YYYY-MM-DD HH:mm'),
      m.product_name || '',
      m.type === 'in' ? '入库' : '出库',
      m.quantity,
      m.before_stock,
      m.after_stock,
      m.operator_name || '',
      m.type === 'in' ? m.supplier : m.department,
      m.batch_no || '',
      m.reason || ''
    ])

    const csvContent = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `库存记录_${dayjs().format('YYYYMMDD')}.csv`
    link.click()
  }

  const handlePrint = () => {
    window.print()
  }

  const showDetail = (record: MovementRecord) => {
    setSelectedRecord(record)
    setDetailVisible(true)
  }

  const columns: ColumnsType<MovementRecord> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '产品',
      key: 'product',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.product_name}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.product_code}</div>
        </div>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      filters: [
        { text: '入库', value: 'in' },
        { text: '出库', value: 'out' }
      ],
      render: (type: string) => (
        <Tag color={type === 'in' ? 'green' : 'red'}>
          {type === 'in' ? '入库' : '出库'}
        </Tag>
      )
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (qty: number, record) => (
        <span style={{ 
          color: record.type === 'in' ? '#52c41a' : '#f5222d',
          fontWeight: 'bold'
        }}>
          {record.type === 'in' ? '+' : '-'}{qty}
        </span>
      )
    },
    {
      title: '库存变化',
      key: 'stock_change',
      width: 150,
      render: (_, record) => (
        <span>
          {record.before_stock} → {record.after_stock}
        </span>
      )
    },
    {
      title: '批次号',
      dataIndex: 'batch_no',
      key: 'batch_no',
      width: 150,
      ellipsis: true
    },
    {
      title: '供应商/部门',
      key: 'partner',
      width: 150,
      render: (_, record) => record.type === 'in' ? record.supplier : record.department,
      ellipsis: true
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 100
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showDetail(record)}
        >
          详情
        </Button>
      )
    }
  ]

  return (
    <div>
      <Card title="历史记录查询">
        <Row gutter={16} className="mb-4">
          <Col span={5}>
            <Select
              placeholder="选择类型"
              style={{ width: '100%' }}
              allowClear
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
            >
              <Option value="">全部类型</Option>
              <Option value="in">入库</Option>
              <Option value="out">出库</Option>
            </Select>
          </Col>
          <Col span={5}>
            <Select
              placeholder="选择产品"
              style={{ width: '100%' }}
              allowClear
              showSearch
              value={filters.product_id}
              onChange={(value) => setFilters({ ...filters, product_id: value })}
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              <Option value="">全部产品</Option>
              {products.map(p => (
                <Option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={7}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              onChange={handleDateChange}
            />
          </Col>
          <Col span={4}>
            <Input
              placeholder="关键词搜索"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            />
          </Col>
          <Col span={3}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>

        <div className="mb-3" style={{ textAlign: 'right' }}>
          <Space>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出Excel
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              打印
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={movements}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
        />
      </Card>

      <Modal
        title="操作详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedRecord && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="操作时间" span={2}>
              {dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="产品名称">
              {selectedRecord.product_name}
            </Descriptions.Item>
            <Descriptions.Item label="产品编号">
              {selectedRecord.product_code}
            </Descriptions.Item>
            <Descriptions.Item label="操作类型">
              <Tag color={selectedRecord.type === 'in' ? 'green' : 'red'}>
                {selectedRecord.type === 'in' ? '入库' : '出库'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="操作数量">
              {selectedRecord.quantity}
            </Descriptions.Item>
            <Descriptions.Item label="操作前库存">
              {selectedRecord.before_stock}
            </Descriptions.Item>
            <Descriptions.Item label="操作后库存">
              {selectedRecord.after_stock}
            </Descriptions.Item>
            {selectedRecord.batch_no && (
              <Descriptions.Item label="批次号" span={2}>
                {selectedRecord.batch_no}
              </Descriptions.Item>
            )}
            {selectedRecord.supplier && (
              <Descriptions.Item label="供应商" span={2}>
                {selectedRecord.supplier}
              </Descriptions.Item>
            )}
            {selectedRecord.department && (
              <Descriptions.Item label="领用部门" span={2}>
                {selectedRecord.department}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="操作人">
              {selectedRecord.operator_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="操作原因" span={2}>
              {selectedRecord.reason || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default History
