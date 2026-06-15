import { useEffect, useMemo } from 'react'
import { Form, Input, InputNumber, Radio, TreeSelect } from 'antd'
import type { FormInstance } from 'antd/es/form'
import { useQuery } from '@tanstack/react-query'
import * as deptApi from '@/api/system/department'
import type { SysDepartment } from '@/types/user'

interface DeptFormProps {
  id?: string | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function buildTreeData(items: SysDepartment[], currentId?: string | null): any[] {
  const map = new Map<string, any>()
  const roots: any[] = []

  items.forEach((item) => {
    map.set(item.id, { title: item.name, value: item.id, children: [] })
  })

  items.forEach((item) => {
    const node = map.get(item.id)
    if (!node) return
    // Exclude current item and its children from parent selection
    if (item.id === currentId) return
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function DeptForm({ id, onFinish, formInstance }: DeptFormProps) {
  // Fetch all departments for parent selector
  const { data: deptData } = useQuery({
    queryKey: ['departments-tree'],
    queryFn: () =>
      deptApi.page({
        current: 1,
        size: 9999,
      }),
  })

  // Build TreeSelect data, excluding self and children
  const treeSelectData = useMemo(() => {
    const items = deptData?.records || []
    return buildTreeData(items, id)
  }, [deptData, id])

  // Fetch department data in edit mode
  useEffect(() => {
    if (id) {
      deptApi.getById(id).then((res: any) => {
        formInstance.setFieldsValue(res)
      })
    } else {
      formInstance.resetFields()
    }
  }, [id, formInstance])

  const handleFinish = (values: any) => {
    onFinish?.(values)
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ isDeleted: '0' }}
    >
      <Form.Item
        name="parentId"
        label="上级部门"
      >
        <TreeSelect
          treeData={treeSelectData}
          placeholder="请选择上级部门"
          allowClear
          treeDefaultExpandAll
        />
      </Form.Item>

      <Form.Item
        name="name"
        label="部门名称"
        rules={[{ required: true, message: '请输入部门名称' }]}
      >
        <Input placeholder="请输入部门名称" />
      </Form.Item>

      <Form.Item
        name="sortNum"
        label="排序"
      >
        <InputNumber
          style={{ width: '100%' }}
          placeholder="请输入排序号"
          min={0}
        />
      </Form.Item>

      <Form.Item
        name="isDeleted"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <Radio.Group>
          <Radio value="0">正常</Radio>
          <Radio value="1">已删除</Radio>
        </Radio.Group>
      </Form.Item>
    </Form>
  )
}

export default DeptForm
