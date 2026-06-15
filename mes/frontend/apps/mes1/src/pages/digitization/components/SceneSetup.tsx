// mes/frontend/src/pages/digitization/components/SceneSetup.tsx
import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const SKYBOX_BASE = '/lib/ThreeJs/images/skybox/'
const FACES = [
  '远山_RT.jpg', // right
  '远山_LF.jpg', // left
  '远山_UP.jpg', // top
  '远山_DN.jpg', // bottom
  '远山_FR.jpg', // front
  '远山_BK.jpg', // back
]

export default function SceneSetup() {
  const { scene } = useThree()
  const added = useRef(false)

  useEffect(() => {
    if (added.current) return
    added.current = true

    const loader = new THREE.CubeTextureLoader()
    loader.setPath(SKYBOX_BASE)
    const skyboxTexture = loader.load(FACES)
    scene.background = skyboxTexture
  }, [scene])

  return (
    <>
      <ambientLight intensity={0.8} color="#ffffff" />
      <directionalLight
        position={[0, 200, 0]}
        intensity={0.4}
        color="#ffffff"
      />
      <OrbitControls
        enableDamping
        dampingFactor={0.5}
        minDistance={50}
        maxDistance={1500}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 50, 0]}
      />
    </>
  )
}
