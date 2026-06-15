import { useState, useMemo } from 'react'
import { Form, Button, Input, Table, Popconfirm, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import * as deptApi from '@/api/system/department'
import DeptForm from './DeptForm'
import type { SysDepartment } from '@/types/user'

// Build tree from flat list
function buildTree(items: SysDepartment[]): SysDepartment[] {
  const map = new Map<string, SysDepartment & { children: SysDepartment[] }>()
  const roots: (SysDepartment & { children: SysDepartment[] })[] = []

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] })
  })

  items.forEach((item) => {
    const node = map.get(item.id)
    if (!node) return
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

export default function DeptList() {
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInstance] = Form.useForm()

  // Fetch all departments
  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () =>
      deptApi.page({
        current: 1,
        size: 9999,
      }),
  })

  // Build tree from flat data and apply client-side search filter
  const treeData = useMemo(() => {
    const allItems = data?.records || []
    if (!searchText) {
      return buildTree(allItems)
    }
    // Filter by name, then build tree from filtered items
    const filtered = allItems.filter((item) =>
      item.name.toLowerCase().includes(searchText.toLowerCase()),
    )
    return buildTree(filtered)
  }, [data, searchText])

  // Add / Edit mutation
  const saveMutation = useMutation({
    mutationFn: (values: SysDepartment) => deptApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
  })

  // Delete mutation (soft delete via addOrUpdate)
  const deleteMutation = useMutation({
    mutationFn: (record: SysDepartment) =>
      deptApi.addOrUpdate({ ...record, isDeleted: '1' }),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['departments'] })
    },
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setSearchText((values.name as string) || '')
  }

  const handleReset = () => {
    setSearchText('')
  }

  const handleAdd = () => {
    setEditId(null)
    setModalOpen(true)
  }

  const handleEdit = (record: SysDepartment) => {
    setEditId(record.id)
    setModalOpen(true)
  }

  const handleDelete = (record: SysDepartment) => {
    deleteMutation.mutate(record)
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    setEditId(null)
  }

  const handleFormFinish = (values: Record<string, unknown>) => {
    saveMutation.mutate({
      ...values,
      id: editId || undefined,
    } as SysDepartment)
  }

  const columns: ColumnsType<SysDepartment> = [
    {
      title: '部门名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '排序',
      dataIndex: 'sortNum',
      key: 'sortNum',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: SysDepartment) => (
        <span>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除该部门吗？" onConfirm={() => handleDelete(record)}>
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
      <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
        <Form.Item name="name">
          <Input placeholder="部门名称" />
        </Form.Item>
      </SearchForm>

      <div style={{ marginBottom: 16 }}>
        <PermissionGuard perm="dept:add">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增
          </Button>
        </PermissionGuard>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={treeData}
        loading={isLoading}
        pagination={false}
        childrenColumnName="children"
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑部门' : '新增部门'}
        formInstance={formInstance}
        onCancel={handleModalCancel}
        loading={saveMutation.isPending}
      >
        <DeptForm
          id={editId}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>
    </PageContainer>
  )
}
