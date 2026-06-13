import { useState, useEffect } from 'react'
import { Form, Button, Input, Select, InputNumber, DatePicker, message, Table, Space, Modal } from 'antd'
import { SearchOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageContainer from '@/components/PageContainer'
import SearchForm from '@/components/SearchForm'
import PermissionGuard from '@/components/PermissionGuard'
import { usePagination } from '@/hooks/usePagination'
import * as dispatchApi from '@/api/order/dispatch'
import type { DispatchableOrder, DispatchAssignDTO } from '@/types/dispatch'
import type { SpTeam } from '@/types/team'
import type { SysUser } from '@/types/user'
import { DISPATCH_STATUS_MAP } from '@/types/dispatch'

export default function DispatchList() {
  const queryClient = useQueryClient()
  const { pagination, onChange, reset } = usePagination()
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [teams, setTeams] = useState<SpTeam[]>([])
  const [users, setUsers] = useState<SysUser[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>()
  const [formInstance] = Form.useForm()

  // Load teams on mount
  useEffect(() => {
    dispatchApi.getTeams().then(setTeams).catch((err) => message.error('加载班组列表失败: ' + err.message))
  }, [])

  // Load users when team changes
  useEffect(() => {
    if (selectedTeamId) {
      dispatchApi.getTeamUsers(selectedTeamId).then(setUsers).catch((err) => message.error('加载作业员列表失败: ' + err.message))
    } else {
      setUsers([])
    }
  }, [selectedTeamId])

  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-orders', pagination, filters],
    queryFn: () =>
      dispatchApi.page({
        current: pagination.current,
        size: pagination.pageSize,
        ...filters,
      }),
  })

  const assignMutation = useMutation({
    mutationFn: (dto: DispatchAssignDTO) => dispatchApi.assign(dto),
    onSuccess: () => {
      message.success('派工成功')
      setModalOpen(false)
      setSelectedRowKeys([])
      formInstance.resetFields()
      setSelectedTeamId(undefined)
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] })
    },
    onError: (error: Error) => {
      message.error(error.message || '派工失败')
    },
  })

  const handleSearch = (values: Record<string, unknown>) => {
    setFilters(values)
    reset()
  }

  const handleReset = () => {
    setFilters({})
    reset()
  }

  const handleDispatch = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先勾选需要派工的工单')
      return
    }
    setModalOpen(true)
  }

  const handleModalOk = () => {
    formInstance.validateFields().then((values) => {
      assignMutation.mutate({
        orderIds: selectedRowKeys as string[],
        teamId: values.teamId,
        userId: values.userId,
        laborHours: values.laborHours,
        planStartTime: values.planStartTime?.format('YYYY-MM-DD'),
        planEndTime: values.planEndTime?.format('YYYY-MM-DD'),
        remark: values.remark,
      })
    })
  }

  const handleModalCancel = () => {
    setModalOpen(false)
    formInstance.resetFields()
    setSelectedTeamId(undefined)
  }

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId)
    formInstance.setFieldValue('userId', undefined)
  }

  const columns = [
    {
      title: '工单编码',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (val: string) => (
        <span style={{ fontFamily: "'SF Mono', Monaco, 'Cascadia Code', monospace", fontWeight: 600 }}>
          {val}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'orderDescription',
      key: 'orderDescription',
      ellipsis: true,
    },
    {
      title: '数量',
      dataIndex: 'qty',
      key: 'qty',
      width: 80,
    },
    {
      title: '物料',
      dataIndex: 'materiel',
      key: 'materiel',
    },
    {
      title: '物料描述',
      dataIndex: 'materielDesc',
      key: 'materielDesc',
      ellipsis: true,
    },
    {
      title: '派工状态',
      dataIndex: 'statue',
      key: 'statue',
      width: 100,
      render: (statue: number) => {
        const s = DISPATCH_STATUS_MAP[statue] || DISPATCH_STATUS_MAP[0]
        return (
          <Space size={4}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: s.color,
                boxShadow: `0 0 6px ${s.color}`,
              }}
            />
            <span style={{ fontSize: 13 }}>{s.text}</span>
          </Space>
        )
      },
    },
    {
      title: '作业人员',
      dataIndex: 'workerName',
      key: 'workerName',
      width: 100,
      render: (val: string | null) => (
        <span style={{ color: val ? '#1a1a1a' : '#bfbfbf' }}>
          {val || '-'}
        </span>
      ),
    },
  ]

  return (
    <PageContainer>
      <div
        style={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
          minHeight: '100%',
          padding: 16,
        }}
      >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '16px 20px',
          background: '#1a2332',
          borderRadius: 8,
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UserSwitchOutlined style={{ fontSize: 22, color: '#faad14' }} />
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>
            员工作业派工
          </span>
          <span
            style={{
              background: '#faad14',
              color: '#1a2332',
              padding: '2px 10px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            待派工 {data?.total ?? 0}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={isLoading}>
          <Form.Item name="orderCode">
            <Input
              placeholder="输入工单号查询"
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: 280 }}
              allowClear
            />
          </Form.Item>
        </SearchForm>
      </div>

      {/* Order Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: '0 20px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
          }}
        >
          <span style={{ fontSize: 13, color: '#8c8c8c' }}>
            {selectedRowKeys.length > 0
              ? `已选 ${selectedRowKeys.length} 个工单`
              : '勾选工单进行派工操作'}
          </span>
          <PermissionGuard perm="order:dispatch">
            <Button
              type="primary"
              icon={<UserSwitchOutlined />}
              onClick={handleDispatch}
              disabled={selectedRowKeys.length === 0}
              style={{
                background: selectedRowKeys.length > 0 ? '#faad14' : undefined,
                borderColor: selectedRowKeys.length > 0 ? '#faad14' : undefined,
                fontWeight: 600,
              }}
            >
              人员作业派工
            </Button>
          </PermissionGuard>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.records ?? []}
          loading={isLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            getCheckboxProps: (record: DispatchableOrder) => ({
              disabled: record.statue !== 0,
            }),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: data?.total ?? 0,
            onChange: (page, pageSize) => onChange({ current: page, pageSize }),
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="middle"
        />
      </div>

      {/* Dispatch Modal */}
      <Modal
        title={
          <span style={{ fontSize: 16, fontWeight: 600 }}>
            <UserSwitchOutlined style={{ marginRight: 8, color: '#faad14' }} />
            人员作业派工
          </span>
        }
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={assignMutation.isPending}
        okText="确认派工"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        {/* Selected orders summary */}
        <div
          style={{
            background: '#f0f5ff',
            border: '1px solid #d6e4ff',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: '#1d39c4',
          }}
        >
          已选工单：<strong>{selectedRowKeys.length}</strong> 个
        </div>

        <Form
          form={formInstance}
          layout="vertical"
          initialValues={{ laborHours: 8 }}
        >
          <Form.Item
            name="teamId"
            label="生产作业班组"
            rules={[{ required: true, message: '请选择班组' }]}
          >
            <Select
              placeholder="选择班组"
              onChange={handleTeamChange}
              options={teams.map((t) => ({
                value: t.id,
                label: `${t.code} - ${t.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="userId"
            label="作业员"
            rules={[{ required: true, message: '请选择作业员' }]}
          >
            <Select
              placeholder={
                selectedTeamId
                  ? users.length === 0
                    ? '该班组暂无作业员'
                    : '选择作业员'
                  : '请先选择班组'
              }
              disabled={!selectedTeamId || users.length === 0}
              options={users.map((u) => ({
                value: u.id,
                label: u.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="laborHours"
            label="工时（小时）"
            rules={[{ required: true, message: '请输入工时' }]}
          >
            <InputNumber min={0.5} max={24} step={0.5} style={{ width: '100%' }} />
          </Form.Item>

          <Space size={16}>
            <Form.Item name="planStartTime" label="计划开始">
              <DatePicker placeholder="选择日期" />
            </Form.Item>
            <Form.Item name="planEndTime" label="计划结束">
              <DatePicker placeholder="选择日期" />
            </Form.Item>
          </Space>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选备注" />
          </Form.Item>
        </Form>
      </Modal>
      </div>
    </PageContainer>
  )
}
