import { useState } from 'react'
import { Form, Button, Input, Tag, Popconfirm, message, Space } from 'antd'
import { PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as teamApi from '@/api/system/team'
import TeamForm from './TeamForm'
import TeamUserModal from './TeamUserModal'
import type { SpTeam, SpTeamDTO } from '@/types/team'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
  '2': { text: '已禁用', color: 'orange' },
}

const WEEKDAY_MAP: Record<string, string> = {
  '1': '周一', '2': '周二', '3': '周三', '4': '周四',
  '5': '周五', '6': '周六', '7': '周日',
}

function formatWorkdays(workdays?: string): string {
  if (!workdays) return '-'
  return workdays.split(',').map((d) => WEEKDAY_MAP[d] || d).join(', ')
}

export default function TeamList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<SpTeam | null>(null)
  const [formInstance] = Form.useForm()

  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userModalTeamId, setUserModalTeamId] = useState<string | null>(null)
  const [userModalTeamName, setUserModalTeamName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['teams', pagination, filters],
    queryFn: () =>
      teamApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (values: Partial<SpTeam>) => teamApi.addOrUpdate(values),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      setSelectedRecord(null)
      formInstance.resetFields()
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (record: SpTeamDTO) => teamApi.deleteById(record.id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const handleAdd = () => {
    setEditId(null)
    setSelectedRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (record: SpTeamDTO) => {
    setEditId(record.id)
    setSelectedRecord(record as SpTeam)
    setModalOpen(true)
  }

  const handleUserManage = (record: SpTeamDTO) => {
    setUserModalTeamId(record.id)
    setUserModalTeamName(record.name)
    setUserModalOpen(true)
  }

  const handleDelete = (record: SpTeamDTO) => {
    deleteMutation.mutate(record)
  }

  const handleFormFinish = (values: Record<string, unknown>) => {
    saveMutation.mutate({ ...values, id: editId || undefined } as Partial<SpTeam>)
  }

  const columns = [
    { title: '班组代码', dataIndex: 'code', key: 'code' },
    { title: '班组名称', dataIndex: 'name', key: 'name' },
    {
      title: '生产线', dataIndex: 'lineName', key: 'lineName',
      render: (v: string) => v || '-',
    },
    {
      title: '车间', dataIndex: 'workshopName', key: 'workshopName',
      render: (v: string) => v || '-',
    },
    {
      title: '上班时间', dataIndex: 'startTime', key: 'startTime',
      render: (v: string) => v || '-',
    },
    {
      title: '下班时间', dataIndex: 'endTime', key: 'endTime',
      render: (v: string) => v || '-',
    },
    {
      title: '工作日', dataIndex: 'workdays', key: 'workdays',
      render: (v: string) => formatWorkdays(v),
    },
    {
      title: '员工数', dataIndex: 'userCount', key: 'userCount',
      render: (v: number) => v ?? 0,
    },
    {
      title: '状态', dataIndex: 'deleted', key: 'deleted',
      render: (val: string) => {
        const s = statusMap[val] || { text: val, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: SpTeamDTO) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<TeamOutlined />}
            onClick={() => handleUserManage(record)}
          >
            员工管理
          </Button>
          <Popconfirm title="确定要删除该班组吗？" onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <SearchForm
        onSearch={(v) => { setFilters(v); reset() }}
        onReset={() => { setFilters({}); reset() }}
        loading={isLoading}
      >
        <Form.Item name="name">
          <Input placeholder="班组名称" />
        </Form.Item>
        <Form.Item name="code">
          <Input placeholder="班组代码" />
        </Form.Item>
      </SearchForm>

      <PageTable
        rowKey="id"
        columns={columns}
        dataSource={ensureArray(data?.records)}
        loading={isLoading}
        total={data?.total || 0}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
        }}
        onChange={onChange}
        toolbar={
          <PermissionGuard perm="team:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增班组
            </Button>
          </PermissionGuard>
        }
      />

      <ModalForm
        open={modalOpen}
        title={editId ? '编辑班组' : '新增班组'}
        width={820}
        formInstance={formInstance}
        onCancel={() => {
          setModalOpen(false)
          setEditId(null)
          setSelectedRecord(null)
        }}
        loading={saveMutation.isPending}
      >
        <TeamForm
          id={editId}
          record={selectedRecord}
          formInstance={formInstance}
          onFinish={handleFormFinish}
        />
      </ModalForm>

      <TeamUserModal
        open={userModalOpen}
        teamId={userModalTeamId}
        teamName={userModalTeamName}
        onClose={() => {
          setUserModalOpen(false)
          queryClient.invalidateQueries({ queryKey: ['teams'] })
        }}
      />
    </PageContainer>
  )
}
