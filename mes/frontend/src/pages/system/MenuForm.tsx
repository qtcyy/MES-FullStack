import { useEffect } from 'react'
import { Form, Input, Select, InputNumber, TreeSelect } from 'antd'
import type { FormInstance } from 'antd/es/form'
import { useQuery } from '@tanstack/react-query'
import * as menuApi from '@/api/system/menu'
import type { TreeVO } from '@/types/menu'

interface MenuFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

// Convert tree data to TreeSelect format
function toTreeSelectData(nodes: TreeVO<any>[]): any[] {
  return nodes.map((node) => ({
    title: node.name,
    value: node.id,
    children: node.children ? toTreeSelectData(node.children) : [],
  }))
}

function MenuForm({ id, onFinish, formInstance }: MenuFormProps) {
  // Fetch menu tree for parent selector
  const { data: menuTree } = useQuery({
    queryKey: ['menus-tree'],
    queryFn: () => menuApi.tree(),
  })

  // Fetch menu data in edit mode
  useEffect(() => {
    if (id) {
      menuApi.getById(id).then((res: any) => {
        formInstance.setFieldsValue(res)
      })
    } else {
      formInstance.resetFields()
    }
  }, [id, formInstance])

  const handleFinish = (values: any) => {
    onFinish?.(values)
  }

  const treeSelectData = menuTree ? toTreeSelectData(menuTree) : []

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ type: 1 }}
    >
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: Basic info */}
        <div style={{ flex: '0 0 300px' }}>
          <Form.Item name="parentId" label="上级菜单">
            <TreeSelect
              treeData={treeSelectData}
              placeholder="请选择上级菜单"
              allowClear
              treeDefaultExpandAll
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="菜单名称"
            rules={[{ required: true, message: '请输入菜单名称' }]}
          >
            <Input placeholder="请输入菜单名称" />
          </Form.Item>

          <Form.Item
            name="code"
            label="菜单编码"
            rules={[{ required: true, message: '请输入菜单编码' }]}
          >
            <Input placeholder="请输入菜单编码" />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="请选择类型">
              <Select.Option value={0}>目录</Select.Option>
              <Select.Option value={1}>菜单</Select.Option>
              <Select.Option value={2}>按钮</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="icon" label="图标">
            <Input placeholder="如 setting, user" />
          </Form.Item>
        </div>

        {/* Right: Additional config */}
        <div
          style={{
            flex: 1,
            borderLeft: '1px solid #f0f0f0',
            paddingLeft: 24,
            minWidth: 0,
          }}
        >
          <Form.Item name="url" label="路径">
            <Input placeholder="请输入路径" />
          </Form.Item>

          <Form.Item name="permission" label="权限标识">
            <Input placeholder="请输入权限标识" />
          </Form.Item>

          <Form.Item name="sortNum" label="排序">
            <InputNumber style={{ width: '100%' }} placeholder="请输入排序号" min={0} />
          </Form.Item>

          <Form.Item name="descr" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
        </div>
      </div>
    </Form>
  )
}

export default MenuForm
