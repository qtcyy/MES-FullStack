<template>
  <div ref="containerRef" class="warehouse-scene" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { heatColor } from '@/utils/heatColor'
import type { SceneModel } from '@/utils/simulationModel'
import type { SpWarehouseLocation } from '@/types/warehouse'

const props = defineProps<{ model: SceneModel }>()
const emit = defineEmits<{ hover: [SpWarehouseLocation | null]; select: [SpWarehouseLocation] }>()

const containerRef = ref<HTMLDivElement | null>(null)

// 渲染常量(自有渲染尺度)
const BOX = 6
const CELL = 10
const LAYER_H = 8
const ZONE_GAP = 24
const EMPTY = '#3a4256'

let renderer: THREE.WebGLRenderer | undefined
let scene: THREE.Scene | undefined
let camera: THREE.PerspectiveCamera | undefined
let controls: OrbitControls | undefined
let raf = 0
let ro: ResizeObserver | undefined
let boxGeo: THREE.BoxGeometry | undefined
const boxMeshes: THREE.Mesh[] = []
const materials: THREE.Material[] = []
let hoveredMesh: THREE.Mesh | null = null
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** 库位坐标:优先用真实 colNo/layerNo/rowNo(1 基),缺失退化为顺序索引网格 */
function locCell(loc: SpWarehouseLocation, index: number, cols: number) {
  const col = loc.colNo && loc.colNo > 0 ? loc.colNo - 1 : index % cols
  const layer = loc.layerNo && loc.layerNo > 0 ? loc.layerNo - 1 : 0
  const row = loc.rowNo && loc.rowNo > 0 ? loc.rowNo - 1 : Math.floor(index / cols)
  return { col, layer, row }
}

function buildBoxes() {
  if (!scene) return
  boxGeo = new THREE.BoxGeometry(BOX, BOX, BOX)
  const m = props.model
  let zoneX = 0
  let maxX = 0
  let maxZ = 0
  let maxY = BOX
  for (const wh of m.warehouses) {
    const locs = m.locationsByWh.get(wh.id) ?? []
    const cols = Math.max(1, wh.columns || Math.ceil(Math.sqrt(locs.length || 1)))
    locs.forEach((loc, i) => {
      const { col, layer, row } = locCell(loc, i, cols)
      const occ = m.occupancyByLoc.get(loc.id) ?? 0
      const color = occ > 0 ? heatColor(occ, m.globalMax) : EMPTY
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.55,
        metalness: 0.1,
      })
      materials.push(mat)
      const mesh = new THREE.Mesh(boxGeo, mat)
      const x = zoneX + col * CELL
      const y = BOX / 2 + layer * LAYER_H
      const z = row * CELL
      mesh.position.set(x, y, z)
      mesh.userData.locationId = loc.id
      scene!.add(mesh)
      boxMeshes.push(mesh)
      if (x > maxX) maxX = x
      if (z > maxZ) maxZ = z
      if (y > maxY) maxY = y
    })
    const zoneWidth = cols * CELL
    zoneX += zoneWidth + ZONE_GAP
  }
  const cx = maxX / 2
  const cz = maxZ / 2
  if (controls) controls.target.set(cx, maxY / 2, cz)
  if (camera) {
    const span = Math.max(maxX, maxZ, 40)
    camera.position.set(cx + span * 0.8, maxY + span * 0.7, cz + span * 1.1)
    camera.lookAt(cx, maxY / 2, cz)
  }
}

function clearBoxes() {
  if (scene) for (const mesh of boxMeshes) scene.remove(mesh)
  for (const mat of materials) mat.dispose()
  materials.length = 0
  boxMeshes.length = 0
  boxGeo?.dispose()
  boxGeo = undefined
  hoveredMesh = null
}

function findLocation(id: string): SpWarehouseLocation | null {
  return props.model.locationById.get(id) ?? null
}

function onPointerMove(ev: PointerEvent) {
  const el = containerRef.value
  if (!el || !camera) return
  const rect = el.getBoundingClientRect()
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hit = raycaster.intersectObjects(boxMeshes, false)[0]
  const mesh = (hit?.object as THREE.Mesh) ?? null
  if (mesh === hoveredMesh) return
  if (hoveredMesh) {
    const prev = hoveredMesh.material as THREE.MeshStandardMaterial
    prev.emissive.setHex(0x000000)
    hoveredMesh.scale.set(1, 1, 1)
  }
  hoveredMesh = mesh
  if (mesh) {
    const mat = mesh.material as THREE.MeshStandardMaterial
    mat.emissive.setHex(0x333333)
    mesh.scale.set(1.18, 1.18, 1.18)
    el.style.cursor = 'pointer'
    emit('hover', findLocation(mesh.userData.locationId as string))
  } else {
    el.style.cursor = 'auto'
    emit('hover', null)
  }
}

function onClick() {
  if (hoveredMesh) {
    const loc = findLocation(hoveredMesh.userData.locationId as string)
    if (loc) emit('select', loc)
  }
}

function onResize() {
  const el = containerRef.value
  if (!el || !renderer || !camera) return
  const w = el.clientWidth || 1
  const h = el.clientHeight || 1
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

function animate() {
  raf = requestAnimationFrame(animate)
  if (controls) controls.update()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

function init() {
  const el = containerRef.value
  if (!el) return
  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a1020')
  scene.fog = new THREE.Fog('#0a1020', 200, 600)

  camera = new THREE.PerspectiveCamera(50, (el.clientWidth || 1) / (el.clientHeight || 1), 0.1, 2000)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(el.clientWidth || 1, el.clientHeight || 1)
  el.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const dir = new THREE.DirectionalLight(0xffffff, 0.9)
  dir.position.set(60, 120, 80)
  scene.add(dir)

  const grid = new THREE.GridHelper(800, 80, 0x2a3550, 0x18203a)
  scene.add(grid)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.autoRotate = !reduceMotion
  controls.autoRotateSpeed = 0.6

  buildBoxes()

  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('click', onClick)
  ro = new ResizeObserver(onResize)
  ro.observe(el)
  animate()
}

onMounted(init)

watch(
  () => props.model,
  () => {
    if (!scene) return
    clearBoxes()
    // 重建前 hoveredMesh 已在 clearBoxes 置空,通知父级清掉残留的悬停标签
    emit('hover', null)
    buildBoxes()
  },
)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  const el = containerRef.value
  if (el) {
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('click', onClick)
  }
  ro?.disconnect()
  ro = undefined
  controls?.dispose()
  controls = undefined
  clearBoxes()
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
    renderer = undefined
  }
  scene = undefined
  camera = undefined
})
</script>

<style scoped>
.warehouse-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.warehouse-scene :deep(canvas) {
  display: block;
}
</style>
