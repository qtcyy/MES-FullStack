# 子周期 1f — 3D 数字孪生仓库设计

- 日期:2026-06-21
- 分支:`feature/simulation-3d`(从 `develop` 切)
- 范围:Vue3 课程作业前端 `mes/vue3`,数字化亮点②「Three.js 3D 数字孪生仓库」
- 参考(仅功能/逻辑,**不抄 UI**):mes-new 周期 2i-2 仿真页(R3F → 本周期改原生 Three.js)

## 1. 目标

落地一块**全屏深色 kiosk 的 3D 数字孪生仓库**:按后端真实 仓库/库位/库存 渲染三维货架,库位按在库量热力着色,支持轨道控制、hover 高亮、点击库位看详情、HUD 统计/热力图例、一键全屏。复用 1e 沉淀的 `ScreenLayout`/`ScreenHeader`。

## 2. 关键决策(已与用户确认)

1. **3D 技术栈 = 原生 Three.js 封装组件**(只加 `three` 一个依赖;R3F 是 React 专属用不了;vue3 是 Vite8/rolldown 超前栈,原生最可控)。一个 Vue 组件在 `onMounted` 手管 scene/renderer/raycaster/OrbitControls,`onUnmounted` 彻底 dispose。
2. **功能范围 = 完整数字孪生**:真实占用热力着色 + OrbitControls + hover 高亮 + 点击库位详情 + HUD/图例/占用条 + 一键全屏 + 空/错/加载态。数据一律后端真实。
3. **材质纯色/程序化,不引外部贴图文件**(规避资源路径/离线问题;沿用 mes-new"弃 box.png 改纯色热力")。不做场景内 3D 文字(避免字体资产),仓库辨识靠 hover/点击 + HUD。
4. **全屏按钮加进 ScreenHeader**(可选 `@fullscreen` emit + `showFullscreen` prop,向后兼容,1e 不受影响)。
5. **库位用独立 mesh**(作业数据量小,清晰优先;量大改 InstancedMesh,记 backlog)。

## 3. 后端契约(均已存在,本周期纯前端消费)

- `GET /basedata/warehouse/list` → `SpWarehouse[]`
- `GET /basedata/warehouse/locations/{warehouseId}` → `SpWarehouseLocation[]`
- `POST /inventory/page`(form 编码,`{current,size}`)→ `IPage<SpInventory>`(取 `records`;size 拉大如 100000 取全量)

类型(镜像后端,只取场景所需字段):
```ts
interface SpWarehouse { id: string; code: string; name: string; type?: string; groups: number; rows: number; layers: number; columns: number; descr?: string; deleted?: string }
interface SpWarehouseLocation { id: string; warehouseId: string; code: string; groupNo: number; rowNo: number; layerNo: number; colNo: number; deleted?: string }
interface SpInventory { id: string; materialCode: string; materialDesc?: string; unit?: string; warehouseId?: string; warehouseName?: string; locationId?: string; locationCode?: string; quantity: number; status?: string; lastInboundTime?: string }
```

匹配键:`SpInventory.locationId === SpWarehouseLocation.id`(后端 `sp_inventory` 对 location_id 有 UNIQUE,一库位一行)。

## 4. 路由 / 菜单 / 导航

- **菜单预置零种子**:原始 schema 已有 父 `17`「黑科数字孪生」→ `171`「数字仿真3D仓库」(`url=/digital/simulation/list-ui`,perm `warehouse:add`,icon codepen)。沿用 1e/131/121 模式,不新增菜单种子;仅冒烟时核验 171 在 `mes_data` 存在。
- **urlMap**:`src/utils/urlMap.ts` 加 `'/digital/simulation/list-ui': '/digitization/simulation'`。
- **router**:新增**顶层** ScreenLayout 路由块(与 1e 并列):

  ```
  {
    path: '/digitization/simulation',
    component: () => import('@/layouts/ScreenLayout.vue'),
    children: [{
      path: '',
      name: 'digitization-simulation',
      component: () => import('@/views/digitization/simulation/Simulation3DPage.vue'),
      meta: { title: '数字仿真3D仓库', perm: 'warehouse:add' },
    }],
  }
  ```
  - 路由级动态 `import()` → Three.js 进独立 chunk 懒加载。

## 5. 文件结构

```
src/types/warehouse.ts                                  # 新建:SpWarehouse / SpWarehouseLocation
src/types/inventory.ts                                  # 新建:SpInventory(仅场景所需)
src/api/basedata/warehouse.ts                           # 新建:warehouseList / warehouseLocations
src/api/inventory/stock.ts                              # 新建:pageInventory
src/utils/simulationModel.ts                            # 新建:纯逻辑(移植 mes-new,TDD)
src/utils/heatColor.ts                                  # 新建:热力色(移植 mes-new,TDD)
tests/simulationModel.spec.ts                           # 新建
tests/heatColor.spec.ts                                 # 新建
src/views/digitization/simulation/WarehouseScene.vue    # 新建:原生 Three.js 封装(scene/raycaster/controls/dispose)
src/views/digitization/simulation/Simulation3DPage.vue  # 新建:编排(取数+HUD覆盖层+drawer详情+全屏)
src/views/digitization/simulation/sceneHud.css          # 新建(可选):HUD/图例/占用条样式
src/layouts/components/ScreenHeader.vue                 # 修改:加可选 @fullscreen + showFullscreen
src/router/index.ts                                     # 修改:加顶层路由块
src/utils/urlMap.ts                                     # 修改:加映射
```

## 6. 纯逻辑(移植 mes-new,TDD)

- `simulationModel.ts`:
  - `buildZonePositions(warehouses)`:多仓沿 X 轴铺开,按 `wh.columns` 算每仓宽度。
  - `aggregateOccupancy(inventory)`:按 `locationId` 汇总 `quantity` → `occupancyByLoc` + `inventoryByLoc` + `globalMax`。
  - `computeStats(warehouses, locationsByWh, occupancyByLoc)`:库位数/有量库位/占用率/每仓统计。
  - `buildSceneModel(raw)`:合成 Map 索引(locationsByWh / occupancyByLoc / inventoryByLoc / locationById / warehouseById / zonePositions / stats / globalMax)。
- `heatColor(qty, globalMax)`:`qty<=0||globalMax<=0` → 灰;否则 深蓝→青→黄→橙→红 线性渐变 `rgb(...)`。
- 移植 mes-new 既有单测用例(`simulationModel.test.ts` 8 例 / `heatColor.test.ts` 6 例),改为 vitest `tests/*.spec.ts` 风格、`@/types` 导入。

## 7. 取数编排

`Simulation3DPage` 内:`warehouseList()` → 各仓库 `warehouseLocations(wh.id)` 并行 + `pageInventory({current:1,size:100000})` 取 records → 组装 `RawScene{warehouses, locationsByWh, inventory}` → `buildSceneModel` → 喂 `WarehouseScene`。用 `ref` 状态 + try/catch + ElMessage(错误已被 http 拦截器 toast,页面仅记 error 态)。无仓库时显空态。

## 8. 3D 组件 `WarehouseScene.vue`(原生 Three.js)

- props:`{ model: SceneModel }`;emits:`hover(location|null)`、`select(location)`。
- `onMounted`:创建 `WebGLRenderer`(antialias,挂到容器 div)、`PerspectiveCamera`、`Scene`(深色雾/背景)、灯光(环境光 + 方向光)、`OrbitControls`(阻尼)、地面网格、按 `zonePositions` + 库位 `colNo/rowNo/layerNo` 摆放库位盒(`BoxGeometry` 共享几何 + 每盒 `MeshStandardMaterial`,色 = `heatColor(occ, globalMax)`;空库位暗灰矮块)。每个库位 mesh 记 `userData.locationId`。
- 渲染循环:`requestAnimationFrame`;`controls.update()`;`prefers-reduced-motion` 时不自动旋转。
- 自适应:`ResizeObserver` 重设 camera aspect + renderer size。
- 交互:容器 `pointermove` → raycaster 命中库位 → 高亮(emissive 提亮 / 缩放微调)+ `emit('hover', location)`;`click` 命中 → `emit('select', location)`。
- `onUnmounted` **彻底 dispose**:取消 RAF、断开 ResizeObserver、`controls.dispose()`、遍历 dispose 所有 geometry/material、`renderer.dispose()`、移除 canvas + 事件监听。防 WebGL 上下文/内存泄漏。

## 9. 页面 `Simulation3DPage.vue`(编排)

- `ScreenHeader`(title「数字孪生仓库」、`showFullscreen`、`@refresh=load`、`@back=goBack(/welcome)`、`@fullscreen=toggleFullscreen`)。
- 主体:`<WarehouseScene :model>` 占满 + **DOM 覆盖层**:
  - HUD 统计卡(仓库数/库位数/占用库位/占用率,取 `model.stats`)。
  - 热力图例(梯度条 + 低/高标注)。
  - 底部占用条(占用率)。
- `@select` → 打开 `el-drawer`(深色)显示库位详情:库位编码、所属仓库、在库物料(materialCode/materialDesc)、数量+单位、状态、最近入库时间(取 `inventoryByLoc.get(locationId)`)。
- `@hover` → 顶部/光标旁轻提示(可选,简单文本)。
- 全屏:`toggleFullscreen()` 用 Fullscreen API 对页面根容器 `requestFullscreen/exitFullscreen`。
- 状态:loading 骨架/占位、error 重试、空仓库占位。

## 10. ScreenHeader 改动(最小、向后兼容)

加可选 `showFullscreen?: boolean` prop 与 `fullscreen` emit;模板在「刷新」「返回后台」旁条件渲染「全屏」按钮(`v-if="showFullscreen"`)。1e 的 PlanDashboard 不传 `showFullscreen` → 行为不变。

## 11. 动画 / 性能

- 单 RAF 循环;OrbitControls 阻尼;`prefers-reduced-motion` 关自动旋转。
- 库位独立 mesh(数据量小);共享 BoxGeometry 减少几何分配。
- 3D 页路由级懒加载(独立 chunk)。

## 12. 后端审查(按规矩,见 [[backend-deepseek-review-each-cycle]])

纯前端消费,但消费前读审 3 个端点正确性:
- `/basedata/warehouse/list` 与 `/locations/{id}`:是否过滤软删(deleted/is_deleted)、locations 是否按 warehouseId 正确过滤。
- `/inventory/page`:分页是否生效、location_id 关联、软删/状态过滤。
- 用 `scripts/verify/login.sh`(admin/123)+ curl 对 `mes_data` 实测结构与非空;发现真 bug 走最小修正 + Mockito 守卫单测(JUnit4)。

## 13. 测试与门禁

- `tests/simulationModel.spec.ts` + `tests/heatColor.spec.ts`(vitest node 环境,移植 mes-new 用例)。
- 3D 组件不做渲染测(沿用约定)。
- 门禁:`pnpm typecheck && pnpm test && pnpm lint:check && pnpm build` 全绿。

## 14. 交付物

- 顶层路由 + urlMap 1 条;数据层(2 types + 2 api)。
- 2 个纯逻辑 util + 单测;WarehouseScene 组件 + Simulation3DPage 编排;ScreenHeader 全屏增强。
- 后端端点审查结论(含 curl 实测)。
- 门禁全绿。

## 15. 非目标(YAGNI / 留后续)

- 场景内 3D 文字标签(字体资产)。
- InstancedMesh 性能优化(库位量大时再做)。
- 库存写操作/出入库动画(本周期只读可视化)。
- 货物盒贴图、AGV/小车动画、多楼层切换。

## 16. 已知风险 / backlog

- `pageInventory` size=100000 全量拉取(与 mes-new 一致),数据量大需真分页/聚合端点(latent)。
- 库位坐标依赖 `groupNo/rowNo/layerNo/colNo` 真实数据;若数据缺失需兜底布局(用顺序索引退化排布)。
- WebGL 上下文:vue3 无 React StrictMode 双挂载问题([[r3f-strictmode-context-lost]] 不适用),但仍须保证 onUnmounted 彻底 dispose。
- 浏览器 :4200 端到端冒烟待用户确认(需后端 :9090 + DB 有仓库/库位/库存数据)。
</content>
