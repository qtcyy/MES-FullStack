import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Timeline, Typography } from 'antd'
import {
  OrderedListOutlined,
  SyncOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  ScheduleOutlined,
  UserOutlined,
  SettingOutlined,
  FileTextOutlined,
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

// ---------------------------------------------------------------------------
// Quick stats data (hardcoded for now)
// ---------------------------------------------------------------------------
const stats = [
  { title: '今日工单', value: 24, icon: <OrderedListOutlined />, color: '#4a90d9' },
  { title: '进行中工单', value: 8, icon: <SyncOutlined />, color: '#f59f00' },
  { title: '物料种类', value: 156, icon: <AppstoreOutlined />, color: '#51cf66' },
  { title: '质检项', value: 42, icon: <CheckCircleOutlined />, color: '#9775fa' },
]

// ---------------------------------------------------------------------------
// Recent activity timeline data
// ---------------------------------------------------------------------------
const activities = [
  { time: '2025-06-05 09:30', content: '工单 WO-20250605-001 已完成装配', color: 'green' },
  { time: '2025-06-05 09:15', content: '物料 A-0023 库存不足预警', color: 'red' },
  { time: '2025-06-05 08:50', content: '质检批次 QC-0605-03 通过检验', color: 'green' },
  { time: '2025-06-05 08:30', content: '设备 NC-102 完成日常维护', color: 'blue' },
  { time: '2025-06-04 17:20', content: '车间日报已生成', color: 'gray' },
  { time: '2025-06-04 16:45', content: '工艺路线 PR-045 已更新', color: 'orange' },
  { time: '2025-06-04 15:30', content: '新订单 ORD-20250604-022 已录入', color: 'blue' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <Typography>
          <Title level={3} style={{ margin: 0 }}>
            欢迎使用 MES 章鱼师兄智能制造系统
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 14 }}>
            数字化车间管理系统 — 实时监控生产进度，提升制造效率
          </Paragraph>
        </Typography>
      </div>

      {/* Quick stats cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <Col xs={12} sm={12} md={6} key={s.title}>
            <Card
              hoverable
              styles={{
                body: { padding: '20px 24px' },
              }}
            >
              <Statistic
                title={s.title}
                value={s.value}
                prefix={
                  <span style={{ color: s.color, fontSize: 24, marginRight: 8 }}>
                    {s.icon}
                  </span>
                }
                styles={{ value: { color: s.color, fontWeight: 600 } }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick links and Recent activity */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="快捷入口" styles={{ body: { padding: 16 } }}>
            <Row gutter={[12, 12]}>
              {[
                { icon: <ScheduleOutlined />, text: '生产工单', color: '#4a90d9', path: '/order/production' },
                { icon: <FileTextOutlined />, text: '物料管理', color: '#51cf66', path: '/basedata/materile' },
                { icon: <SettingOutlined />, text: '工艺管理', color: '#f59f00', path: '/technology/flow' },
                { icon: <UserOutlined />, text: '系统管理', color: '#9775fa', path: '/system/user' },
              ].map((link) => (
                <Col xs={12} sm={6} key={link.text}>
                  <Card
                    hoverable
                    size="small"
                    styles={{
                      body: {
                        padding: '16px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                      },
                    }}
                    onClick={() => navigate(link.path)}
                  >
                    <span style={{ fontSize: 28, color: link.color }}>{link.icon}</span>
                    <span style={{ fontSize: 13, color: '#555' }}>{link.text}</span>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="最近动态" styles={{ body: { padding: '16px 20px' } }}>
            <Timeline
              items={activities.map((a) => ({
                color: a.color,
                content: (
                  <div>
                    <div style={{ fontSize: 12, color: '#999' }}>{a.time}</div>
                    <div style={{ fontSize: 14 }}>{a.content}</div>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
