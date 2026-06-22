import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/**
 * 路由表:
 * - AdminLayout 壳下挂后台业务子路由(Cycle 1 起按模块追加,path 对齐 sp_sys_menu.url)
 * - ScreenLayout 壳用于大屏/3D(Cycle 1 追加)
 * - 动态路由参数示例:Cycle 1 的 /technology/bom/:id?
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/welcome',
    children: [
      {
        path: 'welcome',
        name: 'welcome',
        component: () => import('@/views/welcome/WelcomeView.vue'),
        meta: { title: '首页' },
      },
      // ↓ Cycle 1 起在此追加各模块子路由(path 对齐后端菜单 url)
      {
        path: 'system/user',
        name: 'system-user',
        component: () => import('@/views/system/user/UserList.vue'),
        meta: { title: '用户管理', perm: 'user:add' /* 后端菜单权限粒度仅 <模块>:add,故视图/按钮门控复用之 */ },
      },
      {
        path: 'system/role',
        name: 'system-role',
        component: () => import('@/views/system/role/RoleList.vue'),
        meta: { title: '角色管理', perm: 'role:add' },
      },
      {
        path: 'system/menu',
        name: 'system-menu',
        component: () => import('@/views/system/menu/MenuList.vue'),
        meta: { title: '菜单管理', perm: 'menu:add' },
      },
      {
        path: 'system/department',
        name: 'system-department',
        component: () => import('@/views/system/dept/DeptList.vue'),
        meta: { title: '部门管理', perm: 'dept:add' },
      },
      {
        path: 'system/dict',
        name: 'system-dict',
        component: () => import('@/views/system/dict/DictList.vue'),
        meta: { title: '字典管理', perm: 'dict:add' },
      },
      {
        path: 'system/team',
        component: () => import('@/views/system/team/TeamPage.vue'),
        meta: { title: '班组员工定义', perm: 'team:add' },
      },
      {
        path: 'basedata/materile',
        name: 'basedata-materile',
        component: () => import('@/views/basedata/materile/MaterileList.vue'),
        meta: { title: '物料维护', perm: 'materile:add' },
      },
      {
        path: 'basedata/device',
        name: 'basedata-device',
        component: () => import('@/views/basedata/device/DeviceList.vue'),
        meta: { title: '设备维护', perm: 'device:add' },
      },
      {
        path: 'basedata/component',
        name: 'basedata-component',
        component: () => import('@/views/basedata/component/ComponentList.vue'),
        meta: { title: '零部件维护', perm: 'component:add' },
      },
      {
        path: 'basedata/device-group',
        name: 'basedata-device-group',
        component: () => import('@/views/basedata/device-group/DeviceGroupPage.vue'),
        meta: { title: '设备编组', perm: 'device:add' },
      },
      {
        path: 'basedata/warehouse',
        name: 'basedata-warehouse',
        component: () => import('@/views/basedata/warehouse/WarehousePage.vue'),
        meta: { title: '仓库管理', perm: 'warehouse:add' },
      },
      {
        path: 'basedata/process-unit',
        name: 'basedata-process-unit',
        component: () => import('@/views/basedata/process-unit/ProcessUnitList.vue'),
        meta: { title: '加工单元', perm: 'process-unit:add' },
      },
      {
        path: 'technology/oper',
        name: 'technology-oper',
        component: () => import('@/views/technology/oper/OperList.vue'),
        meta: { title: '工序定义', perm: 'oper:add' },
      },
      {
        path: 'technology/flow',
        name: 'technology-flow',
        component: () => import('@/views/technology/flow/FlowList.vue'),
        meta: { title: '工艺路线管理', perm: 'flow:add' },
      },
      {
        path: 'technology/product-bom',
        name: 'technology-product-bom',
        component: () => import('@/views/technology/product-bom/ProductBomList.vue'),
        meta: { title: '产品BOM管理', perm: 'product-bom:add' },
      },
      {
        path: 'technology/bom-flow',
        name: 'technology-bom-flow',
        component: () => import('@/views/technology/bom-flow/BomFlowPage.vue'),
        meta: { title: 'BOM工艺绑定', perm: 'bom-flow:add' },
      },
      {
        path: 'order/release',
        name: 'order-release',
        component: () => import('@/views/order/release/OrderList.vue'),
        meta: { title: '工单下达', perm: 'order:add' },
      },
      {
        path: 'order/dispatch',
        name: 'order-dispatch',
        component: () => import('@/views/order/dispatch/DispatchList.vue'),
        meta: { title: '员工作业派工', perm: 'order:dispatch' },
      },
      {
        path: 'order/gantt',
        name: 'order-gantt',
        component: () => import('@/views/order/gantt/GanttPage.vue'),
        meta: { title: '生产甘特图', perm: 'order:gantt' },
      },
      {
        path: 'workflow/category',
        name: 'workflow-category',
        component: () => import('@/views/workflow/category/CategoryList.vue'),
        meta: { title: '流程分类管理', perm: 'workflow:category:list' },
      },
      {
        path: 'workflow/form',
        name: 'workflow-form',
        component: () => import('@/views/workflow/form/FormList.vue'),
        meta: { title: '流程表单管理', perm: 'workflow:form:list' },
      },
      {
        path: 'workflow/definition',
        name: 'workflow-definition',
        component: () => import('@/views/workflow/definition/DefinitionList.vue'),
        meta: { title: '流程定义管理', perm: 'workflow:definition:list' },
      },
      {
        path: 'inventory/receipt',
        name: 'inventory-receipt',
        component: () => import('@/views/inventory/ReceiptPage.vue'),
        meta: { title: '计划入库确认', perm: 'inventory:inbound' },
      },
      {
        path: 'inventory/query',
        name: 'inventory-query',
        component: () => import('@/views/inventory/InventoryQueryPage.vue'),
        meta: { title: '库存明细查询', perm: 'inventory:query' },
      },
      {
        path: 'inventory/outbound',
        name: 'inventory-outbound',
        component: () => import('@/views/inventory/OutboundPage.vue'),
        meta: { title: '配套出库确认', perm: 'inventory:outbound' },
      },
      {
        path: 'inventory/manual-inbound',
        name: 'inventory-manual-inbound',
        component: () => import('@/views/inventory/ManualInboundPage.vue'),
        meta: { title: '手动入库', perm: 'inventory:inbound' },
      },
    ],
  },
  {
    path: '/digitization/dashboard',
    component: () => import('@/layouts/ScreenLayout.vue'),
    children: [
      {
        path: '',
        name: 'digitization-dashboard',
        component: () => import('@/views/digitization/dashboard/PlanDashboard.vue'),
        meta: { title: '智慧大屏', perm: 'user:add' },
      },
    ],
  },
  {
    path: '/digitization/simulation',
    component: () => import('@/layouts/ScreenLayout.vue'),
    children: [
      {
        path: '',
        name: 'digitization-simulation',
        component: () => import('@/views/digitization/simulation/Simulation3DPage.vue'),
        meta: { title: '数字仿真3D仓库', perm: 'warehouse:add' },
      },
    ],
  },
  { path: '/403', component: () => import('@/views/error/403.vue'), meta: { public: true, title: '403' } },
  { path: '/500', component: () => import('@/views/error/500.vue'), meta: { public: true, title: '500' } },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/error/404.vue'),
    meta: { public: true, title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
