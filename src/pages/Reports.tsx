import React, { useState, useEffect } from 'react'
import { Card, Row, Col, DatePicker, Select, Button, Table, Statistic, Progress, Space, Tabs } from 'antd'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { FileExcelOutlined, FilePdfOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '../services/api'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { TabPane } = Tabs

interface StatsData {
  totalProducts: number
  totalValue: number
  lowStockCount: number
  highStockCount: number
  todayIn: number
  todayOut: number
  monthIn: number
  monthOut: number
}

interface ChartData {
  name: string
  value: number
  [key: string]: any
}

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ])
  const [stats, setStats] = useState<StatsData>({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    highStockCount: 0,
    todayIn: 0,
    todayOut: 0,
    monthIn: 0,
    monthOut: 0
  })
  const [trendData, setTrendData] = useState<ChartData[]>([])
  const [categoryData, setCategoryData] = useState<ChartData[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // 获取统计数据
      const statsRes = await api.getDashboardStats()
      setStats({
        ...stats,
        totalProducts: statsRes.stats.totalProducts,
        lowStockCount: statsRes.stats.lowStockCount,
        todayIn: statsRes.stats.todayIn,
        todayOut: statsRes.stats.todayOut,
        monthIn: 0,
        monthOut: 0
      })

      // 获取趋势数据（模拟）
      const trend = generateTrendData()
      setTrendData(trend)

      // 获取分类数据
      const categories = await fetchCategoryData()
      setCategoryData(categories)

      // 获取TOP产品
      const products = await fetchTopProducts()
      setTopProducts(products)

      // 获取最近变动
      const movementsRes = await api.getRecentMovements(20)
      setMovements(movementsRes.movements || [])
    } catch (error) {
      console.error('获取报表数据失败', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTrendData = (): ChartData[] => {
    const data = []
    for (let i = 29; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day')
      data.push({
        date: date.format('MM/DD'),
        入库: Math.floor(Math.random() * 100) + 50,
        出库: Math.floor(Math.random() * 80) + 30
      })
    }
    return data
  }

  const fetchCategoryData = async (): Promise<ChartData[]> => {
    try {
      const response = await api.getProducts()
      const products = response.products || []
      const categoryMap: { [key: string]: number } = {}
      
      products.forEach((p: any) => {
        if (!categoryMap[p.category]) {
          categoryMap[p.category] = 0
        }
        categoryMap[p.category] += p.current_stock || 0
      })

      return Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value
      }))
    } catch (error) {
      return []
    }
  }

  const fetchTopProducts = async () => {
    try {
      const response = await api.getProducts()
      const products = response.products || []
      return products
        .sort((a: any, b: any) => b.current_stock - a.current_stock)
        .slice(0, 10)
    } catch (error) {
      return []
    }
  }

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setDateRange(dates)
      fetchReportData()
    }
  }

  const handleExportExcel = () => {
    // 生成Excel数据
    const headers = ['产品名称', '产品编号', '分类', '当前库存', '最低库存', '最高库存', '单位']
    const data = topProducts.map(p => [
      p.name,
      p.code,
      p.category,
      p.current_stock,
      p.min_stock,
      p.max_stock,
      p.unit
    ])

    const csvContent = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `库存报表_${dayjs().format('YYYYMMDD')}.csv`
    link.click()
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  const stockColumns = [
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      width: 150
    },
    {
      title: '产品编号',
      dataIndex: 'code',
      key: 'code',
      width: 100
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100
    },
    {
      title: '当前库存',
      dataIndex: 'current_stock',
      key: 'current_stock',
      width: 100,
      sorter: (a: any, b: any) => a.current_stock - b.current_stock
    },
    {
      title: '库存状态',
      key: 'status',
      width: 120,
      render: (_: any, record: any) => {
        const percentage = (record.current_stock / record.max_stock) * 100
        let status = 'normal'
        if (record.current_stock < record.min_stock) status = 'exception'
        else if (record.current_stock > record.max_stock) status = 'success'
        
        return (
          <Progress 
            percent={Math.min(percentage, 100)} 
            size="small" 
            status={status}
            strokeColor={status === 'exception' ? '#ff4d4f' : undefined}
          />
        )
      }
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80
    }
  ]

  const movementColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('MM/DD HH:mm')
    },
    {
      title: '产品',
      dataIndex: 'product_name',
      key: 'product_name'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <span style={{ color: type === 'in' ? '#52c41a' : '#f5222d' }}>
          {type === 'in' ? '入库' : '出库'}
        </span>
      )
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity'
    }
  ]

  return (
    <div>
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="选择报表类型"
              style={{ width: '100%' }}
              defaultValue="all"
            >
              <Option value="all">全部报表</Option>
              <Option value="stock">库存报表</Option>
              <Option value="movement">进出库报表</Option>
              <Option value="alert">预警报表</Option>
            </Select>
          </Col>
          <Col span={8}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchReportData}>
                刷新
              </Button>
              <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
                导出Excel
              </Button>
              <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                打印
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic
              title="产品总数"
              value={stats.totalProducts}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="低库存产品"
              value={stats.lowStockCount}
              valueStyle={{ color: '#cf1322' }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日入库"
              value={stats.todayIn}
              valueStyle={{ color: '#3f8600' }}
              prefix="+"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日出库"
              value={stats.todayOut}
              valueStyle={{ color: '#cf1322' }}
              prefix="-"
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <TabPane tab="库存趋势" key="1">
          <Card>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="入库" stroke="#52c41a" />
                <Line type="monotone" dataKey="出库" stroke="#f5222d" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabPane>

        <TabPane tab="分类统计" key="2">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="库存分类占比">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="分类库存数量">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="库存明细" key="3">
          <Card>
            <Table
              columns={stockColumns}
              dataSource={topProducts}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="最近变动" key="4">
          <Card>
            <Table
              columns={movementColumns}
              dataSource={movements}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default Reports
