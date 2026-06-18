import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import type { SpInventory } from '@/types/inventory'

/** 取数层产出的原始三件套 */
export interface RawScene {
  warehouses: SpWarehouse[]
  locationsByWh: { whId: string; locations: SpWarehouseLocation[] }[]
  inventory: SpInventory[]
}

export interface WarehouseStat {
  id: string
  name: string
  locationCount: number
  occupiedCount: number
}

export interface SceneStats {
  warehouseCount: number
  locationCount: number
  occupiedCount: number
  occupancyRate: number
  perWarehouse: WarehouseStat[]
}

export interface SceneModel {
  warehouses: SpWarehouse[]
  locationsByWh: Map<string, SpWarehouseLocation[]>
  occupancyByLoc: Map<string, number>
  inventoryByLoc: Map<string, SpInventory>
  locationById: Map<string, SpWarehouseLocation>
  warehouseById: Map<string, SpWarehouse>
  globalMax: number
  zonePositions: { wh: SpWarehouse; x: number }[]
  stats: SceneStats
}

const BOARD_LENGTH = 55
const SHELF_GAP_X = 20
const ZONE_GAP = 100

/** 多仓库沿 X 轴铺开（沿用 mes1 算法） */
export function buildZonePositions(warehouses: SpWarehouse[]): { wh: SpWarehouse; x: number }[] {
  const pos: { wh: SpWarehouse; x: number }[] = []
  let currentX = 0
  for (const wh of warehouses) {
    const columns = wh.columns || 1
    const zoneW = columns * (BOARD_LENGTH + SHELF_GAP_X)
    pos.push({ wh, x: currentX })
    currentX += zoneW + ZONE_GAP
  }
  return pos
}

/** 按 locationId 汇总在库量 + 留存台账 + 全局最大值 */
export function aggregateOccupancy(inventory: SpInventory[]): {
  occupancyByLoc: Map<string, number>
  inventoryByLoc: Map<string, SpInventory>
  globalMax: number
} {
  const occupancyByLoc = new Map<string, number>()
  const inventoryByLoc = new Map<string, SpInventory>()
  for (const it of inventory) {
    if (!it.locationId) continue
    const qty = Number(it.quantity) || 0
    occupancyByLoc.set(it.locationId, (occupancyByLoc.get(it.locationId) ?? 0) + qty)
    inventoryByLoc.set(it.locationId, it)
  }
  let globalMax = 0
  for (const v of occupancyByLoc.values()) if (v > globalMax) globalMax = v
  return { occupancyByLoc, inventoryByLoc, globalMax }
}

/** 统计：库位数 / 有量库位 / 占用率 / 每仓库 */
export function computeStats(
  warehouses: SpWarehouse[],
  locationsByWh: Map<string, SpWarehouseLocation[]>,
  occupancyByLoc: Map<string, number>,
): SceneStats {
  let locationCount = 0
  let occupiedCount = 0
  const perWarehouse: WarehouseStat[] = []
  for (const wh of warehouses) {
    const locs = locationsByWh.get(wh.id) ?? []
    let whOccupied = 0
    for (const loc of locs) if ((occupancyByLoc.get(loc.id) ?? 0) > 0) whOccupied++
    locationCount += locs.length
    occupiedCount += whOccupied
    perWarehouse.push({ id: wh.id, name: wh.name, locationCount: locs.length, occupiedCount: whOccupied })
  }
  const occupancyRate = locationCount > 0 ? occupiedCount / locationCount : 0
  return { warehouseCount: warehouses.length, locationCount, occupiedCount, occupancyRate, perWarehouse }
}

/** 原始三件套 → 视图模型 */
export function buildSceneModel(raw: RawScene): SceneModel {
  const locationsByWh = new Map<string, SpWarehouseLocation[]>()
  const locationById = new Map<string, SpWarehouseLocation>()
  for (const entry of raw.locationsByWh) {
    locationsByWh.set(entry.whId, entry.locations)
    for (const loc of entry.locations) locationById.set(loc.id, loc)
  }
  const warehouseById = new Map<string, SpWarehouse>()
  for (const wh of raw.warehouses) warehouseById.set(wh.id, wh)

  const { occupancyByLoc, inventoryByLoc, globalMax } = aggregateOccupancy(raw.inventory)
  const zonePositions = buildZonePositions(raw.warehouses)
  const stats = computeStats(raw.warehouses, locationsByWh, occupancyByLoc)

  return {
    warehouses: raw.warehouses,
    locationsByWh,
    occupancyByLoc,
    inventoryByLoc,
    locationById,
    warehouseById,
    globalMax,
    zonePositions,
    stats,
  }
}
