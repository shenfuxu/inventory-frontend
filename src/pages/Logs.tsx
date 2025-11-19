import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, DatePicker, Select, Button, Row, Col, Statistic, Tabs, Space } from 'antd'
import { ReloadOutlined, FileExcelOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '../services/api'
import dayjs from 'dayjs'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const { RangePicker } = DatePicker
const { Option } = Select
const { TabPane } = Tabs

interface OperationLog {
  id: number
  user_id: number
  user_email: string
  user_name?: string
  action: string
  module: string
  details: string
  ip_address: string
  created_at: string
}

interface LogStats {
  byModule: { module: string; count: number }[]
  byAction: { action: string; count: number }[]
  byUser: { user_email: string; count: number }[]
  byDate: { date: string; count: number }[]
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<OperationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [selectedModule, setSelectedModule] = useState<string>()
  const [stats, setStats] = useState<LogStats | null>(null)

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [page, pageSize, dateRange, selectedModule])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params: any = { page, pageSize }
      if (selectedModule) params.module = selectedModule
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      const response = await api.request('/logs', 'GET', params)
      setLogs(response.logs || [])
      setTotal(response.total || 0)
    } catch (error) {
      console.error('获取日志失败', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.request('/logs/stats', 'GET', { days: 7 })
      setStats(response.stats)
    } catch (error) {
      console.error('获取统计失败', error)
    }
  }

  const handleExport = () => {
    const csvContent = [
      ['时间', '用户', '模块', '操作', '详情', 'IP地址'],
      ...logs.map(log => [
        dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss'),
        log.user_email,
        log.module,
        log.action,
        log.details || '',
        log.ip_address || ''
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `操作日志_${dayjs().format('YYYYMMDD')}.csv`
    link.click()
  }

  const getActionTag = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'CREATE': 'success',
      'UPDATE': 'processing',
      'DELETE': 'error',
      'LOGIN': 'default',
      'LOGOUT': 'default',
      'STOCK_IN': 'success',
      'STOCK_OUT': 'warning'
    }
    return <Tag color={actionMap[action] || 'default'}>{action}</Tag>
  }

  const getModuleTag = (module: string) => {
    const moduleMap: { [key: string]: string } = {
      '用户认证': 'blue',
      '产品管理': 'green',
      '库存操作': 'orange',
      '系统管理': 'red',
      '报表查询': 'purple'
    }
    return <Tag color={moduleMap[module] || 'default'}>{module}</Tag>
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '用户',
      key: 'user',
      width: 150,
      render: (_: any, record: OperationLog) => (
        <div>
          <div>{record.user_name || '未知用户'}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.user_email}</div>
        </div>
      )
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => getModuleTag(module)
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => getActionTag(action)
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120
    }
  ]

  return (
    <div>
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="选择模块"
              allowClear
              value={selectedModule}
              onChange={setSelectedModule}
              style={{ width: '100%' }}
            >
              <Option value="用户认证">用户认证</Option>
              <Option value="产品管理">产品管理</Option>
              <Option value="库存操作">库存操作</Option>
              <Option value="系统管理">系统管理</Option>
              <Option value="报表查询">报表查询</Option>
            </Select>
          </Col>
          <Col span={10}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
                刷新
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={handleExport}>
                导出
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs defaultActiveKey="1">
        <TabPane tab="操作日志" key="1">
          <Card>
            <Table
              columns={columns}
              dataSource={logs}
              rowKey="id"
              loading={loading}
              pagination={{
                current: page,
                pageSize,
                total,
                onChange: (p, ps) => {
                  setPage(p)
                  setPageSize(ps!)
                },
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="统计分析" key="2">
          {stats && (
            <>
              <Row gutter={16} className="mb-4">
                <Col span={12}>
                  <Card title="按模块统计">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.byModule}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="module" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1890ff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="操作趋势（7天）">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.byDate}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#52c41a" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Card title="TOP 10 操作类型">
                    <Table
                      dataSource={stats.byAction}
                      columns={[
                        { title: '操作', dataIndex: 'action', key: 'action' },
                        { title: '次数', dataIndex: 'count', key: 'count' }
                      ]}
                      rowKey="action"
                      size="small"
                      pagination={false}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="TOP 10 活跃用户">
                    <Table
                      dataSource={stats.byUser}
                      columns={[
                        { title: '用户', dataIndex: 'user_email', key: 'user_email' },
                        { title: '操作次数', dataIndex: 'count', key: 'count' }
                      ]}
                      rowKey="user_email"
                      size="small"
                      pagination={false}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </TabPane>
      </Tabs>
    </div>
  )
}

export default Logs
