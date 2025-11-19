import React, { useState, useEffect } from 'react'
import { Card, Tabs, Form, Input, InputNumber, Button, Switch, Table, Modal, Select, message, Row, Col, Tag, Space, Divider } from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, SafetyOutlined, FileTextOutlined } from '@ant-design/icons'
import api from '../services/api'
import Logs from './Logs'

const { TabPane } = Tabs
const { Option } = Select

interface User {
  id: number
  email: string
  name: string
  role: string
  created_at: string
}

interface SystemConfig {
  lowStockAlert: boolean
  highStockAlert: boolean
  autoBackup: boolean
  backupInterval: number
  emailNotification: boolean
  notificationEmail: string
}

const Settings: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [userModalVisible, setUserModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    lowStockAlert: true,
    highStockAlert: true,
    autoBackup: false,
    backupInterval: 24,
    emailNotification: false,
    notificationEmail: ''
  })
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [configForm] = Form.useForm()
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetchUsers()
    fetchCurrentUser()
    loadSystemConfig()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      // 模拟用户数据
      const mockUsers = [
        { id: 1, email: '361206310@qq.com', name: '系统管理员', role: 'admin', created_at: '2024-11-19' },
        { id: 2, email: 'warehouse@example.com', name: '仓库管理员', role: 'warehouse_manager', created_at: '2024-11-19' },
        { id: 3, email: 'user@example.com', name: '普通用户', role: 'user', created_at: '2024-11-19' }
      ]
      setUsers(mockUsers)
    } catch (error) {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const response = await api.getCurrentUser()
      setCurrentUser(response.user)
    } catch (error) {
      console.error('获取当前用户失败', error)
    }
  }

  const loadSystemConfig = () => {
    // 从localStorage加载配置
    const saved = localStorage.getItem('systemConfig')
    if (saved) {
      const config = JSON.parse(saved)
      setSystemConfig(config)
      configForm.setFieldsValue(config)
    } else {
      configForm.setFieldsValue(systemConfig)
    }
  }

  const handleSaveConfig = () => {
    configForm.validateFields().then(values => {
      setSystemConfig(values)
      localStorage.setItem('systemConfig', JSON.stringify(values))
      message.success('系统配置已保存')
    })
  }

  const handleAddUser = () => {
    setEditingUser(null)
    form.resetFields()
    setUserModalVisible(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue(user)
    setUserModalVisible(true)
  }

  const handleDeleteUser = (userId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该用户吗？',
      onOk: () => {
        setUsers(users.filter(u => u.id !== userId))
        message.success('用户已删除')
      }
    })
  }

  const handleUserSubmit = () => {
    form.validateFields().then(values => {
      if (editingUser) {
        // 更新用户
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...values } : u))
        message.success('用户信息已更新')
      } else {
        // 添加新用户
        const newUser: User = {
          id: Date.now(),
          ...values,
          created_at: new Date().toISOString().split('T')[0]
        }
        setUsers([...users, newUser])
        message.success('用户已添加')
      }
      setUserModalVisible(false)
    })
  }

  const handleChangePassword = () => {
    passwordForm.resetFields()
    setPasswordModalVisible(true)
  }

  const handlePasswordSubmit = () => {
    passwordForm.validateFields().then(values => {
      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的密码不一致')
        return
      }
      // 这里应该调用API更改密码
      message.success('密码已更新')
      setPasswordModalVisible(false)
    })
  }

  const getRoleTag = (role: string) => {
    const roleMap: { [key: string]: { color: string, text: string } } = {
      admin: { color: 'red', text: '管理员' },
      warehouse_manager: { color: 'blue', text: '仓库管理员' },
      user: { color: 'green', text: '普通用户' }
    }
    const roleInfo = roleMap[role] || { color: 'default', text: role }
    return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>
  }

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => getRoleTag(role)
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record.id)}
            disabled={record.id === currentUser?.id}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card>
        <Tabs defaultActiveKey="1">
          <TabPane tab={<span><UserOutlined />用户管理</span>} key="1">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddUser}
              style={{ marginBottom: 16 }}
            >
              添加用户
            </Button>
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey="id"
              loading={loading}
            />
          </TabPane>

          <TabPane tab={<span><SafetyOutlined />系统配置</span>} key="2">
            <Form
              form={configForm}
              layout="vertical"
              onFinish={handleSaveConfig}
            >
              <Divider>库存预警设置</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="lowStockAlert"
                    label="低库存预警"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="highStockAlert"
                    label="高库存预警"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>备份设置</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="autoBackup"
                    label="自动备份"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="backupInterval"
                    label="备份间隔（小时）"
                    rules={[{ type: 'number', min: 1, message: '最小值为1' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>通知设置</Divider>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="emailNotification"
                    label="邮件通知"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="notificationEmail"
                    label="通知邮箱"
                    rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
                  >
                    <Input placeholder="notification@example.com" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab={<span><KeyOutlined />账号安全</span>} key="3">
            <Card title="当前账号信息" className="mb-4">
              <p><strong>用户名：</strong>{currentUser?.name || '未登录'}</p>
              <p><strong>邮箱：</strong>{currentUser?.email || '未登录'}</p>
              <p><strong>角色：</strong>{currentUser?.role ? getRoleTag(currentUser.role) : '未知'}</p>
            </Card>
            
            <Card title="修改密码">
              <Button
                type="primary"
                icon={<KeyOutlined />}
                onClick={handleChangePassword}
              >
                修改密码
              </Button>
              <p style={{ marginTop: 10, color: '#999' }}>
                为了账号安全，请定期修改密码
              </p>
            </Card>
          </TabPane>

          <TabPane tab={<span><FileTextOutlined />操作日志</span>} key="4">
            <Logs />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={userModalVisible}
        onOk={handleUserSubmit}
        onCancel={() => setUserModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Option value="admin">管理员</Option>
              <Option value="warehouse_manager">仓库管理员</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onOk={handlePasswordSubmit}
        onCancel={() => setPasswordModalVisible(false)}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[
              { required: true, message: '请确认新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Settings
