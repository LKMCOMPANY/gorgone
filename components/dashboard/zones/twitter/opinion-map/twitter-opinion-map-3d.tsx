'use client'

/**
 * 3D Opinion Map Visualization
 * Uses React Three Fiber for WebGL rendering with instancing for performance
 */

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from 'three-stdlib'
import { extend } from '@react-three/fiber'

// Extend R3F with OrbitControls
extend({ OrbitControls })
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react'
import type { 
  EnrichedTwitterProjection, 
  TwitterOpinionCluster,
  OpinionSelectionState 
} from '@/types'
import { getOpinionClusterColor } from '@/types'
import * as THREE from 'three'

interface OpinionMap3DProps {
  projections: EnrichedTwitterProjection[]
  clusters: TwitterOpinionCluster[]
  selection: OpinionSelectionState
  onSelectCluster: (clusterId: number) => void
  onSelectTweet: (tweetId: string, clusterId: number) => void
  onHoverPoint: (tweetId: string | null) => void
}

/**
 * Point cloud renderer with instancing (60 FPS for 10K points)
 */
function PointCloud({
  projections,
  selection,
  onPointClick,
  onPointHover
}: {
  projections: EnrichedTwitterProjection[]
  selection: OpinionSelectionState
  onPointClick: (projection: EnrichedTwitterProjection) => void
  onPointHover: (projection: EnrichedTwitterProjection | null) => void
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { camera, raycaster, pointer, gl } = useThree()

  // Setup instances (run once or when projections change)
  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    const tempObject = new THREE.Object3D()
    const tempColor = new THREE.Color()

    projections.forEach((proj, i) => {
      // Position
      tempObject.position.set(proj.x, proj.y, proj.z)
      tempObject.scale.set(1, 1, 1)
      tempObject.updateMatrix()
      mesh.setMatrixAt(i, tempObject.matrix)

      // Color by cluster
      const color = getOpinionClusterColor(proj.cluster_id)
      tempColor.set(color)
      mesh.setColorAt(i, tempColor)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [projections])

  // Update selection/hover effects
  useEffect(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    const tempObject = new THREE.Object3D()
    const tempColor = new THREE.Color()

    projections.forEach((proj, i) => {
      // Get current matrix
      mesh.getMatrixAt(i, tempObject.matrix)
      tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale)

      // Determine scale based on state
      let scale = 1
      let color = getOpinionClusterColor(proj.cluster_id)

      if (selection.type === 'selected') {
        if (proj.tweet_id === selection.tweetId) {
          // Selected point: super-glow
          scale = 2.0
          color = '#ffffff'
        } else if (proj.cluster_id === selection.clusterId) {
          // Cluster points: light glow
          scale = 1.2
        } else {
          // Other points: fade out
          color = getOpinionClusterColor(proj.cluster_id)
          tempColor.set(color)
          tempColor.multiplyScalar(0.3) // Fade
          color = `#${tempColor.getHexString()}`
        }
      } else if (hoveredIndex === i) {
        // Hovered point
        scale = 1.5
      }

      tempObject.scale.set(scale, scale, scale)
      tempObject.updateMatrix()
      mesh.setMatrixAt(i, tempObject.matrix)

      tempColor.set(color)
      mesh.setColorAt(i, tempColor)
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [selection, hoveredIndex, projections])

  // Raycasting for interactions
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!meshRef.current) return

      // Update raycaster
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObject(meshRef.current)

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId!
        setHoveredIndex(instanceId)
        onPointHover(projections[instanceId])
      } else {
        setHoveredIndex(null)
        onPointHover(null)
      }
    }

    const handleClick = () => {
      if (hoveredIndex !== null) {
        onPointClick(projections[hoveredIndex])
      }
    }

    const canvas = gl.domElement
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [hoveredIndex, projections, camera, raycaster, pointer, gl, onPointClick, onPointHover])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, projections.length]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

/**
 * Cluster centroids as spheres
 */
function ClusterCentroids({
  clusters,
  selection,
  onCentroidClick
}: {
  clusters: TwitterOpinionCluster[]
  selection: OpinionSelectionState
  onCentroidClick: (clusterId: number) => void
}) {
  return (
    <>
      {clusters.map((cluster, i) => {
        const isSelected = selection.type === 'selected' && 
                          selection.clusterId === cluster.cluster_id

        return (
          <mesh
            key={cluster.cluster_id}
            position={[cluster.centroid_x, cluster.centroid_y, cluster.centroid_z]}
            onClick={() => onCentroidClick(cluster.cluster_id)}
          >
            <sphereGeometry args={[isSelected ? 3 : 2, 16, 16]} />
            <meshStandardMaterial
              color={getOpinionClusterColor(cluster.cluster_id)}
              opacity={isSelected ? 1 : 0.7}
              transparent
              emissive={getOpinionClusterColor(cluster.cluster_id)}
              emissiveIntensity={isSelected ? 0.5 : 0.2}
            />
          </mesh>
        )
      })}
    </>
  )
}

/**
 * Main 3D opinion map component
 */
export function TwitterOpinionMap3D({
  projections,
  clusters,
  selection,
  onSelectCluster,
  onSelectTweet,
  onHoverPoint
}: OpinionMap3DProps) {
  const [hoveredTweet, setHoveredTweet] = useState<EnrichedTwitterProjection | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  const handlePointClick = useCallback((projection: EnrichedTwitterProjection) => {
    onSelectTweet(projection.tweet_id, projection.cluster_id)
  }, [onSelectTweet])

  const handlePointHover = useCallback((projection: EnrichedTwitterProjection | null) => {
    setHoveredTweet(projection)
    onHoverPoint(projection?.tweet_id || null)
  }, [onHoverPoint])

  const handleCentroidClick = useCallback((clusterId: number) => {
    // Find first tweet in cluster
    const firstTweet = projections.find(p => p.cluster_id === clusterId)
    if (firstTweet) {
      onSelectTweet(firstTweet.tweet_id, clusterId)
    }
  }, [projections, onSelectTweet])

  const handleReset = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(50, 50, 100)
      cameraRef.current.lookAt(50, 50, 50)
    }
  }

  return (
    <Card className="relative h-[600px] overflow-hidden">
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Hover tooltip */}
      {hoveredTweet && (
        <div className="absolute top-4 left-4 z-10 max-w-xs">
          <div className="rounded-lg border bg-popover/95 backdrop-blur-sm p-3 shadow-lg">
            <p className="text-body-sm font-medium">@{hoveredTweet.author_username}</p>
            <p className="text-body-sm text-muted-foreground line-clamp-2">
              {hoveredTweet.text}
            </p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas camera={{ position: [50, 50, 100], fov: 50 }}>
        <orbitControls
          args={[camera, gl.domElement]}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.5}
          target={[50, 50, 50]}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        {/* Grid helper */}
        <gridHelper args={[100, 10, '#888888', '#444444']} position={[50, 0, 50]} />

        {/* Points */}
        <PointCloud
          projections={projections}
          selection={selection}
          onPointClick={handlePointClick}
          onPointHover={handlePointHover}
        />

        {/* Centroids */}
        <ClusterCentroids
          clusters={clusters}
          selection={selection}
          onCentroidClick={handleCentroidClick}
        />
      </Canvas>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="rounded-lg border bg-background/80 backdrop-blur-sm px-3 py-2">
          <p className="text-caption">
            {projections.length.toLocaleString()} tweets · {clusters.length} clusters
          </p>
        </div>
      </div>
    </Card>
  )
}

