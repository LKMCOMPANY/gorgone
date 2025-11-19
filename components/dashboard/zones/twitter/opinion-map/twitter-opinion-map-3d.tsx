'use client'

/**
 * 3D Opinion Map Visualization - Ultra Modern & Elegant
 * Premium materials, smooth animations, and sophisticated interactions
 */

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Layers, ChevronRight, Download } from 'lucide-react'
import type { 
  EnrichedTwitterProjection, 
  TwitterOpinionCluster,
  OpinionSelectionState 
} from '@/types'
import { getOpinionClusterColor } from '@/types'
import { cn } from '@/lib/utils'
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
 * Premium Selection Halo with Double Pulsing Effect
 */
function SelectionHalo({ 
  position, 
  color, 
  size 
}: { 
  position: [number, number, number]
  color: string
  size: number 
}) {
  const innerMeshRef = useRef<THREE.Mesh>(null)
  const outerMeshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (innerMeshRef.current && outerMeshRef.current) {
      // Inner halo: faster pulsing
      const innerPulse = Math.sin(state.clock.elapsedTime * 2) * 0.5 + 0.5
      innerMeshRef.current.scale.setScalar(1 + innerPulse * 0.3)
      ;(innerMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + innerPulse * 0.3

      // Outer ring: slower, more subtle pulsing
      const outerPulse = Math.sin(state.clock.elapsedTime * 1.5) * 0.5 + 0.5
      outerMeshRef.current.scale.setScalar(1 + outerPulse * 0.2)
      ;(outerMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + outerPulse * 0.2
    }
  })

  return (
    <group position={position}>
      {/* Inner glow sphere */}
      <mesh ref={innerMeshRef}>
        <sphereGeometry args={[size * 2.5, 32, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.5} 
          depthWrite={false}
        />
      </mesh>
      {/* Outer ring effect */}
      <mesh ref={outerMeshRef}>
        <sphereGeometry args={[size * 3.5, 32, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.3} 
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

/**
 * Premium Texture Background
 */
function PremiumBackground() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // Gradient background
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.03)')
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    
    // Dot pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
    for (let x = 0; x < 512; x += 32) {
      for (let y = 0; y < 512; y += 32) {
        ctx.beginPath()
        ctx.arc(x + 16, y + 16, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    return new THREE.CanvasTexture(canvas)
  }, [])
  
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  
  return (
    <mesh position={[50, -0.1, 50]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[120, 120]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        opacity={0.6}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * Premium Tweet Point with Physical Material
 */
function TweetPoint({
  projection,
  color,
  isSelected,
  isClusterSelected,
  onClick,
  onHover,
}: {
  projection: EnrichedTwitterProjection
  color: string
  isSelected: boolean
  isClusterSelected: boolean
  onClick: () => void
  onHover: (hover: boolean) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const targetScale = useRef(new THREE.Vector3(1, 1, 1))
  const currentScale = useRef(new THREE.Vector3(1, 1, 1))

  // Calculate size based on engagement (logarithmic scale)
  const engagement = (projection.like_count || 0) + 
                    (projection.retweet_count || 0) * 2 + 
                    (projection.view_count || 0) * 0.01

  const baseSize = Math.max(0.4, Math.min(2.0, Math.log(engagement + 1) * 0.25))

  const position: [number, number, number] = [projection.x, projection.y, projection.z]

  // Smooth scale animation with lerp
  useFrame((state) => {
    if (meshRef.current) {
      if (isSelected) {
        // Pulsing animation for selected point
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.3
        targetScale.current.setScalar(1.8 + pulse)
      } else if (hovered) {
        targetScale.current.setScalar(1.5)
      } else if (isClusterSelected) {
        targetScale.current.setScalar(1.2)
      } else {
        targetScale.current.setScalar(1.0)
      }

      // Smooth lerp transition
      currentScale.current.lerp(targetScale.current, 0.15)
      meshRef.current.scale.copy(currentScale.current)
    }
  })

  const handlePointerOver = useCallback(() => {
    setHovered(true)
    onHover(true)
    document.body.style.cursor = 'pointer'
  }, [onHover])

  const handlePointerOut = useCallback(() => {
    setHovered(false)
    onHover(false)
    document.body.style.cursor = 'default'
  }, [onHover])

  return (
    <>
      {isSelected && <SelectionHalo position={position} color={color} size={baseSize} />}

      <mesh
        ref={meshRef}
        position={position}
        onClick={onClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[baseSize, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={
            isSelected ? 0.9 : 
            hovered ? 0.7 : 
            isClusterSelected ? 0.3 : 0.15
          }
          metalness={0.1}
          roughness={0.2}
          transmission={0.15}
          thickness={0.5}
          opacity={0.92}
          transparent
          clearcoat={isSelected ? 1 : hovered ? 0.9 : 0.8}
          clearcoatRoughness={0.2}
          reflectivity={isSelected ? 0.9 : hovered ? 0.7 : 0.5}
          ior={1.5}
          envMapIntensity={
            isSelected ? 1.5 : 
            hovered ? 1.3 : 
            isClusterSelected ? 1.0 : 0.8
          }
        />
      </mesh>
    </>
  )
}

/**
 * Auto-rotating camera with fixed center
 */
function AutoRotate({ 
  enabled, 
  controlsRef 
}: { 
  enabled: boolean
  controlsRef: React.RefObject<any>
}) {
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const centerPoint = useMemo(() => new THREE.Vector3(50, 50, 50), [])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const handleStart = () => {
      setIsUserInteracting(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }

    const handleEnd = () => {
      timeoutRef.current = setTimeout(() => {
        setIsUserInteracting(false)
      }, 3000)
    }

    controls.addEventListener('start', handleStart)
    controls.addEventListener('end', handleEnd)

    return () => {
      controls.removeEventListener('start', handleStart)
      controls.removeEventListener('end', handleEnd)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [controlsRef])

  useFrame((state) => {
    if (enabled && !isUserInteracting && controlsRef.current) {
      const controls = controlsRef.current
      const angle = state.clock.getElapsedTime() * 0.1
      const currentRadius = state.camera.position.distanceTo(centerPoint)
      const currentHeight = state.camera.position.y
      
      state.camera.position.x = Math.sin(angle) * currentRadius + centerPoint.x
      state.camera.position.z = Math.cos(angle) * currentRadius + centerPoint.z
      state.camera.position.y = currentHeight
      
      state.camera.lookAt(centerPoint)
      controls.target.copy(centerPoint)
      controls.update()
    }
  })

  return null
}

/**
 * Cluster centroids as glowing spheres
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
      {clusters.map((cluster) => {
        const isSelected = selection.type === 'selected' && 
                          selection.clusterId === cluster.cluster_id

        return (
          <mesh
            key={cluster.cluster_id}
            position={[cluster.centroid_x, cluster.centroid_y, cluster.centroid_z]}
            onClick={() => onCentroidClick(cluster.cluster_id)}
          >
            <sphereGeometry args={[isSelected ? 3.8 : 2.8, 32, 32]} />
            <meshPhysicalMaterial
              color={getOpinionClusterColor(cluster.cluster_id)}
              opacity={isSelected ? 0.9 : 0.6}
              transparent
              emissive={getOpinionClusterColor(cluster.cluster_id)}
              emissiveIntensity={isSelected ? 0.8 : 0.3}
              metalness={0.3}
              roughness={0.2}
              clearcoat={1}
              clearcoatRoughness={0.1}
              reflectivity={0.8}
            />
          </mesh>
        )
      })}
    </>
  )
}

/**
 * Scene with premium lighting
 */
function SceneContent({ 
  projections,
  clusters,
  selection,
  handlePointClick,
  handlePointHover,
  handleCentroidClick,
  controlsRef,
  autoRotate
}: any) {
  const { camera } = useThree()

  // Auto-fit camera with fixed center
  useEffect(() => {
    if (projections.length === 0) return

    const centerPoint = new THREE.Vector3(50, 50, 50)
    const positions = projections.map((p: any) => new THREE.Vector3(p.x, p.y, p.z))
    const box = new THREE.Box3().setFromPoints(positions)
    const size = box.getSize(new THREE.Vector3())
    
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.3
    
    camera.position.set(
      centerPoint.x + cameraDistance * 0.5,
      centerPoint.y + cameraDistance * 0.5,
      centerPoint.z + cameraDistance
    )
    camera.lookAt(centerPoint)
    camera.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.copy(centerPoint)
      controlsRef.current.update()
    }
  }, [projections, camera, controlsRef])

  return (
    <>
      <AutoRotate enabled={autoRotate} controlsRef={controlsRef} />
      
      {/* Premium Multi-Source Lighting */}
      <ambientLight intensity={0.7} />
      <pointLight position={[100, 100, 100]} intensity={0.9} color="#ffffff" />
      <pointLight position={[-50, -50, -50]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[0, 100, 0]} intensity={0.4} color="#60a5fa" />
      <pointLight position={[50, 0, 50]} intensity={0.3} color="#a78bfa" />

      {/* Premium Background */}
      <PremiumBackground />

      {/* Enhanced Grid */}
      <gridHelper 
        args={[100, 20]} 
        position={[50, 0, 50]}
        material-color="#888888"
        material-opacity={0.15}
        material-transparent
      />
      <gridHelper 
        args={[100, 10]} 
        position={[50, 0, 50]}
        material-color="#888888"
        material-opacity={0.08}
        material-transparent
      />

      {/* Points */}
      {projections.map((projection: any) => {
        // Outliers get a distinctive gray color
        const isOutlier = projection.cluster_id === -1
        const color = isOutlier 
          ? '#94a3b8' // Slate gray for outliers
          : getOpinionClusterColor(projection.cluster_id)
        
        const isSelected = selection.type === 'selected' && 
                          selection.tweetId === projection.tweet_id
        const isClusterSelected = !isOutlier && 
                                 selection.type === 'selected' && 
                                 selection.clusterId === projection.cluster_id

        return (
          <TweetPoint
            key={projection.tweet_id}
            projection={projection}
            color={color}
            isSelected={isSelected}
            isClusterSelected={isClusterSelected}
            onClick={() => handlePointClick(projection)}
            onHover={(hover: boolean) => handlePointHover(hover ? projection : null)}
          />
        )
      })}

      {/* Centroids */}
      <ClusterCentroids
        clusters={clusters}
        selection={selection}
        onCentroidClick={handleCentroidClick}
      />
    </>
  )
}

/**
 * Hover Tooltip - Modern Design
 */
function HoverTooltip({ 
  tweet 
}: { 
  tweet: EnrichedTwitterProjection 
}) {
  return (
    <div className="absolute top-4 left-4 z-10 max-w-sm animate-in fade-in-0 zoom-in-95 duration-200">
      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-4 shadow-2xl space-y-3">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {tweet.author_name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{tweet.author_name}</p>
            <p className="text-xs text-muted-foreground truncate">@{tweet.author_username}</p>
          </div>
        </div>

        {/* Tweet Text */}
        <p className="text-sm leading-relaxed line-clamp-3">{tweet.text}</p>

        {/* Engagement Stats with Icons */}
        <div className="flex items-center gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="text-xs font-medium">{tweet.like_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
            </svg>
            <span className="text-xs font-medium">{tweet.retweet_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            <span className="text-xs font-medium">{tweet.reply_count.toLocaleString()}</span>
          </div>
          {tweet.view_count > 0 && (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span className="text-xs font-medium">{tweet.view_count.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Main 3D Opinion Map Component
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
  const [autoRotate, setAutoRotate] = useState(false)
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false)
  const controlsRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointClick = useCallback((projection: EnrichedTwitterProjection) => {
    onSelectTweet(projection.tweet_id, projection.cluster_id)
  }, [onSelectTweet])

  const handlePointHover = useCallback((projection: EnrichedTwitterProjection | null) => {
    setHoveredTweet(projection)
    onHoverPoint(projection?.tweet_id || null)
  }, [onHoverPoint])

  const handleCentroidClick = useCallback((clusterId: number) => {
    onSelectCluster(clusterId)
  }, [onSelectCluster])

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return

    try {
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = canvas.width
      exportCanvas.height = canvas.height
      const ctx = exportCanvas.getContext('2d')
      if (!ctx) return

      const isDark = document.documentElement.classList.contains('dark')
      ctx.fillStyle = isDark ? '#0a0a0a' : '#ffffff'
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
      ctx.drawImage(canvas, 0, 0)

      exportCanvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `opinion-map-${new Date().toISOString().split('T')[0]}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (error) {
      console.error('[Opinion Map] Download failed:', error)
    }
  }

  return (
    <Card 
      ref={containerRef}
      className="relative h-[600px] overflow-hidden bg-gradient-to-br from-background via-background to-muted/10 border-border shadow-xl"
    >
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 bg-background/90 backdrop-blur-sm border-border shadow-lg hover:bg-background transition-all duration-[150ms]"
          onClick={handleReset}
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant={autoRotate ? "default" : "secondary"}
          size="icon"
          className="h-9 w-9 bg-background/90 backdrop-blur-sm border-border shadow-lg hover:bg-background transition-all duration-[150ms]"
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Auto-Rotation"
        >
          <svg 
            className="h-4 w-4" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 bg-background/90 backdrop-blur-sm border-border shadow-lg hover:bg-background transition-all duration-[150ms]"
          onClick={handleDownload}
          title="Download PNG"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend Panel */}
      <div
        className={cn(
          "absolute top-4 left-4 bg-background/90 backdrop-blur-md border border-border rounded-lg shadow-xl transition-all duration-300 z-10",
          isLegendCollapsed ? "w-11" : "w-64"
        )}
      >
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          {!isLegendCollapsed && (
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm truncate">Clusters</span>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {clusters.length}
              </Badge>
            </>
          )}
          <Button
            onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 flex-shrink-0 transition-transform duration-300",
              isLegendCollapsed ? "rotate-0" : "rotate-180"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={cn(
            "transition-all duration-300 overflow-hidden",
            isLegendCollapsed ? "max-h-0 opacity-0" : "max-h-[400px] opacity-100"
          )}
        >
          <div className="max-h-[340px] overflow-y-auto p-3 space-y-1.5">
            {clusters.map((cluster) => {
              const isSelected = selection.type === 'selected' && 
                               selection.clusterId === cluster.cluster_id
              
              return (
                <button
                  key={cluster.cluster_id}
                  className={cn(
                    "flex items-start gap-2 w-full text-left hover:bg-accent/50 rounded-lg p-2 transition-all duration-150",
                    isSelected && "bg-accent ring-2 ring-primary/20"
                  )}
                  onClick={() => onSelectCluster(cluster.cluster_id)}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 ring-2 ring-background shadow-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: getOpinionClusterColor(cluster.cluster_id) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate leading-tight">
                      {cluster.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {cluster.tweet_count} tweets
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredTweet && <HoverTooltip tweet={hoveredTweet} />}

      {/* 3D Canvas */}
      <Canvas 
        camera={{ position: [50, 50, 100], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true
        }}
        dpr={[1, 2]}
      >
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.5}
          minDistance={20}
          maxDistance={300}
          maxPolarAngle={Math.PI / 2}
          target={[50, 50, 50]}
        />

        <SceneContent
          projections={projections}
          clusters={clusters}
          selection={selection}
          handlePointClick={handlePointClick}
          handlePointHover={handlePointHover}
          handleCentroidClick={handleCentroidClick}
          controlsRef={controlsRef}
          autoRotate={autoRotate}
        />
      </Canvas>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="rounded-lg border border-border bg-background/90 backdrop-blur-sm px-3 py-2 shadow-lg">
          <p className="text-caption font-medium text-foreground">
            {projections.length.toLocaleString()} tweets · {clusters.length} clusters
          </p>
        </div>
      </div>

      {/* Info card */}
      <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-md border border-border rounded-lg shadow-lg px-3 py-2.5 max-w-[280px] opacity-70 hover:opacity-100 transition-opacity duration-300">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-foreground mb-2">3D Opinion Map</div>
          <div className="space-y-1 text-[10px] leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-1.5">
              <span className="text-foreground font-medium min-w-[24px]">Size:</span>
              <span>Tweet engagement</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-foreground font-medium min-w-[24px]">Color:</span>
              <span>Opinion cluster</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-foreground font-medium min-w-[24px]">Near:</span>
              <span>Similar opinions</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
