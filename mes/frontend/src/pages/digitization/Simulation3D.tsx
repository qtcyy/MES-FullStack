import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Stats } from '@react-three/drei'

// ---------------------------------------------------------------------------
// Warehouse scene
// ---------------------------------------------------------------------------
function WarehouseScene() {
  const shelfPositions: [number, number, number][] = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      shelfPositions.push([row * 5 - 10, 1.5, col * 3 - 10])
    }
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-10, 5, -5]} intensity={0.4} />

      {/* Floor grid */}
      <Grid args={[50, 50]} cellSize={1} cellThickness={0.6} cellColor="#6a6a8a" sectionSize={5} sectionThickness={1.2} sectionColor="#9a9abf" />

      {/* Shelf rows */}
      {shelfPositions.map((pos, i) => {
        const row = Math.floor(i / 8)
        return (
          <mesh key={i} position={pos} castShadow receiveShadow>
            <boxGeometry args={[2, 3, 2]} />
            <meshStandardMaterial
              color={row % 2 === 0 ? '#4a90d9' : '#67c23a'}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
        )
      })}

      {/* Decorative boxes on top of first row shelves */}
      {[0, 2, 4, 6].map((col) => {
        const [x, , z] = shelfPositions[col]
        return (
          <mesh key={`top-${col}`} position={[x, 4.5, z]} castShadow>
            <boxGeometry args={[1.2, 0.8, 1.2]} />
            <meshStandardMaterial color="#f76707" roughness={0.5} />
          </mesh>
        )
      })}

      {/* Some small items on the floor */}
      {[0, 2, 4, 6].map((i) => (
        <mesh key={`item-${i}`} position={[-10 + i * 3, 0.25, 8]} receiveShadow>
          <boxGeometry args={[0.8, 0.5, 1.2]} />
          <meshStandardMaterial color="#f59f00" roughness={0.6} />
        </mesh>
      ))}

      <OrbitControls enableDamping />
    </>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Simulation3D() {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 150px)', background: '#1a1a2e' }}>
      <Canvas
        camera={{ position: [15, 15, 15], fov: 60 }}
        shadows
        gl={{ antialias: true }}
      >
        <WarehouseScene />
        <Stats />
      </Canvas>
    </div>
  )
}
