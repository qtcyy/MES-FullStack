/** 后端工具名 → 中文展示标签 */
const TOOL_LABELS: Record<string, string> = {
  get_production_orders: '查询生产工单',
  get_materials: '查询物料信息',
  get_devices: '查询设备信息',
  get_bom_list: '查询 BOM 清单',
  get_product_bom_structure: '查询产品 BOM 结构',
  get_warehouse_locations: '查询仓库库位',
  get_process_units: '查询工序单元',
  get_flow_routes: '查询工艺流程',
  get_users: '查询用户信息',
  get_dashboard_summary: '生产看板总览',
}

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool
}
