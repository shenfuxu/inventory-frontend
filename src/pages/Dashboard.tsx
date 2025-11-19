import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Space } from 'antd'
import { ShoppingCartOutlined, PlusCircleOutlined, MinusCircleOutlined, WarningOutlined } from '@ant-design/icons'
import api from '../services/api'

interface StockMovement {
  id: number
  product_id: number
  type: 'in' | 'out'
  quantity: number
  before_stock: number
  after_stock: number
  product_name?: string
  created_at: string
}

interface Alert {
  id: number
  product_id: number
  type: string
  message: string
  is_read: boolean
  product_name?: string
  created_at: string
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    todayIn: 0,
    todayOut: 0
  })
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 获取统计数据
      const statsResponse = await api.getDashboardStats()
      setStats(statsResponse.stats)

      // 获取最近的库存变动
      const movementsResponse = await api.getRecentMovements(10)
      setRecentMovements(movementsResponse.movements || [])

      // 获取未读预警
      const alertsResponse = await api.getAlerts({ is_read: false, limit: 5 })
      setAlerts(alertsResponse.alerts || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const movementColumns = [
    {
      title: '产品',
      dataIndex: 'product_name',
      key: 'product'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'in' ? 'green' : 'red'}>
          {type === 'in' ? '入库' : '出库'}
        </Tag>
      )
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity'
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>
      
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="产品总数"
              value={stats.totalProducts}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="低库存产品"
              value={stats.lowStockCount}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日入库"
              value={stats.todayIn}
              valueStyle={{ color: '#3f8600' }}
              prefix={<PlusCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日出库"
              value={stats.todayOut}
              valueStyle={{ color: '#cf1322' }}
              prefix={<MinusCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="最近库存变动" className="mb-4">
            <Table
              columns={movementColumns}
              dataSource={recentMovements}
              rowKey="id"
              loading={loading}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="库存预警" className="mb-4">
            {alerts.length === 0 ? (
              <p className="text-gray-500">暂无预警信息</p>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {alerts.map((alert: Alert) => (
                  <Card key={alert.id} size="small">
                    <p className="font-medium">{alert.product_name || '未知产品'}</p>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </Card>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
