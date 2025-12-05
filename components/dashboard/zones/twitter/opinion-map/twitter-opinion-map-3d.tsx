'use client'

/**
 * 3D Opinion Map Visualization - Ultra Premium Edition
 * Professional-grade Three.js with sophisticated materials and lighting
 * Meets highest industry standards for data visualization
 */

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Layers, ChevronRight, Download } from 'lucide-react'
import { useTheme } from 'next-themes'
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
 * Easing functions for smooth animations
 */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

/**
 * Premium Selection Halo - Sophisticated dual-ring glow
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
      // Smooth sine wave pulsing with easing
      const time = state.clock.elapsedTime
      const innerPulse = easeInOutQuad(Math.sin(time * 2.5) * 0.5 + 0.5)
      const outerPulse = easeInOutQuad(Math.sin(time * 1.8) * 0.5 + 0.5)
      
      // Inner halo: energetic glow
      innerMeshRef.current.scale.setScalar(1 + innerPulse * 0.25)
      ;(innerMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + innerPulse * 0.25
      
      // Outer ring: subtle ambient glow
      outerMeshRef.current.scale.setScalar(1 + outerPulse * 0.15)
      ;(outerMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + outerPulse * 0.15
    }
  })

  return (
    <group position={position}>
      {/* Inner glow sphere */}
      <mesh ref={innerMeshRef}>
        <sphereGeometry args={[size * 2.2, 32, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.4} 
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Outer ambient ring */}
      <mesh ref={outerMeshRef}>
        <sphereGeometry args={[size * 3.2, 32, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.2} 
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/**
 * Premium Background with Subtle Gradient
 */
function PremiumBackground() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!
    
    // Ultra-subtle radial gradient
    const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512)
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.015)')
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.008)')
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.005)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1024, 1024)
    
    // Minimal dot pattern for depth
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'
    for (let x = 0; x < 1024; x += 48) {
      for (let y = 0; y < 1024; y += 48) {
        ctx.beginPath()
        ctx.arc(x + 24, y + 24, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    return new THREE.CanvasTexture(canvas)
  }, [])
  
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.5, 1.5)
  
  return (
    <mesh position={[50, -0.1, 50]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[140, 140]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * Premium Tweet Point - Sophisticated Material & Lighting
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
  const targetEmissive = useRef(0.15)
  const currentEmissive = useRef(0.15)

  // Logarithmic scale for engagement-based sizing
  const engagement = (projection.like_count || 0) + 
                    (projection.retweet_count || 0) * 2 + 
                    (projection.view_count || 0) * 0.01

  const baseSize = Math.max(0.5, Math.min(2.2, Math.log(engagement + 1) * 0.28))
  const position: [number, number, number] = [projection.x, projection.y, projection.z]

  // Smooth animations with professional easing
  useFrame((state) => {
    if (meshRef.current) {
      // Calculate target states
      if (isSelected) {
        // Energetic pulse for selection
        const pulse = Math.sin(state.clock.elapsedTime * 3.5) * 0.25
        targetScale.current.setScalar(1.9 + pulse)
        targetEmissive.current = 1.0
      } else if (hovered) {
        // Smooth grow on hover
        targetScale.current.setScalar(1.6)
        targetEmissive.current = 0.8
      } else if (isClusterSelected) {
        // Subtle highlight for cluster members
        targetScale.current.setScalar(1.15)
        targetEmissive.current = 0.35
      } else {
        // Default state
        targetScale.current.setScalar(1.0)
        targetEmissive.current = 0.15
      }

      // Smooth lerp transitions (professional easing)
      currentScale.current.lerp(targetScale.current, 0.12)
      currentEmissive.current += (targetEmissive.current - currentEmissive.current) * 0.12
      
      meshRef.current.scale.copy(currentScale.current)
      
      const material = meshRef.current.material as THREE.MeshPhysicalMaterial
      material.emissiveIntensity = currentEmissive.current
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
        <sphereGeometry args={[baseSize, 48, 48]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          metalness={0.08}
          roughness={0.15}
          transmission={0.12}
          thickness={0.6}
          opacity={0.94}
          transparent
          clearcoat={1}
          clearcoatRoughness={0.1}
          reflectivity={0.6}
          ior={1.45}
          envMapIntensity={1.2}
          side={THREE.FrontSide}
        />
      </mesh>
    </>
  )
}

/**
 * Auto-Rotate with Smooth Animation - Maintains Optimal Zoom
 */
function AutoRotate({ 
  enabled, 
  controlsRef,
  centerRef,
  optimalDistanceRef
}: { 
  enabled: boolean
  controlsRef: React.RefObject<any>
  centerRef: React.MutableRefObject<THREE.Vector3>
  optimalDistanceRef: React.MutableRefObject<number>
}) {
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const angleRef = useRef(0)

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

  // Initialize angle from current camera position when enabling
  const { camera } = useThree()
  
  useEffect(() => {
    if (enabled) {
      const center = centerRef.current
      angleRef.current = Math.atan2(
        camera.position.z - center.z,
        camera.position.x - center.x
      )
    }
  }, [enabled, camera])

  useFrame((state) => {
    if (enabled && !isUserInteracting && controlsRef.current) {
      const controls = controlsRef.current
      const center = centerRef.current
      
      // Use OPTIMAL distance (not current camera distance)
      // This prevents zoom drift during rotation
      const optimalRadius = optimalDistanceRef.current
      const currentHeight = state.camera.position.y
      
      // Ultra-smooth, elegant rotation - zen and contemplative
      angleRef.current += 0.002 // Slow rotation for premium, elegant feel
      
      state.camera.position.x = Math.sin(angleRef.current) * optimalRadius + center.x
      state.camera.position.z = Math.cos(angleRef.current) * optimalRadius + center.z
      state.camera.position.y = currentHeight
      
      state.camera.lookAt(center)
      controls.target.copy(center)
      controls.update()
    }
  })

  return null
}

/**
 * Cluster Centroids - Premium Glass Material
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
        const color = getOpinionClusterColor(cluster.cluster_id)

        return (
          <mesh
            key={cluster.cluster_id}
            position={[cluster.centroid_x, cluster.centroid_y, cluster.centroid_z]}
            onClick={() => onCentroidClick(cluster.cluster_id)}
          >
            <sphereGeometry args={[isSelected ? 4.2 : 3.0, 64, 64]} />
            <meshPhysicalMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isSelected ? 0.9 : 0.4}
              metalness={0.2}
              roughness={0.12}
              transmission={0.25}
              thickness={1.2}
              opacity={isSelected ? 0.92 : 0.7}
              transparent
              clearcoat={1}
              clearcoatRoughness={0.08}
              reflectivity={0.9}
              ior={1.5}
              envMapIntensity={1.5}
            />
          </mesh>
        )
      })}
    </>
  )
}

/**
 * Camera Auto-Fit - Professional Viewport Management
 * Calculates optimal zoom to fit all points with minimal padding
 */
function CameraAutoFit({ 
  projections, 
  controlsRef,
  resetTrigger,
  centerRef,
  optimalDistanceRef
}: { 
  projections: EnrichedTwitterProjection[]
  controlsRef: React.MutableRefObject<any>
  resetTrigger: number
  centerRef: React.MutableRefObject<THREE.Vector3>
  optimalDistanceRef: React.MutableRefObject<number>
}) {
  const { camera } = useThree()
  const hasInitialized = useRef(false)

  const fitToView = useCallback(() => {
    if (projections.length === 0) return
    if (!controlsRef.current) return

    // Calculate real bounding box
    const positions = projections.map((p: any) => new THREE.Vector3(p.x, p.y, p.z))
    const box = new THREE.Box3().setFromPoints(positions)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    
    // IMPORTANT: Update center FIRST
    centerRef.current.copy(center)
    
    // Calculate optimal distance with minimal padding
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    
    // Ultra-tight framing: 0.75 for MAXIMUM zoom
    const padding = 0.75
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * padding
    
    // Elegant 45° viewing angle for positioning
    const angle = Math.PI / 4.5
    const horizontalDistance = distance * 0.75
    const position = new THREE.Vector3(
      center.x + Math.cos(angle) * horizontalDistance,
      center.y + distance * 0.65,
      center.z + Math.sin(angle) * horizontalDistance
    )
    
    // STORE optimal distance (actual distance from camera to center)
    const actualDistance = position.distanceTo(center)
    optimalDistanceRef.current = actualDistance
    
    // Apply position
    camera.position.copy(position)
    camera.lookAt(center)
    camera.updateProjectionMatrix()

    // Update controls target
    controlsRef.current.target.copy(center)
    controlsRef.current.update()
  }, [projections, camera, controlsRef, centerRef, optimalDistanceRef])

  // Auto-fit on first frames when controls are ready
  useFrame(() => {
    if (!hasInitialized.current && controlsRef.current && projections.length > 0) {
      fitToView()
      hasInitialized.current = true
    }
  })

  // Re-fit when projections change
  useEffect(() => {
    hasInitialized.current = false
  }, [projections])

  // Re-fit when reset button clicked
  useEffect(() => {
    if (resetTrigger > 0) {
      fitToView()
    }
  }, [resetTrigger, fitToView])

  return null
}

/**
 * Scene Content - Premium Lighting Setup
 */
function SceneContent({ 
  projections,
  clusters,
  selection,
  handlePointClick,
  handlePointHover,
  handleCentroidClick,
  controlsRef,
  autoRotate,
  resetTrigger,
  centerRef,
  optimalDistanceRef,
  theme
}: any) {
  // Grid configuration based on theme
  const isDark = theme === 'dark'
  const gridColor = isDark ? '#9ca3af' : '#6b7280'
  const gridOpacityMain = isDark ? 0.3 : 0.18
  const gridOpacitySecondary = isDark ? 0.15 : 0.09
  
  // Axes use same subtle appearance as secondary grid
  const axisColor = gridColor
  const axisOpacity = gridOpacitySecondary

  return (
    <>
      <CameraAutoFit 
        projections={projections} 
        controlsRef={controlsRef}
        resetTrigger={resetTrigger}
        centerRef={centerRef}
        optimalDistanceRef={optimalDistanceRef}
      />
      <AutoRotate 
        enabled={autoRotate} 
        controlsRef={controlsRef}
        centerRef={centerRef}
        optimalDistanceRef={optimalDistanceRef}
      />
      
      {/* Premium Multi-Layer Lighting System */}
      <ambientLight intensity={0.65} />
      
      {/* Key light - primary illumination */}
      <pointLight 
        position={[100, 120, 100]} 
        intensity={1.1} 
        color="#ffffff" 
        distance={400}
        decay={1.8}
      />
      
      {/* Fill light - softer from opposite */}
      <pointLight 
        position={[-60, -40, -60]} 
        intensity={0.4} 
        color="#8b5cf6" 
        distance={300}
        decay={2}
      />
      
      {/* Rim light - top accent */}
      <pointLight 
        position={[0, 140, 0]} 
        intensity={0.35} 
        color="#60a5fa" 
        distance={350}
        decay={2}
      />
      
      {/* Back light - subtle depth */}
      <pointLight 
        position={[60, 20, 60]} 
        intensity={0.25} 
        color="#a78bfa" 
        distance={280}
        decay={2.2}
      />

      {/* Hemisphere light for natural ambient */}
      <hemisphereLight 
        color="#ffffff" 
        groundColor="#6366f1" 
        intensity={0.3} 
      />

      {/* Premium Background */}
      <PremiumBackground />

      {/* Grid - Elegant Reference Lines (Theme-Adaptive) */}
      <gridHelper 
        args={[100, 25]} 
        position={[50, 0, 50]}
        material-color={gridColor}
        material-opacity={gridOpacityMain}
        material-transparent
      />
      <gridHelper 
        args={[100, 10]} 
        position={[50, 0, 50]}
        material-color={gridColor}
        material-opacity={gridOpacitySecondary}
        material-transparent
      />

      {/* 3D Axes - Ultra Subtle (Same as Grid) */}
      <group position={[0, 0, 0]}>
        <primitive 
          object={(() => {
            const helper = new THREE.ArrowHelper(
              new THREE.Vector3(1, 0, 0),
              new THREE.Vector3(0, 0, 0),
              110,
              new THREE.Color(axisColor).getHex(),
              8,
              4
            )
            const lineMaterial = helper.line.material as THREE.LineBasicMaterial
            const coneMaterial = helper.cone.material as THREE.MeshBasicMaterial
            lineMaterial.opacity = axisOpacity
            lineMaterial.transparent = true
            coneMaterial.opacity = axisOpacity
            coneMaterial.transparent = true
            return helper
          })()}
          dispose={null}
        />
        <primitive 
          object={(() => {
            const helper = new THREE.ArrowHelper(
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(0, 0, 0),
              110,
              new THREE.Color(axisColor).getHex(),
              8,
              4
            )
            const lineMaterial = helper.line.material as THREE.LineBasicMaterial
            const coneMaterial = helper.cone.material as THREE.MeshBasicMaterial
            lineMaterial.opacity = axisOpacity
            lineMaterial.transparent = true
            coneMaterial.opacity = axisOpacity
            coneMaterial.transparent = true
            return helper
          })()}
          dispose={null}
        />
        <primitive 
          object={(() => {
            const helper = new THREE.ArrowHelper(
              new THREE.Vector3(0, 0, 1),
              new THREE.Vector3(0, 0, 0),
              110,
              new THREE.Color(axisColor).getHex(),
              8,
              4
            )
            const lineMaterial = helper.line.material as THREE.LineBasicMaterial
            const coneMaterial = helper.cone.material as THREE.MeshBasicMaterial
            lineMaterial.opacity = axisOpacity
            lineMaterial.transparent = true
            coneMaterial.opacity = axisOpacity
            coneMaterial.transparent = true
            return helper
          })()}
          dispose={null}
        />
      </group>

      {/* Tweet Points with Premium Materials */}
      {projections.map((projection: any) => {
        const isOutlier = projection.cluster_id === -1
        const color = isOutlier 
          ? '#94a3b8'
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

      {/* Cluster Centroids */}
      <ClusterCentroids
        clusters={clusters}
        selection={selection}
        onCentroidClick={handleCentroidClick}
      />
    </>
  )
}

/**
 * Hover Tooltip - Elegant Design
 */
function HoverTooltip({ 
  tweet 
}: { 
  tweet: EnrichedTwitterProjection 
}) {
  return (
    <div className="absolute top-4 left-4 z-10 max-w-sm animate-in fade-in-0 slide-in-from-left-2 duration-200">
      <div className="rounded-xl border border-border/60 bg-card/98 backdrop-blur-xl p-4 shadow-2xl space-y-3">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-border/50">
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
        <p className="text-sm leading-relaxed line-clamp-3 text-foreground/90">{tweet.text}</p>

        {/* Engagement Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <svg className="size-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span className="text-xs font-medium">{tweet.like_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="size-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
            </svg>
            <span className="text-xs font-medium">{tweet.retweet_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="size-3.5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
            </svg>
            <span className="text-xs font-medium">{tweet.reply_count.toLocaleString()}</span>
          </div>
          {tweet.view_count > 0 && (
            <div className="flex items-center gap-1.5">
              <svg className="size-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
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
 * Main 3D Opinion Map Component - Premium Edition
 */
export function TwitterOpinionMap3D({
  projections,
  clusters,
  selection,
  onSelectCluster,
  onSelectTweet,
  onHoverPoint
}: OpinionMap3DProps) {
  const { theme } = useTheme()
  const [hoveredTweet, setHoveredTweet] = useState<EnrichedTwitterProjection | null>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)
  const controlsRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Refs for optimal camera position (updated by CameraAutoFit)
  const centerRef = useRef<THREE.Vector3>(new THREE.Vector3(50, 50, 50))
  const optimalDistanceRef = useRef<number>(100)

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

  // Trigger fit-to-view
  const handleReset = useCallback(() => {
    setResetTrigger(prev => prev + 1)
  }, [])

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
      className="relative h-[600px] overflow-hidden bg-gradient-to-br from-background via-background to-muted/5 border-border shadow-xl"
    >
      {/* Controls - Elegant Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 bg-background/95 backdrop-blur-md border-border/60 shadow-lg hover:bg-background hover:shadow-xl hover:scale-105 transition-all duration-[var(--transition-fast)]"
          onClick={handleReset}
          title="Fit to View"
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          variant={autoRotate ? "default" : "secondary"}
          size="icon"
          className="h-9 w-9 bg-background/95 backdrop-blur-md border-border/60 shadow-lg hover:bg-background hover:shadow-xl hover:scale-105 transition-all duration-[var(--transition-fast)]"
          onClick={() => setAutoRotate(!autoRotate)}
          title="Auto-Rotation"
        >
          <svg 
            className="size-4" 
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
          className="h-9 w-9 bg-background/95 backdrop-blur-md border-border/60 shadow-lg hover:bg-background hover:shadow-xl hover:scale-105 transition-all duration-[var(--transition-fast)]"
          onClick={handleDownload}
          title="Export PNG"
        >
          <Download className="size-4" />
        </Button>
      </div>

      {/* Legend Panel - Minimal & Elegant */}
      <div
        className={cn(
          "absolute top-4 left-4 bg-background/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl transition-all duration-300 z-10",
          isLegendCollapsed ? "w-11" : "w-64"
        )}
      >
        <div className="p-3 border-b border-border/50 flex items-center justify-between gap-2">
          {!isLegendCollapsed && (
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Layers className="size-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm truncate">Clusters</span>
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0 border-border/60">
                {clusters.length}
              </Badge>
            </>
          )}
          <Button
            onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
            variant="ghost"
            size="icon"
            className={cn(
              "size-7 flex-shrink-0 transition-transform duration-300 hover:bg-muted/50",
              isLegendCollapsed ? "rotate-0" : "rotate-180"
            )}
          >
            <ChevronRight className="size-4" />
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
                    "flex items-start gap-2.5 w-full text-left hover:bg-muted/50 rounded-lg p-2.5 transition-all duration-[var(--transition-fast)]",
                    isSelected && "bg-primary/8 ring-2 ring-primary/20 shadow-sm"
                  )}
                  onClick={() => onSelectCluster(cluster.cluster_id)}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 ring-2 ring-background/80 shadow-md transition-all duration-[var(--transition-fast)] hover:scale-125 hover:shadow-lg"
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

      {/* Premium 3D Canvas */}
      <Canvas 
        camera={{ position: [50, 50, 100], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0
        }}
        dpr={[1, 2]}
        shadows
      >
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.55}
          zoomSpeed={0.9}
          panSpeed={0.55}
          minDistance={15}
          maxDistance={350}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 8}
          makeDefault
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
          resetTrigger={resetTrigger}
          centerRef={centerRef}
          optimalDistanceRef={optimalDistanceRef}
          theme={theme}
        />
      </Canvas>

      {/* Stats Overlay - Minimal */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="rounded-lg border border-border/60 bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
          <p className="text-xs font-medium text-foreground">
            {projections.length.toLocaleString()} tweets · {clusters.length} clusters
          </p>
        </div>
      </div>

      {/* Info Card - Subtle & Elegant */}
      <div className="absolute bottom-4 right-4 bg-background/85 backdrop-blur-xl border border-border/60 rounded-xl shadow-xl px-3 py-2.5 max-w-[280px] opacity-60 hover:opacity-100 transition-all duration-300">
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
