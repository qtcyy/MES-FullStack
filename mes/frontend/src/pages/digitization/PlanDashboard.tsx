import ReactECharts from 'echarts-for-react'
import { Row, Col, Card } from 'antd'

// ---------------------------------------------------------------------------
// Dark theme palette
// ---------------------------------------------------------------------------
const BG_COLOR = '#0f1a2e'
const TEXT_COLOR = '#a0c4e8'
const AXIS_COLOR = '#2d4a6e'
const BLUE = '#4a90d9'
const CYAN = '#3bc9db'
const GREEN = '#51cf66'
const ORANGE = '#f59f00'
const RED = '#f03e3e'
const PURPLE = '#9775fa'

// Shared axis style helper — avoids complex discriminated union narrowing issues
function ax(): Record<string, unknown> {
  return {
    axisLine: { lineStyle: { color: AXIS_COLOR } },
    axisLabel: { color: TEXT_COLOR },
    splitLine: { lineStyle: { color: AXIS_COLOR, opacity: 0.3 } },
  }
}

// ---------------------------------------------------------------------------
// Chart 1: Annual plan & order trend (line + bar)
// ---------------------------------------------------------------------------
const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
const planData = [120, 135, 150, 165, 180, 200, 190, 210, 195, 220, 240, 260]
const orderData = [110, 128, 142, 158, 172, 190, 185, 200, 188, 210, 230, 250]
const completionRate = [91.7, 94.8, 94.7, 95.8, 95.6, 95.0, 97.4, 95.2, 96.4, 95.5, 95.8, 96.2]

const lineOption = {
  backgroundColor: BG_COLOR,
  tooltip: { trigger: 'axis' as const },
  legend: {
    data: ['计划量', '订单量', '完成率(%)'],
    textStyle: { color: TEXT_COLOR },
    top: 0,
  },
  grid: { left: 60, right: 60, bottom: 40, top: 50 },
  xAxis: {
    type: 'category',
    data: months,
    ...ax(),
  },
  yAxis: [
    {
      type: 'value',
      name: '数量',
      nameTextStyle: { color: TEXT_COLOR },
      ...ax(),
    },
    {
      type: 'value',
      name: '%',
      max: 100,
      nameTextStyle: { color: TEXT_COLOR },
      ...ax(),
    },
  ],
  series: [
    {
      name: '计划量',
      type: 'line',
      data: planData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: BLUE, width: 2 },
      itemStyle: { color: BLUE },
    },
    {
      name: '订单量',
      type: 'line',
      data: orderData,
      smooth: true,
      symbol: 'diamond',
      symbolSize: 6,
      lineStyle: { color: CYAN, width: 2 },
      itemStyle: { color: CYAN },
    },
    {
      name: '完成率(%)',
      type: 'bar',
      yAxisIndex: 1,
      data: completionRate,
      barWidth: 8,
      itemStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: GREEN },
            { offset: 1, color: '#2b8a3e' },
          ],
        },
        borderRadius: [4, 4, 0, 0],
      },
    },
  ],
}

// ---------------------------------------------------------------------------
// Chart 2: Factory output (bar)
// ---------------------------------------------------------------------------
const factories = ['一厂', '二厂', '三厂', '四厂', '五厂', '六厂', '七厂']
const factoryData = [420, 380, 510, 460, 390, 530, 470]

const factoryBarOption = {
  backgroundColor: BG_COLOR,
  tooltip: { trigger: 'axis' as const },
  grid: { left: 50, right: 20, bottom: 30, top: 20 },
  xAxis: {
    type: 'category',
    data: factories,
    ...ax(),
  },
  yAxis: {
    type: 'value',
    ...ax(),
  },
  series: [
    {
      type: 'bar',
      data: factoryData.map((v) => ({
        value: v,
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: BLUE },
              { offset: 1, color: '#1c4e80' },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
      })),
      barWidth: 24,
    },
  ],
}

// ---------------------------------------------------------------------------
// Chart 3: Workshop output (bar)
// ---------------------------------------------------------------------------
const workshops = ['冲压', '焊接', '涂装', '总装', '机加', '热处理', '电镀', '质检']
const workshopData = [180, 220, 160, 310, 195, 140, 125, 200]

const workshopBarOption = {
  backgroundColor: BG_COLOR,
  tooltip: { trigger: 'axis' as const },
  grid: { left: 50, right: 20, bottom: 30, top: 20 },
  xAxis: {
    type: 'category',
    data: workshops,
    ...ax(),
  },
  yAxis: {
    type: 'value',
    ...ax(),
  },
  series: [
    {
      type: 'bar',
      data: workshopData.map((v, i) => ({
        value: v,
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: [PURPLE, CYAN, GREEN, ORANGE, BLUE, RED, '#845ef7', '#20c997'][i] },
              { offset: 1, color: '#1c2a4a' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      })),
      barWidth: 20,
    },
  ],
}

// ---------------------------------------------------------------------------
// Chart 4: Yield / defect rate (area line)
// ---------------------------------------------------------------------------
const yieldRate = [97.2, 97.5, 97.8, 98.1, 97.9, 98.3, 98.5, 98.2, 98.4, 98.6, 98.7, 98.9]
const defectRate = [2.8, 2.5, 2.2, 1.9, 2.1, 1.7, 1.5, 1.8, 1.6, 1.4, 1.3, 1.1]

const qualityOption = {
  backgroundColor: BG_COLOR,
  tooltip: { trigger: 'axis' as const },
  legend: {
    data: ['良品率(%)', '不良率(%)'],
    textStyle: { color: TEXT_COLOR },
    top: 0,
  },
  grid: { left: 55, right: 30, bottom: 30, top: 40 },
  xAxis: {
    type: 'category',
    data: months,
    ...ax(),
  },
  yAxis: {
    type: 'value',
    max: 100,
    ...ax(),
  },
  series: [
    {
      name: '良品率(%)',
      type: 'line',
      data: yieldRate,
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(81, 207, 102, 0.4)' },
            { offset: 1, color: 'rgba(81, 207, 102, 0.02)' },
          ],
        },
      },
      lineStyle: { color: GREEN, width: 2 },
      itemStyle: { color: GREEN },
    },
    {
      name: '不良率(%)',
      type: 'line',
      data: defectRate,
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(240, 62, 62, 0.4)' },
            { offset: 1, color: 'rgba(240, 62, 62, 0.02)' },
          ],
        },
      },
      lineStyle: { color: RED, width: 2 },
      itemStyle: { color: RED },
    },
  ],
}

// ---------------------------------------------------------------------------
// Chart 5: Regional comparison (3 donut pies side by side)
// ---------------------------------------------------------------------------
const makeDonut = (title: string, data: { name: string; value: number }[], color: string[]) => ({
  backgroundColor: BG_COLOR,
  tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
  title: {
    text: title,
    left: 'center',
    top: 0,
    textStyle: { color: TEXT_COLOR, fontSize: 14 },
  },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: false,
      label: {
        show: true,
        color: TEXT_COLOR,
        formatter: '{b}\n{d}%',
        fontSize: 11,
      },
      labelLine: { lineStyle: { color: AXIS_COLOR } },
      data,
      itemStyle: {
        borderRadius: 4,
        borderColor: BG_COLOR,
        borderWidth: 2,
      },
      color,
    },
  ],
})

const regionNorth = [
  { name: '北京', value: 285 },
  { name: '天津', value: 210 },
  { name: '河北', value: 175 },
]
const regionEast = [
  { name: '上海', value: 320 },
  { name: '江苏', value: 290 },
  { name: '浙江', value: 260 },
]
const regionSouth = [
  { name: '广东', value: 350 },
  { name: '福建', value: 195 },
  { name: '广西', value: 120 },
]

const northDonut = makeDonut('华北地区', regionNorth, ['#4a90d9', '#3bc9db', '#51cf66'])
const eastDonut = makeDonut('华东地区', regionEast, ['#f59f00', '#f76707', '#f03e3e'])
const southDonut = makeDonut('华南地区', regionSouth, ['#9775fa', '#845ef7', '#20c997'])

// ---------------------------------------------------------------------------
// Chart 6: Gauge dashboard (4 gauges)
// ---------------------------------------------------------------------------
const gaugeOption = {
  backgroundColor: BG_COLOR,
  series: [
    {
      type: 'gauge',
      center: ['15%', '55%'],
      radius: '75%',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      progress: { show: true, width: 10 },
      axisLine: {
        lineStyle: { width: 10, color: [[0.6, BLUE], [0.85, ORANGE], [1, RED]] },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        fontSize: 16,
        color: BLUE,
        offsetCenter: [0, '60%'],
      },
      title: {
        offsetCenter: [0, '80%'],
        fontSize: 12,
        color: TEXT_COLOR,
      },
      data: [{ value: 78, name: '转速(RPM)' }],
    },
    {
      type: 'gauge',
      center: ['38%', '55%'],
      radius: '75%',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 200,
      progress: { show: true, width: 10 },
      axisLine: {
        lineStyle: { width: 10, color: [[0.6, CYAN], [0.85, ORANGE], [1, RED]] },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        fontSize: 16,
        color: CYAN,
        offsetCenter: [0, '60%'],
      },
      title: {
        offsetCenter: [0, '80%'],
        fontSize: 12,
        color: TEXT_COLOR,
      },
      data: [{ value: 145, name: '速度(km/h)' }],
    },
    {
      type: 'gauge',
      center: ['62%', '55%'],
      radius: '75%',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      progress: { show: true, width: 10 },
      axisLine: {
        lineStyle: { width: 10, color: [[0.5, GREEN], [0.8, ORANGE], [1, RED]] },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        fontSize: 16,
        color: GREEN,
        offsetCenter: [0, '60%'],
      },
      title: {
        offsetCenter: [0, '80%'],
        fontSize: 12,
        color: TEXT_COLOR,
      },
      data: [{ value: 62, name: '燃料(L)' }],
    },
    {
      type: 'gauge',
      center: ['85%', '55%'],
      radius: '75%',
      startAngle: 210,
      endAngle: -30,
      min: 0,
      max: 100,
      progress: { show: true, width: 10 },
      axisLine: {
        lineStyle: { width: 10, color: [[0.4, PURPLE], [0.7, ORANGE], [1, RED]] },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: true,
        fontSize: 16,
        color: PURPLE,
        offsetCenter: [0, '60%'],
      },
      title: {
        offsetCenter: [0, '80%'],
        fontSize: 12,
        color: TEXT_COLOR,
      },
      data: [{ value: 83, name: '水位(%)' }],
    },
  ],
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------
const cardStyle: React.CSSProperties = {
  background: '#152238',
  border: '1px solid #1e3a5f',
  borderRadius: 8,
}

const cardHeadStyle: React.CSSProperties = {
  color: CYAN,
  borderBottom: '1px solid #1e3a5f',
  fontSize: 15,
  fontWeight: 600,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PlanDashboard() {
  return (
    <div style={{ background: BG_COLOR, minHeight: '100vh', padding: 16 }}>
      <Row gutter={[16, 16]}>
        {/* Chart 1: 年度计划与工单趋势 */}
        <Col xs={24} lg={12}>
          <Card
            title="年度计划与工单趋势"
            bordered={false}
            styles={{ body: { padding: '12px 8px' }, header: cardHeadStyle }}
            style={cardStyle}
          >
            <ReactECharts option={lineOption} style={{ height: 380 }} />
          </Card>
        </Col>

        {/* Chart 2: 各工厂产量 */}
        <Col xs={24} sm={12} lg={12}>
          <Card
            title="各工厂产量"
            bordered={false}
            styles={{ body: { padding: '12px 8px' }, header: cardHeadStyle }}
            style={cardStyle}
          >
            <ReactECharts option={factoryBarOption} style={{ height: 380 }} />
          </Card>
        </Col>

        {/* Chart 3: 各车间产量 */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="各车间产量"
            bordered={false}
            styles={{ body: { padding: '12px 8px' }, header: cardHeadStyle }}
            style={cardStyle}
          >
            <ReactECharts option={workshopBarOption} style={{ height: 380 }} />
          </Card>
        </Col>

        {/* Chart 4: 良品率与不良率 */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="良品率与不良率趋势"
            bordered={false}
            styles={{ body: { padding: '12px 8px' }, header: cardHeadStyle }}
            style={cardStyle}
          >
            <ReactECharts option={qualityOption} style={{ height: 380 }} />
          </Card>
        </Col>

        {/* Chart 5: 地区对比 (3 个环形图横向排列) */}
        <Col xs={24} sm={12} lg={8}>
          <Card
            title="地区产量对比"
            bordered={false}
            styles={{ body: { padding: '8px 4px' }, header: cardHeadStyle }}
            style={{ ...cardStyle, padding: 0 }}
          >
            <div style={{ display: 'flex', width: '100%' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ReactECharts option={northDonut} style={{ height: 340 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ReactECharts option={eastDonut} style={{ height: 340 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ReactECharts option={southDonut} style={{ height: 340 }} />
              </div>
            </div>
          </Card>
        </Col>

        {/* Chart 6: 仪表盘 */}
        <Col xs={24} lg={12}>
          <Card
            title="设备仪表盘"
            bordered={false}
            styles={{ body: { padding: '12px 8px' }, header: cardHeadStyle }}
            style={cardStyle}
          >
            <ReactECharts option={gaugeOption} style={{ height: 340 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
