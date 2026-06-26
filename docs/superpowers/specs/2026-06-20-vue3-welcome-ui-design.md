# Vue3 首页 UI 优化设计(精简版)

**日期**: 2026-06-20 · **范围**: `mes/vue3` 首页 `WelcomeView.vue` · **类型**: UI 优化(作业支线)

## 目标

让首页内容更丰富、优雅:加入图标、数据分析图表、真实路由跳转,与现有 Element Plus + 设计 token + 深/浅主题保持一致。

## 决策

- **图表库**: 引入 `echarts` + `vue-echarts`(按需注册,控制体积)。
- **数据**: 全部静态 Mock,集中在 `views/welcome/mock.ts`。
- **快捷入口**: 改真实路由跳转。
- **主题**: 图表配色随 `appStore.theme`('light'/'dark') 重算,读取 CSS token。

## 页面结构(由上到下)

1. **问候横幅** — 保留渐变横幅,右侧加实时时钟 + 微信息,更饱满。
2. **KPI 统计卡 ×4** — 数字卡升级:模块图标 + 环比趋势(▲/▼ %,涨绿跌红)+ 右下角迷你 sparkline(ECharts)+ 左侧彩色强调条。
3. **数据分析区(核心,新增)** — 3 张图表卡:
   - 近 7 天产量趋势(面积折线,产量 vs 计划)
   - 工单状态分布(环形图)
   - 各车间设备稼动率(横向柱状)
4. **快捷入口** — 真实路由跳转。可用模块:系统管理→`/system/user`、物料管理→`/basedata/materile`、工艺路线→`/technology/flow`、工序定义→`/technology/oper`;无路由模块(计划工单/智慧大屏/数字孪生)仍 toast「敬请期待」。
5. **待办/动态区(新增)** — 近期生产动态时间线 + 待处理事项小卡。

## 组件与文件改动

- `views/welcome/WelcomeView.vue` — 重写。
- `components/EChart.vue`(新增) — 主题感知 ECharts 封装。
- `views/welcome/mock.ts`(新增) — 集中 Mock 数据。
- `package.json` — 新增 `echarts`、`vue-echarts` 依赖。

## 动画

沿用 `v-motion` 入场动效;图表用 ECharts 自带动画。

## 验收

- 浅色/深色主题下首页均正常、图表配色正确。
- 快捷入口可用模块正确跳转。
- `pnpm build`(vue-tsc + vite)通过。
