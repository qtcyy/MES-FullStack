<template>
  <div ref="rootRef" class="sim">
    <ScreenHeader
      title="数字孪生仓库"
      :loading="loading"
      show-fullscreen
      @refresh="load"
      @back="goBack"
      @fullscreen="toggleFullscreen"
    />

    <div v-if="error && !model" class="sim__error">
      <p>数据加载失败</p>
      <el-button type="primary" @click="load">重试</el-button>
    </div>

    <div v-else-if="model && model.warehouses.length === 0" class="sim__empty">暂无仓库数据</div>

    <div v-else class="sim__stage">
      <WarehouseScene v-if="model" :model="model" @hover="onHover" @select="onSelect" />

      <div v-if="model" class="sim__hud">
        <div class="sim__stat"><b>{{ model.stats.warehouseCount }}</b><span>仓库</span></div>
        <div class="sim__stat"><b>{{ model.stats.locationCount }}</b><span>库位</span></div>
        <div class="sim__stat"><b>{{ model.stats.occupiedCount }}</b><span>占用</span></div>
        <div class="sim__stat"><b>{{ ratePct }}%</b><span>占用率</span></div>
      </div>

      <div v-if="hovered" class="sim__hover">{{ hovered.code }}</div>

      <div class="sim__legend">
        <span>低</span>
        <i class="sim__legend-bar" />
        <span>高</span>
      </div>
    </div>

    <el-drawer v-model="drawerOpen" :title="selected?.code || '库位详情'" size="360px" direction="rtl">
      <div v-if="selectedDetail" class="sim__detail">
        <p><label>库位编码</label><span>{{ selectedDetail.code }}</span></p>
        <p><label>所属仓库</label><span>{{ selectedDetail.warehouseName }}</span></p>
        <p><label>在库物料</label><span>{{ selectedDetail.materialCode || '—' }}</span></p>
        <p><label>物料描述</label><span>{{ selectedDetail.materialDesc || '—' }}</span></p>
        <p><label>在库数量</label><span>{{ selectedDetail.quantity }} {{ selectedDetail.unit || '' }}</span></p>
        <p><label>最近入库</label><span>{{ selectedDetail.lastInboundTime || '—' }}</span></p>
      </div>
      <div v-else class="sim__detail-empty">该库位暂无库存</div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { warehouseList, warehouseLocations } from '@/api/basedata/warehouse'
import { pageInventory } from '@/api/inventory/stock'
import { buildSceneModel, type RawScene, type SceneModel } from '@/utils/simulationModel'
import type { SpWarehouseLocation } from '@/types/warehouse'
import ScreenHeader from '@/layouts/components/ScreenHeader.vue'
import WarehouseScene from './WarehouseScene.vue'

const router = useRouter()
const rootRef = ref<HTMLDivElement | null>(null)
const model = ref<SceneModel | null>(null)
const loading = ref(false)
const error = ref(false)
const hovered = ref<SpWarehouseLocation | null>(null)
const selected = ref<SpWarehouseLocation | null>(null)
const drawerOpen = ref(false)

const ratePct = computed(() =>
  model.value ? Math.round(model.value.stats.occupancyRate * 100) : 0,
)

const selectedDetail = computed(() => {
  if (!selected.value || !model.value) return null
  const inv = model.value.inventoryByLoc.get(selected.value.id)
  const wh = model.value.warehouseById.get(selected.value.warehouseId)
  if (!inv) return null
  return {
    code: selected.value.code,
    warehouseName: wh?.name ?? inv.warehouseName ?? '—',
    materialCode: inv.materialCode,
    materialDesc: inv.materialDesc,
    quantity: inv.quantity,
    unit: inv.unit,
    lastInboundTime: inv.lastInboundTime,
  }
})

const OCCUPANCY_FETCH_SIZE = 100000

async function load() {
  loading.value = true
  try {
    const warehouses = (await warehouseList()) ?? []
    const [locsArr, invPage] = await Promise.all([
      Promise.all(
        warehouses.map((w) =>
          warehouseLocations(w.id).then((locations) => ({ whId: w.id, locations: locations ?? [] })),
        ),
      ),
      pageInventory({ current: 1, size: OCCUPANCY_FETCH_SIZE }).then((p) => p?.records ?? []),
    ])
    const raw: RawScene = { warehouses, locationsByWh: locsArr, inventory: invPage }
    model.value = buildSceneModel(raw)
    error.value = false
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function onHover(loc: SpWarehouseLocation | null) {
  hovered.value = loc
}
function onSelect(loc: SpWarehouseLocation) {
  selected.value = loc
  drawerOpen.value = true
}
function goBack() {
  router.push('/welcome')
}
function toggleFullscreen() {
  const el = rootRef.value
  if (!el) return
  if (document.fullscreenElement) document.exitFullscreen()
  else el.requestFullscreen?.()
}

load()
onUnmounted(() => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
})
</script>

<style scoped>
.sim {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a1020;
  color: #eaf2ff;
}
.sim__stage {
  position: relative;
  flex: 1;
  min-height: 0;
}
.sim__hud {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 12px;
  z-index: 2;
}
.sim__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px;
  border: 1px solid rgba(120, 160, 220, 0.2);
  border-radius: 8px;
  background: rgba(13, 21, 48, 0.7);
  backdrop-filter: blur(3px);
}
.sim__stat b {
  font-size: 22px;
  color: #36e0ff;
  font-variant-numeric: tabular-nums;
}
.sim__stat span {
  font-size: 12px;
  color: #8aa0c4;
}
.sim__hover {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 6px;
  background: rgba(13, 21, 48, 0.85);
  border: 1px solid rgba(120, 160, 220, 0.25);
  z-index: 2;
  font-size: 13px;
}
.sim__legend {
  position: absolute;
  bottom: 18px;
  right: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
  font-size: 12px;
  color: #8aa0c4;
}
.sim__legend-bar {
  width: 160px;
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, rgb(30, 64, 175), rgb(6, 182, 212), rgb(234, 179, 8), rgb(249, 115, 22), rgb(220, 38, 38));
}
.sim__error,
.sim__empty {
  flex: 1;
  display: grid;
  place-content: center;
  gap: 16px;
  color: #8aa0c4;
}
.sim__detail p {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.sim__detail label {
  color: #909399;
}
.sim__detail-empty {
  color: #909399;
  text-align: center;
  padding: 24px 0;
}
</style>
