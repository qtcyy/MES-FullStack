import { useState } from 'react'
import { Form, Button, Table, Tag, Popconfirm, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import PageContainer from '@/components/PageContainer'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import * as menuApi from '@/api/system/menu'
import MenuForm from './MenuForm'
import { ensureArray } from '@/utils/ensureArray'
import type { TreeVO } from '@/types/menu'

const typeMap: Record<number, { text: string; color: string }> = {
  0: { text: '目录', color: 'blue' },
  1: { text: '菜单', color: 'green' },
  2: { text: '按钮', color: 'orange' },
}

export default function MenuList() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()

  // Fetch menu tree
  const { data: menuTree, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: () => menuApi.tree(),
  })

  // Add / Edit mutation
  const saveMutation = useMutation({
    mutationFn: (values: any) => menuApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => menuApi.deleteById(id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })

  const handleAdd = () => {
    setEditId(null)
    setModalOpen(true)
  }

  const handleEdit = (record: TreeVO<any>) => {
    setEditId(record.id)
    setModalOpen(true)
  }

  const handleDelete = (record: TreeVO<any>) => {
    deleteMutation.mutate(record.id)
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const handleFormFinish = (values: any) => {
    saveMutation.mutate({
      ...values,
      id: editId || undefined,
    })
  }

  const columns: ColumnsType<TreeVO<any>> = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
    },
    {
      title: '路径',
      dataIndex: 'url',
      key: 'url',
    },
    {
      title: '权限标识',
      dataIndex: 'permission',
      key: 'permission',
    },
    {
      title: '排序',
      dataIndex: 'sortNum',
      key: 'sortNum',
      width: 80,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (val: number) => {
        const type = typeMap[val] || { text: String(val), color: 'default' }
        return <Tag color={type.color}>{type.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: TreeVO<any>) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该菜单吗？" onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </span>
      ),
    },
  ]

  return (
    <PageContainer>
      <div style={{ marginBottom: 16 }}>
        <PermissionGuard perm="menu:add">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增
          </Button>
        </PermissionGuard>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={ensureArray(menuTree)}
        loading={isLoading}
        pagination={false}
        childrenColumnName="children"
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑菜单' : '新增菜单'}
        width={820}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <MenuForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
