import { describe, it, expect } from 'vitest'
import {
  aggregateOccupancy,
  buildZonePositions,
  computeStats,
  buildSceneModel,
  type RawScene,
} from '../simulationModel'
import type { SpWarehouse, SpWarehouseLocation } from '@/types/warehouse'
import type { SpInventory } from '@/types/inventory'

function wh(id: string, columns: number, name = id): SpWarehouse {
  return { id, code: id, name, groups: 1, rows: 1, layers: 1, columns }
}
function loc(id: string, warehouseId: string): SpWarehouseLocation {
  return { id, warehouseId, code: id, groupNo: 1, rowNo: 1, layerNo: 1, colNo: 1 }
}
function inv(locationId: string, quantity: number): SpInventory {
  return { id: 'i-' + locationId, materialCode: 'M1', quantity, locationId }
}

describe('aggregateOccupancy', () => {
  it('按 locationId 求和并取全局最大值', () => {
    const r = aggregateOccupancy([inv('A', 10), inv('A', 5), inv('B', 30)])
    expect(r.occupancyByLoc.get('A')).toBe(15)
    expect(r.occupancyByLoc.get('B')).toBe(30)
    expect(r.globalMax).toBe(30)
  })
  it('空输入 → 空 map, globalMax 0', () => {
    const r = aggregateOccupancy([])
    expect(r.occupancyByLoc.size).toBe(0)
    expect(r.globalMax).toBe(0)
  })
  it('忽略无 locationId 的行', () => {
    const r = aggregateOccupancy([{ id: 'x', materialCode: 'M', quantity: 9 } as SpInventory])
    expect(r.occupancyByLoc.size).toBe(0)
  })
})

describe('buildZonePositions', () => {
  it('沿 X 轴按列数铺开 + ZONE_GAP', () => {
    const pos = buildZonePositions([wh('w1', 2), wh('w2', 3)])
    expect(pos[0].x).toBe(0)
    // w1 zoneW = 2*(55+20)=150, +ZONE_GAP 100 => 250
    expect(pos[1].x).toBe(250)
  })
  it('columns 缺省按 1', () => {
    const pos = buildZonePositions([{ ...wh('w', 0), columns: 0 }])
    expect(pos[0].x).toBe(0)
  })
})

describe('computeStats', () => {
  it('占用率 = 有量库位 / 总库位', () => {
    const locs = new Map<string, SpWarehouseLocation[]>([['w1', [loc('A', 'w1'), loc('B', 'w1')]]])
    const occ = new Map<string, number>([['A', 5]]) // B 空
    const s = computeStats([wh('w1', 2)], locs, occ)
    expect(s.locationCount).toBe(2)
    expect(s.occupiedCount).toBe(1)
    expect(s.occupancyRate).toBeCloseTo(0.5)
    expect(s.perWarehouse[0]).toMatchObject({ id: 'w1', locationCount: 2, occupiedCount: 1 })
  })
  it('总库位 0 → 占用率 0(不除零)', () => {
    const s = computeStats([wh('w1', 1)], new Map(), new Map())
    expect(s.occupancyRate).toBe(0)
  })
})

describe('buildSceneModel', () => {
  it('整合并建立 locationId/warehouse 索引', () => {
    const raw: RawScene = {
      warehouses: [wh('w1', 2)],
      locationsByWh: [{ whId: 'w1', locations: [loc('A', 'w1'), loc('B', 'w1')] }],
      inventory: [inv('A', 20)],
    }
    const m = buildSceneModel(raw)
    expect(m.globalMax).toBe(20)
    expect(m.occupancyByLoc.get('A')).toBe(20)
    expect(m.locationById.get('A')?.code).toBe('A')
    expect(m.warehouseById.get('w1')?.name).toBe('w1')
    expect(m.inventoryByLoc.get('A')?.materialCode).toBe('M1')
    expect(m.stats.occupancyRate).toBeCloseTo(0.5)
  })
})
