import { useEffect, useState } from 'react'
import { Form, Input, Radio, Tree, Divider } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { DataNode } from 'antd/es/tree'
import * as roleApi from '@/api/system/role'
import * as menuApi from '@/api/system/menu'
import type { TreeVO, SysMenu } from '@/types/menu'
import type { SysRole } from '@/types/user'

interface RoleFormProps {
  id?: string | null
  record?: SysRole | null
  onFinish?: (values: any) => void
  formInstance: FormInstance
}

function convertToTreeData(nodes: TreeVO<SysMenu>[]): DataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: node.name,
    children: node.children ? convertToTreeData(node.children) : undefined,
  }))
}

function RoleForm({ id, record, onFinish, formInstance }: RoleFormProps) {
  const [menuTree, setMenuTree] = useState<TreeVO<SysMenu>[]>([])
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [treeLoading, setTreeLoading] = useState(false)

  // Load menu tree on mount
  useEffect(() => {
    setTreeLoading(true)
    menuApi.tree().then((data: any) => {
      const treeData = Array.isArray(data) ? data : (data as any)?.data ?? []
      setMenuTree(treeData)
    }).finally(() => setTreeLoading(false))
  }, [])

  // In edit mode, populate form from record and load checked menu IDs
  useEffect(() => {
    if (id && record) {
      // Use record data directly to avoid calling the HTML-view endpoint
      formInstance.setFieldsValue({
        name: record.name,
        code: record.code,
        descr: record.descr,
        isSystem: record.isSystem || '0',
        deleted: record.deleted,
      })
      // Set checked keys from record if available
      if (record.sysMenuIds) {
        setCheckedKeys(record.sysMenuIds)
      }
    } else if (!id) {
      // New record: reset form and checked keys
      formInstance.resetFields()
      setCheckedKeys([])
    }
  }, [id, record, formInstance])

  // Load role's assigned menu IDs from backend (for edit mode)
  useEffect(() => {
    if (id) {
      roleApi.getRoleMenuTree(id).then((menuIds: any) => {
        const ids = Array.isArray(menuIds) ? menuIds : (menuIds as any)?.data ?? []
        if (ids.length > 0) {
          setCheckedKeys(ids)
        }
      }).catch(() => {
        // Ignore if endpoint not available
      })
    }
  }, [id])

  const handleFinish = (values: any) => {
    onFinish?.({
      ...values,
      sysMenuIds: checkedKeys,
    })
  }

  return (
    <Form
      form={formInstance}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ deleted: '0', isSystem: '0' }}
    >
      <Form.Item
        name="name"
        label="角色名称"
        rules={[{ required: true, message: '请输入角色名称' }]}
      >
        <Input placeholder="请输入角色名称" />
      </Form.Item>

      <Form.Item
        name="code"
        label="角色编码"
        rules={[{ required: true, message: '请输入角色编码' }]}
      >
        <Input placeholder="请输入角色编码" />
      </Form.Item>

      <Form.Item
        name="descr"
        label="描述"
      >
        <Input.TextArea rows={3} placeholder="请输入描述" />
      </Form.Item>

      <Form.Item
        name="isSystem"
        label="系统角色"
      >
        <Radio.Group>
          <Radio value="0">否</Radio>
          <Radio value="1">是</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        name="deleted"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <Radio.Group>
          <Radio value="0">正常</Radio>
          <Radio value="1">已删除</Radio>
          <Radio value="2">已禁用</Radio>
        </Radio.Group>
      </Form.Item>

      <Divider>授权菜单</Divider>

      <Form.Item label="菜单权限">
        {menuTree.length > 0 ? (
          <Tree
            checkable
            defaultExpandAll
            checkedKeys={checkedKeys}
            onCheck={(keys: any) => setCheckedKeys(keys as string[])}
            treeData={convertToTreeData(menuTree)}
            style={{ maxHeight: 400, overflow: 'auto' }}
          />
        ) : (
          <span style={{ color: '#999' }}>{treeLoading ? '加载中...' : '暂无菜单数据'}</span>
        )}
      </Form.Item>
    </Form>
  )
}

export default RoleForm
