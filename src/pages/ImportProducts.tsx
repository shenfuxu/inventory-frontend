import React, { useState } from 'react'
import { Card, Upload, Button, Table, message, Alert, Space, Modal, Progress, Row, Col, Statistic } from 'antd'
import { UploadOutlined, CloudUploadOutlined, CheckCircleOutlined, CloseCircleOutlined, FileExcelOutlined } from '@ant-design/icons'
import { UploadProps } from 'antd'
import * as XLSX from 'xlsx'
import api from '../services/api'

interface ImportProduct {
  code: string
  name: string
  category: string
  unit: string
  min_stock: number
  max_stock: number
  current_stock: number
  status?: 'pending' | 'success' | 'error'
  error?: string
}

const ImportProducts: React.FC = () => {
  const [fileList, setFileList] = useState<any[]>([])
  const [products, setProducts] = useState<ImportProduct[]>([])
  const [importing, setImporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [importResult, setImportResult] = useState({ success: 0, failed: 0 })

  // 下载模板
  const downloadTemplate = () => {
    const template = [
      ['产品编号', '产品名称', '分类', '单位', '最低库存', '最高库存', '当前库存'],
      ['P001', '示例产品1', '电子产品', '个', '10', '100', '50'],
      ['P002', '示例产品2', '办公用品', '盒', '5', '50', '20']
    ]

    const ws = XLSX.utils.aoa_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '产品导入模板')
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // 产品编号
      { wch: 25 }, // 产品名称
      { wch: 15 }, // 分类
      { wch: 10 }, // 单位
      { wch: 12 }, // 最低库存
      { wch: 12 }, // 最高库存
      { wch: 12 }  // 当前库存
    ]
    
    XLSX.writeFile(wb, '产品导入模板.xlsx')
  }

  // 处理文件上传
  const handleUpload: UploadProps['customRequest'] = ({ file, onSuccess }) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // 跳过标题行
        const rows = jsonData.slice(1) as any[][]
        
        const importProducts: ImportProduct[] = rows
          .filter(row => row && row[0]) // 过滤空行
          .map(row => ({
            code: String(row[0] || ''),
            name: String(row[1] || ''),
            category: String(row[2] || ''),
            unit: String(row[3] || ''),
            min_stock: Number(row[4]) || 0,
            max_stock: Number(row[5]) || 100,
            current_stock: Number(row[6]) || 0,
            status: 'pending'
          }))
        
        if (importProducts.length === 0) {
          message.error('Excel文件中没有有效数据')
          return
        }
        
        setProducts(importProducts)
        setShowPreview(true)
        onSuccess?.(file, new XMLHttpRequest())
      } catch (error) {
        message.error('读取Excel文件失败')
        console.error('Excel parsing error:', error)
      }
    }
    
    reader.readAsBinaryString(file as any)
  }

  // 验证数据
  const validateProducts = () => {
    let hasError = false
    const validated = products.map(product => {
      const errors: string[] = []
      
      if (!product.code) errors.push('产品编号不能为空')
      if (!product.name) errors.push('产品名称不能为空')
      if (!product.category) errors.push('分类不能为空')
      if (!product.unit) errors.push('单位不能为空')
      if (product.min_stock < 0) errors.push('最低库存不能为负数')
      if (product.max_stock < product.min_stock) errors.push('最高库存不能小于最低库存')
      if (product.current_stock < 0) errors.push('当前库存不能为负数')
      
      if (errors.length > 0) {
        hasError = true
        return { ...product, status: 'error' as const, error: errors.join(', ') }
      }
      
      return { ...product, status: 'pending' as const }
    })
    
    setProducts(validated)
    return !hasError
  }

  // 执行导入
  const handleImport = async () => {
    if (!validateProducts()) {
      message.error('请修正错误后再导入')
      return
    }
    
    setImporting(true)
    let successCount = 0
    let failedCount = 0
    
    const updatedProducts = [...products]
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      try {
        await api.createProduct({
          code: product.code,
          name: product.name,
          category: product.category,
          unit: product.unit,
          min_stock: product.min_stock,
          max_stock: product.max_stock,
          current_stock: product.current_stock
        })
        
        updatedProducts[i] = { ...product, status: 'success' }
        successCount++
      } catch (error: any) {
        updatedProducts[i] = { 
          ...product, 
          status: 'error', 
          error: error.message || '导入失败' 
        }
        failedCount++
      }
      
      setProducts([...updatedProducts])
    }
    
    setImportResult({ success: successCount, failed: failedCount })
    setImporting(false)
    
    if (failedCount === 0) {
      message.success(`成功导入 ${successCount} 个产品`)
    } else {
      message.warning(`导入完成：成功 ${successCount} 个，失败 ${failedCount} 个`)
    }
  }

  const columns = [
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: any, record: ImportProduct) => {
        if (record.status === 'success') {
          return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
        } else if (record.status === 'error') {
          return <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 20 }} />
        }
        return <Progress type="circle" percent={0} width={20} />
      }
    },
    {
      title: '产品编号',
      dataIndex: 'code',
      key: 'code',
      width: 120
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80
    },
    {
      title: '最低库存',
      dataIndex: 'min_stock',
      key: 'min_stock',
      width: 100
    },
    {
      title: '最高库存',
      dataIndex: 'max_stock',
      key: 'max_stock',
      width: 100
    },
    {
      title: '当前库存',
      dataIndex: 'current_stock',
      key: 'current_stock',
      width: 100
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (error: string) => error && <span style={{ color: '#f5222d' }}>{error}</span>
    }
  ]

  return (
    <div>
      <Card title="批量导入产品">
        <Alert
          message="导入说明"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>支持 Excel 格式文件（.xlsx, .xls）</li>
              <li>请先下载模板，按照模板格式填写数据</li>
              <li>产品编号必须唯一，重复的编号将导入失败</li>
              <li>所有字段都是必填的，请确保数据完整</li>
            </ul>
          }
          type="info"
          showIcon
          className="mb-4"
        />

        <Space size="large" className="mb-4">
          <Button
            icon={<FileExcelOutlined />}
            onClick={downloadTemplate}
          >
            下载模板
          </Button>

          <Upload
            fileList={fileList}
            customRequest={handleUpload}
            accept=".xlsx,.xls"
            maxCount={1}
            onChange={({ fileList }) => setFileList(fileList)}
          >
            <Button icon={<UploadOutlined />}>
              选择文件
            </Button>
          </Upload>
        </Space>

        {products.length > 0 && (
          <Card className="mt-4">
            <Row gutter={16} className="mb-4">
              <Col span={8}>
                <Statistic
                  title="待导入产品"
                  value={products.length}
                  suffix="个"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="导入成功"
                  value={importResult.success}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="导入失败"
                  value={importResult.failed}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>

            <Table
              columns={columns}
              dataSource={products}
              rowKey={(record, index) => `${record.code}-${index}`}
              pagination={false}
              scroll={{ y: 400 }}
            />

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button
                type="primary"
                size="large"
                icon={<CloudUploadOutlined />}
                loading={importing}
                onClick={handleImport}
                disabled={products.length === 0}
              >
                开始导入
              </Button>
            </div>
          </Card>
        )}
      </Card>
    </div>
  )
}

export default ImportProducts
