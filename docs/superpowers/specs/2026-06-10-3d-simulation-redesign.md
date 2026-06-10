# 3D 数字仿真页面重设计

## 概述

将 `/digitization/simulation` 页面从当前"单一仓库盒子展示"改为旧版"工厂仓库全景仿真"风格。所有仓库在同一个 3D 场景中展示，每个仓库建模为带支架和层板的货架结构，货位上放置货物盒子。

## 技术方案

保持 **React Three Fiber** (`@react-three/fiber` + `@react-three/drei`)，所有 3D 元素封装为 React 组件。

## 组件架构

```
Simulation3D (页面顶层)
├── SceneSetup            (场景：天空盒背景 + 灯光 + 轨道控制)
├── WarehouseBuilding     (工厂建筑：地板 + 四面墙 + 带门洞的墙 + 门 + 窗)
├── Billboard             (滚动标语面板)
├── WarehouseZones        (所有仓库按区域排列)
│   └── WarehouseZone[]   
│       ├── ZoneLabel     (库区 3D 文字标注)
│       ├── ZoneBoundary  (库区虚线边界)
│       └── Shelf[]       (货架组)
│           ├── ShelfBoard   (货架层板，带纹理)
│           ├── ShelfPillars (四根立柱/支架)
│           └── WarehouseLocation[] (货位 → 货物盒子)
└── DataPanels            (ECharts 3D Sprite 面板)
```

## 数据映射

| 数据库字段 | 3D 对象 |
|---|---|
| SpWarehouse | 一个 "库区" (Storage Zone)，有名称标注和边界 |
| SpWarehouse.groups/rows/layers/columns | 货架布局参数，决定货架数量和排列 |
| SpWarehouseLocation | 一个 "货位"，上方放置货物盒子 |
| SpWarehouseLocation.code | 货物盒子的标识 |

**多个仓库排列规则：** 在场景中水平排开（沿 X 轴），每个库区间距足够放下一组货架。

## 场景元素

### 1. 工厂建筑 (WarehouseBuilding)

- **地板：** 带纹理的大平面，纹理可平铺重复
- **四面墙：** 半透明/浅色材质，围合整个场景
- **前墙（带门洞）：** 前面墙体挖出 2 个门洞 + 4 个窗洞（BSP 减法或使用带透明通道的纹理面片）
- **门：** 左右移门各 2 扇，用纹理贴图
- **窗户：** 4 扇，用纹理贴图

尺寸参考旧版：建筑约 2600×1400×200 单位（宽×深×高）。

### 2. 天空盒 (Skybox)

- 使用 CubeTexture 加载 6 面天空盒图片（复用旧版 `skybox/*.jpg`）

### 3. 货架 (Shelf)

每个货架由多层组成（layers 层），每层有：
- **层板：** 一个扁平的 BoxGeometry，带纹理 (`rack.png`)
- **立柱：** 4 根细长的 BoxGeometry，深色材质，支撑在层板四角
- **货物：** 在每个库位（column）上方放置一个带纹理的立方体 (`box.png`)

参考旧版尺寸：
- 层板：24(长) × 2(高) × 55(宽)
- 立柱：2×2×25
- 货物：16×16×16

### 4. 库区标注 (ZoneLabel)

- 3D 文字（使用 TextGeometry 或 drei 的 Text），显示仓库名称
- 颜色可配置，位于库区前方
- 或使用 Canvas 纹理贴到 Sprite 上作为标签

### 5. 库区边界 (ZoneBoundary)

- 虚线矩形框围住整个库区（货架组），用细线 PlaneGeometry 模拟

### 6. 数据面板 (DataPanels)

- 使用 ECharts 渲染到 Canvas → 贴到 3D Sprite 上
- 饼图（库区分布）+ 柱状图，放在场景角落

### 7. 滚动标语 (Billboard)

- 带文字的平面，纹理 UV 偏移实现滚动效果
- 放在场景顶部后方

## 交互

- **OrbitControls：** 旋转/缩放/平移视角，限制缩放范围和最大角度
- **鼠标悬停货物：** 高亮并显示库位信息（可选，后续迭代）
- **货架货物可拖拽：** 用 DragControls（旧版有，新版是否保留待定）

## 依赖

现有依赖已满足：
- `@react-three/fiber` + `@react-three/drei`（已在项目中）
- `three`（已在项目中）
- `echarts`（已在项目中）
- `antd`（已在项目中，用于加载状态）

需要确认的静态资源（从旧版 git 历史恢复）：
- `/static/lib/ThreeJs/images/floor.jpg` — 地板纹理
- `/static/lib/ThreeJs/images/rack.png` — 货架纹理
- `/static/lib/ThreeJs/images/box.png` — 货物纹理
- `/static/lib/ThreeJs/images/plane.png` — 区域纹理
- `/static/lib/ThreeJs/images/line.png` — 边界线纹理
- `/static/lib/ThreeJs/images/door_left.png`, `door_right.png` — 门纹理
- `/static/lib/ThreeJs/images/window.png` — 窗户纹理
- `/static/lib/ThreeJs/images/biaoyu.png` — 标语纹理
- `/static/lib/ThreeJs/images/skybox/*.jpg` — 天空盒 6 面
- `/static/lib/ThreeJs/FZYaoTi_Regular.json` — 3D 文字字体

## 文件变更

| 操作 | 文件 |
|---|---|
| 重写 | `mes/frontend/src/pages/digitization/Simulation3D.tsx` |
| 新增 | `mes/frontend/src/pages/digitization/components/SceneSetup.tsx` |
| 新增 | `mes/frontend/src/pages/digitization/components/WarehouseBuilding.tsx` |
| 新增 | `mes/frontend/src/pages/digitization/components/Shelf.tsx` |
| 新增 | `mes/frontend/src/pages/digitization/components/WarehouseZone.tsx` |
| 新增 | `mes/frontend/src/pages/digitization/components/DataPanels.tsx` |
| 新增 | `mes/frontend/src/pages/digitization/components/Billboard.tsx` |
| 恢复 | `mes/src/main/resources/static/lib/ThreeJs/images/*`（静态资源） |
| 恢复 | `mes/src/main/resources/static/lib/ThreeJs/FZYaoTi_Regular.json` |

## 实现顺序

1. 恢复旧版静态资源（纹理图片、字体）
2. 创建基础场景组件（SceneSetup：灯光、天空盒、控制器）
3. 创建工厂建筑（WarehouseBuilding：地板、墙壁、门窗）
4. 创建货架组件（Shelf：层板+立柱+货物）
5. 创建库区组件（WarehouseZone：标注+边界+货架组）
6. 创建数据面板（DataPanels：ECharts Sprite）
7. 创建滚动标语（Billboard）
8. 组装 Simulation3D 页面，对接仓库 API
9. 调优布局和视觉效果
