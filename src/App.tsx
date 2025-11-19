import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout, Menu, Avatar, Badge, Dropdown, message } from 'antd'
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined
} from '@ant-design/icons'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import History from './pages/History'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import api, { getToken } from './services/api'

const { Header, Sider, Content } = Layout

function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const token = getToken()
      if (token) {
        const response = await api.getCurrentUser()
        setUser(response.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    api.logout()
    setUser(null)
    message.success('退出登录成功')
    window.location.reload()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>
  }

  if (!user) {
    return <Login />
  }

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘'
    },
    {
      key: '/products',
      icon: <ShoppingCartOutlined />,
      label: '产品管理'
    },
    {
      key: '/stock-in',
      icon: <PlusCircleOutlined />,
      label: '入库管理'
    },
    {
      key: '/stock-out',
      icon: <MinusCircleOutlined />,
      label: '出库管理'
    },
    {
      key: '/history',
      icon: <FileTextOutlined />,
      label: '历史记录'
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '报表统计'
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置'
    }
  ]

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '个人资料'
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout
      }
    ]
  }

  return (
    <Router>
      <Layout className="min-h-screen">
        <Sider trigger={null} collapsible collapsed={collapsed}>
          <div className="h-16 flex items-center justify-center text-white text-lg font-bold">
            {collapsed ? 'IMS' : '库存管理系统'}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['/']}
            items={menuItems}
            onClick={({ key }) => {
              window.location.pathname = key
            }}
          />
        </Sider>
        <Layout>
          <Header className="bg-white px-4 flex items-center justify-between" style={{ padding: 0 }}>
            <div
              className="text-lg cursor-pointer hover:text-blue-500"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '☰' : '☰'}
            </div>
            <div className="flex items-center gap-4">
              <Badge count={alerts.length}>
                <BellOutlined className="text-lg cursor-pointer hover:text-blue-500" />
              </Badge>
              <Dropdown menu={userMenu} placement="bottomRight">
                <div className="flex items-center gap-2 cursor-pointer">
                  <Avatar icon={<UserOutlined />} />
                  <span>{user?.email}</span>
                </div>
              </Dropdown>
            </div>
          </Header>
          <Content className="m-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/stock-in" element={<StockIn />} />
              <Route path="/stock-out" element={<StockOut />} />
              <Route path="/history" element={<History />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  )
}

export default App
