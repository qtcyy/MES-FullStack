import { useState } from 'react'
import { Form, Button, Input, Select, Radio, Tag, Popconfirm, message, Space, Table } from 'antd'
import { PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import { ensureArray } from '@/utils/ensureArray'
import SearchForm from '@/components/SearchForm'
import PageTable from '@/components/PageTable'
import ModalForm from '@/components/ModalForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as puApi from '@/api/basedata/process-unit'
import type { SpProcessUnit, SpProcessUnitDTO } from '@/types/process-unit'
import type { SpTeam } from '@/types/team'

const statusMap: Record<string, { text: string; color: string }> = {
  '0': { text: '正常', color: 'green' },
  '1': { text: '已删除', color: 'red' },
  '2': { text: '已禁用', color: 'orange' },
}

const UNIT_TYPES = [
  { label: '人员作业单元', value: '人员作业单元' },
  { label: '设备作业单元', value: '设备作业单元' },
]

export default function ProcessUnitPage() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form] = Form.useForm()

  // Selected unit for right-side team panel
  const [selectedUnit, setSelectedUnit] = useState<SpProcessUnitDTO | null>(null)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [allTeams, setAllTeams] = useState<SpTeam[]>([])
  const [boundTeams, setBoundTeams] = useState<SpTeam[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['processUnits', pagination, filters],
    queryFn: () => puApi.page({ current: pagination.current, size: pagination.pageSize, ...filters }),
  })

  const saveMutation = useMutation({
    mutationFn: (v: Partial<SpProcessUnit>) => puApi.addOrUpdate(v),
    onSuccess: () => {
      message.success('操作成功')
      setModalOpen(false)
      setEditId(null)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['processUnits'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (r: SpProcessUnitDTO) => puApi.deleteById(r.id),
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['processUnits'] })
    },
  })

  const handleSelectUnit = async (record: SpProcessUnitDTO) => {
    setSelectedUnit(record)
    const teams = await puApi.getTeams(record.id)
    setBoundTeams(Array.isArray(teams) ? teams : [])
  }

  const handleOpenTeamModal = async () => {
    const res = await puApi.getAllTeams()
    const records = (res as any)?.records || []
    setAllTeams(records.filter((t: SpTeam) => t.deleted === '0'))
    setTeamModalOpen(true)
  }

  const handleAddTeam = async (teamId: string) => {
    if (!selectedUnit) return
    await puApi.addTeam(selectedUnit.id, teamId)
    message.success('绑定成功')
    const teams = await puApi.getTeams(selectedUnit.id)
    setBoundTeams(Array.isArray(teams) ? teams : [])
    setTeamModalOpen(false)
  }

  const handleRemoveTeam = async (teamId: string) => {
    if (!selectedUnit) return
    await puApi.removeTeam(selectedUnit.id, teamId)
    message.success('解绑成功')
    setBoundTeams((prev) => prev.filter((t) => t.id !== teamId))
  }

  const columns = [
    { title: '加工单元代码', dataIndex: 'code', key: 'code' },
    { title: '加工单元名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => v || '-' },
    { title: '线边库', dataIndex: 'hasLineWarehouse', key: 'hasLineWarehouse',
      render: (v: string) => v === '1' ? <Tag color="blue">有</Tag> : <Tag>无</Tag> },
    { title: '状态', dataIndex: 'deleted', key: 'deleted',
      render: (v: string) => {
        const s = statusMap[v] || { text: v, color: 'default' }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: SpProcessUnitDTO) => (
        <Space>
          <Button type="link" size="small" onClick={() => {
            setEditId(r.id)
            setModalOpen(true)
          }}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left: Unit list */}
        <div style={{ flex: 2 }}>
          <SearchForm
            onSearch={(v) => { setFilters(v); reset() }}
            onReset={() => { setFilters({}); reset() }}
            loading={isLoading}>
            <Form.Item name="code"><Input placeholder="加工单元代码" /></Form.Item>
            <Form.Item name="name"><Input placeholder="加工单元名称" /></Form.Item>
          </SearchForm>
          <PageTable
            rowKey="id"
            columns={columns}
            dataSource={ensureArray(data?.records)}
            loading={isLoading}
            total={data?.total || 0}
            pagination={{ current: pagination.current, pageSize: pagination.pageSize }}
            onChange={onChange}
            onRow={(record: SpProcessUnitDTO) => ({
              onClick: () => handleSelectUnit(record),
              style: {
                cursor: 'pointer',
                background: selectedUnit?.id === record.id ? '#e6f7ff' : undefined,
              },
            })}
            toolbar={
              <PermissionGuard perm="processUnit:add">
                <Button type="primary" icon={<PlusOutlined />}
                  onClick={() => { setEditId(null); setModalOpen(true) }}>
                  新增加工单元
                </Button>
              </PermissionGuard>
            } />
          <ModalForm
            open={modalOpen}
            title={editId ? '编辑加工单元' : '新增加工单元'}
            formInstance={form}
            onCancel={() => {
              setModalOpen(false)
              setEditId(null)
              form.resetFields()
            }}
            loading={saveMutation.isPending}>
            <Form
              form={form}
              layout="vertical"
              onFinish={(v) => saveMutation.mutate({ ...v, id: editId || undefined })}
              initialValues={{
                deleted: '0',
                hasLineWarehouse: '0',
                type: '人员作业单元',
              }}>
              <Form.Item name="code" label="加工单元代码" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="请输入加工单元代码" />
              </Form.Item>
              <Form.Item name="name" label="加工单元名称" rules={[{ required: true, message: '请输入' }]}>
                <Input placeholder="请输入加工单元名称" />
              </Form.Item>
              <Form.Item name="type" label="加工单元类型" rules={[{ required: true }]}>
                <Select options={UNIT_TYPES} />
              </Form.Item>
              <Form.Item name="hasLineWarehouse" label="是否有线边库">
                <Radio.Group>
                  <Radio value="0">否</Radio>
                  <Radio value="1">是</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="descr" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item name="deleted" label="状态" rules={[{ required: true }]}>
                <Radio.Group>
                  <Radio value="0">正常</Radio>
                  <Radio value="1">已删除</Radio>
                  <Radio value="2">已禁用</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </ModalForm>
        </div>

        {/* Right: Team binding panel */}
        <div style={{
          flex: 1,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 16,
          minWidth: 300,
        }}>
          <h3>
            <TeamOutlined style={{ marginRight: 8 }} />
            加工单元班组管理
          </h3>
          {selectedUnit ? (
            <>
              <p>当前单元: <strong>{selectedUnit.name}</strong> ({selectedUnit.code})</p>
              <Button type="primary" size="small" icon={<PlusOutlined />}
                onClick={handleOpenTeamModal} style={{ marginBottom: 12 }}>
                新增班组绑定
              </Button>
              <Table rowKey="id" size="small" dataSource={boundTeams} pagination={false}
                columns={[
                  { title: '班组代码', dataIndex: 'code' },
                  { title: '班组名称', dataIndex: 'name' },
                  {
                    title: '操作', key: 'action',
                    render: (_: any, r: SpTeam) => (
                      <Popconfirm title="确定解绑？" onConfirm={() => handleRemoveTeam(r.id)}>
                        <Button type="link" size="small" danger>解绑</Button>
                      </Popconfirm>
                    ),
                  },
                ]} />
            </>
          ) : (
            <p style={{ color: '#999' }}>请点击左侧加工单元查看班组绑定</p>
          )}

          {/* Team selection modal */}
          {teamModalOpen && (
            <div style={{
              marginTop: 12,
              border: '1px dashed #d9d9d9',
              borderRadius: 4,
              padding: 12,
            }}>
              <h4>选择班组</h4>
              {allTeams.map((t) => (
                <Button key={t.id} size="small" style={{ margin: 4 }}
                  onClick={() => handleAddTeam(t.id)}>
                  {t.name} ({t.code})
                </Button>
              ))}
              <br />
              <Button size="small" style={{ marginTop: 8 }} onClick={() => setTeamModalOpen(false)}>取消</Button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
