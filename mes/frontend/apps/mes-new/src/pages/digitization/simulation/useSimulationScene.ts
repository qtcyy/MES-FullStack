import { useMemo } from 'react'
import { forkJoin, map, of, switchMap, type Observable } from 'rxjs'
import { useQuery$ } from '@/http/hooks'
import { warehouseList, warehouseLocations } from '@/api/basedata/warehouse'
import { pageInventory } from '@/api/inventory/stock'
import { buildSceneModel, type RawScene, type SceneModel } from './simulationModel'

/** 一次拉全量库存(标准 MyBatis-Plus 分页, size 拉大兜底) */
const OCCUPANCY_FETCH_SIZE = 100000

/** 先取仓库 → 并行取各仓库库位 + 全量库存，合成 RawScene */
export function fetchScene$(): Observable<RawScene> {
  return warehouseList().pipe(
    switchMap((warehouses) => {
      const list = warehouses ?? []
      if (list.length === 0) {
        return of<RawScene>({ warehouses: [], locationsByWh: [], inventory: [] })
      }
      return forkJoin({
        warehouses: of(list),
        locationsByWh: forkJoin(
          list.map((w) =>
            warehouseLocations(w.id).pipe(
              map((locations) => ({ whId: w.id, locations: locations ?? [] })),
            ),
          ),
        ),
        inventory: pageInventory({ current: 1, size: OCCUPANCY_FETCH_SIZE }).pipe(
          map((page) => page?.records ?? []),
        ),
      })
    }),
  )
}

/** 仿真场景数据 hook：取数 + buildSceneModel */
export function useSimulationScene() {
  const { data, loading, error, refetch } = useQuery$(['simulation', 'scene'], fetchScene$)
  const model = useMemo<SceneModel | null>(() => (data ? buildSceneModel(data) : null), [data])
  return { model, loading, error, refetch }
}
