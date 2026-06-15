// mes/frontend/src/pages/digitization/components/Billboard.tsx
import { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

const BIAOYU_TEX = '/lib/ThreeJs/images/biaoyu.png'

export default function Billboard() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const texture = useLoader(THREE.TextureLoader, BIAOYU_TEX)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping

  useFrame((_, delta) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshLambertMaterial
      if (mat.map) {
        mat.map.offset.x += delta * 0.05
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 150, -690]}
      name="滚动标语"
    >
      <planeGeometry args={[400, 20]} />
      <meshLambertMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
