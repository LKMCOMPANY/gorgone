# Opinion Map V2 - Final Architecture (Validated)

**Date**: November 18, 2025  
**Status**: ✅ Ready for Implementation  
**Validated By**: Stakeholder

---

## Executive Summary

Cette architecture finale intègre toutes les décisions validées pour une **opinion map 3D performante, élégante et simple**.

### Décisions Clés

✅ **Embedding on-demand** : Vectoriser uniquement les tweets analysés (cache intelligent)  
✅ **Bucketing stratifié** : Échantillonnage équilibré temporellement  
✅ **Une seule session active** : Pas de versions multiples (simplicité)  
✅ **Graph temporel** : Au-dessus de la carto pour voir l'évolution  
✅ **3D comme V1** : Même rendu mais optimisé (instancing)  
✅ **Slider horizontal** : Pas de scroll, carousel de tweets  
✅ **Composant réutilisé** : Même TweetCard que le feed  
✅ **Animations élégantes** : Transitions fluides 150-250ms  
✅ **État non-bloquant** : Ancienne carto visible pendant génération

---

## UX/UI Final Design

### Layout Complet

```
┌──────────────────────────────────────────────────────────────────────┐
│  📍 HEADER : Zone Name > Analysis > Opinion Map                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  🎛️ CONTROLS                                                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Time Period:                                                   │ │
│  │ [Last 7 days] [Last 30 days] [Custom Range ▼]                │ │
│  │                                                                │ │
│  │ Sample Size: [10,000 tweets ▼]                               │ │
│  │                                                                │ │
│  │ [✨ Generate Opinion Map]                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  {if generating}                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ⏳ Generating new opinion map... 67%                          │ │
│  │ [████████████░░░░░░] Phase 3/4: Clustering...        [Cancel]│ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┬────────────────────────────┐
│  GAUCHE (75%)                           │  DROITE (25%)              │
│                                         │                            │
│  ┌─────────────────────────────────┐   │  ┌──────────────────────┐ │
│  │  🌐 CARTO 3D (600px height)     │   │  │ [Clusters] [Tweets]  │ │
│  │                                 │   │  └──────────────────────┘ │
│  │  • 10K points (instanced)       │   │                            │
│  │  • Color-coded by cluster       │   │  ONGLET 1: CLUSTERS       │
│  │  • Orbit controls               │   │  ┌──────────────────────┐ │
│  │  • Cluster centroids (spheres)  │   │  │ 🔵 Tech Innovation   │ │
│  │                                 │   │  │    2,145 tweets (21%)│ │
│  │  INTERACTIONS:                  │   │  │    Keywords:         │ │
│  │  ─────────────                  │   │  │    • AI, GPT, ML...  │ │
│  │  Hover cluster:                 │   │  │    "Discourse foc..."│ │
│  │  → All points in cluster glow   │   │  │                      │ │
│  │  → Tooltip: label + count       │   │  │ 🟢 Climate Concern   │ │
│  │                                 │   │  │    1,823 tweets (18%)│ │
│  │  Hover point:                   │   │  │    [SELECTED]        │ │
│  │  → Point pulses                 │   │  │    • climate, urgent │ │
│  │  → Tooltip: @user preview       │   │  │                      │ │
│  │                                 │   │  │ 🟡 Political Debate  │ │
│  │  Click point:                   │   │  │    1,456 tweets (15%)│ │
│  │  → Select cluster + tweet       │   │  └──────────────────────┘ │
│  │  → Point super-glow             │   │                            │
│  │  → Cluster points glow          │   │  OU                        │
│  │  → Switch to Tweets tab         │   │                            │
│  │  → Slider goes to tweet         │   │  ONGLET 2: TWEETS         │
│  │                                 │   │  ┌──────────────────────┐ │
│  │  Click centroid:                │   │  │ [Climate Concern]    │ │
│  │  → Select cluster only          │   │  │ 1,823 tweets         │ │
│  └─────────────────────────────────┘   │  │                      │ │
│                                         │  │ ◀ [1 / 1,823] ▶     │ │
│  ┌─────────────────────────────────┐   │  │                      │ │
│  │  📈 GRAPH ÉVOLUTION (300px)     │   │  │ ┌────────────────┐ │ │
│  │                                 │   │  │ │ 🐦 Tweet Card  │ │ │
│  │  [Area Chart - Stacked]         │   │  │ │ (from feed)    │ │ │
│  │  ────────────────────           │   │  │ │                │ │ │
│  │  │╱╲ ╱╲   ╱╲                    │   │  │ │ • Avatar       │ │ │
│  │  │  ╲╱ ╲╱     ╲                 │   │  │ │ • @username    │ │ │
│  │  │────────────────────          │   │  │ │ • Tweet text   │ │ │
│  │  Nov 1  Nov 15  Nov 30          │   │  │ │ • Engagement   │ │ │
│  │                                 │   │  │ │ • Media        │ │ │
│  │  Legend:                        │   │  │ │                │ │ │
│  │  🔵 Tech Innovation             │   │  │ │ [HIGHLIGHTED]  │ │ │
│  │  🟢 Climate Concern [SELECTED]  │   │  │ └────────────────┘ │ │
│  │  🟡 Political Debate            │   │  │                      │ │
│  │                                 │   │  │ [No scroll, slider] │ │
│  │  INTERACTIONS:                  │   │  └──────────────────────┘ │
│  │  ─────────────                  │   │                            │
│  │  Hover curve:                   │   │  INTERACTIONS:            │
│  │  → Highlight cluster in 3D      │   │  ─────────────            │
│  │  → Show tooltip                 │   │  Slider next/prev:        │
│  │                                 │   │  → Hover point in 3D      │
│  │  Click curve:                   │   │  → Load tweet             │
│  │  → Select cluster               │   │                            │
│  │  → Switch to Tweets tab         │   │  Click card:              │
│  └─────────────────────────────────┘   │  → Zoom 3D to point       │
│                                         │  → Point super-glow       │
└─────────────────────────────────────────┴────────────────────────────┘
```

---

## État de Sélection (Simplifié)

### Un Seul État Possible

```typescript
type SelectionState = 
  | { type: 'none' }
  | { 
      type: 'selected', 
      tweetId: string, 
      clusterId: number 
    }
```

**Logique** :
- Clic sur un **point** → Sélectionne le tweet + son cluster automatiquement
- Clic sur un **centroid** → Sélectionne le premier tweet du cluster
- Clic sur **courbe graph** → Sélectionne le premier tweet du cluster
- **Pas de multi-sélection** → Simple et clair

### Effets Visuels par État

**État 'none'** :
```
3D:
- Tous les points visibles (opacité normale)
- Pas de glow
- Pas de centroid highlighted

Graph:
- Toutes les courbes visibles normalement

Sidebar:
- Onglet Clusters : Liste complète
- Onglet Tweets : Message "Select a cluster"
```

**État 'selected'** :
```
3D:
- Point sélectionné : Super-glow (pulsation forte, taille 2x)
- Autres points du même cluster : Glow léger
- Points autres clusters : Opacity 0.3 (fade out)
- Centroid du cluster : Highlighted

Graph:
- Courbe du cluster sélectionné : Stroke width ++, opacité 1
- Autres courbes : Opacity 0.5

Sidebar:
- Onglet Clusters : Cluster sélectionné highlighted
- Onglet Tweets : Auto-switch + slider au tweet sélectionné
```

---

## Interactions Détaillées

### 1. Hover sur la Carto 3D

#### Hover sur Centroid de Cluster
```typescript
onCentroidHover(clusterId: number) {
  // Visual feedback
  - Centroid scale x1.2 (transition 150ms)
  - Tooltip appears: "Tech Innovation (2,145 tweets)"
  - All points in cluster: opacity 1, light glow
  - Other points: opacity 0.6
  
  // No sidebar change
  // No graph change
}

onCentroidLeave() {
  // Reset to normal state
  - Centroid scale x1
  - Hide tooltip
  - Reset opacities
}
```

#### Hover sur Point Individuel
```typescript
onPointHover(tweetId: string) {
  // Visual feedback
  - Point scale x1.5 (transition 150ms)
  - Point pulse animation (subtle)
  - Tooltip: "@username: Tweet preview (max 80 chars)..."
  
  // No sidebar change
  // No graph change
}

onPointLeave() {
  // Reset
  - Point scale x1
  - Stop pulse
  - Hide tooltip
}
```

### 2. Click sur la Carto 3D

#### Click sur Point
```typescript
async onPointClick(tweetId: string, clusterId: number) {
  // 1. Update selection state
  setSelection({ type: 'selected', tweetId, clusterId })
  
  // 2. Visual effects (parallel)
  await Promise.all([
    // 3D effects
    animate3DSelection({
      selectedPoint: tweetId,
      selectedCluster: clusterId,
      duration: 250
    }),
    
    // Sidebar
    switchToTweetsTab(),
    
    // Slider
    navigateSliderToTweet(tweetId)
  ])
}

function animate3DSelection(params) {
  // Selected point
  - Super-glow effect (scale 2x, bright color, pulsation)
  - Camera subtle zoom towards point (orbit animation)
  
  // Cluster points
  - Light glow (scale 1.2x, soft glow)
  - Opacity 1
  
  // Other points
  - Fade out (opacity 0.3)
  - No glow
  
  // Centroid
  - Highlight (stroke color = cluster color)
  
  // Duration: 250ms cubic-bezier
}
```

#### Click sur Centroid
```typescript
async onCentroidClick(clusterId: number) {
  // Select first tweet of cluster (sorted by engagement desc)
  const firstTweet = getClusterTweets(clusterId)[0]
  
  await onPointClick(firstTweet.id, clusterId)
}
```

### 3. Hover sur Graph

```typescript
onCurveHover(clusterId: number) {
  // Graph
  - Curve stroke-width x1.5
  - Curve opacity 1
  - Other curves opacity 0.4
  - Tooltip: "Tech Innovation: 156 tweets on Nov 15"
  
  // 3D
  - Cluster points glow
  - Other points fade
  - Centroid highlighted
  
  // No sidebar change
}

onCurveLeave() {
  // Reset to selection state or normal
}
```

### 4. Click sur Graph

```typescript
async onCurveClick(clusterId: number) {
  const firstTweet = getClusterTweets(clusterId)[0]
  
  await onPointClick(firstTweet.id, clusterId)
}
```

### 5. Slider Horizontal (Onglet Tweets)

```typescript
// Component structure
<div className="space-y-4">
  {/* Header */}
  <div className="flex items-center justify-between">
    <Badge variant="secondary">
      {selectedCluster.label}
    </Badge>
    <span className="text-sm text-muted-foreground">
      Tweet {currentIndex + 1} of {filteredTweets.length}
    </span>
  </div>
  
  {/* Slider Controls */}
  <div className="flex items-center gap-2">
    <Button
      variant="ghost"
      size="icon"
      onClick={handlePrevious}
      disabled={currentIndex === 0}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
    
    <div className="flex-1">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1">
        {Array.from({ length: Math.min(totalTweets, 10) }).map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-1 rounded-full transition-all",
              i === Math.floor(currentIndex / (totalTweets / 10))
                ? "w-8 bg-primary"
                : "w-1 bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
    
    <Button
      variant="ghost"
      size="icon"
      onClick={handleNext}
      disabled={currentIndex === filteredTweets.length - 1}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
  
  {/* Tweet Card (réutilisé du feed) */}
  <TweetCard
    tweet={currentTweet}
    variant="compact" // Optionnel: version plus compacte
    onMediaClick={handleMediaClick}
    // Pas de engagement chart ici (garde interface simple)
  />
  
  {/* Cluster info */}
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <div 
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: getClusterColor(selectedCluster.cluster_id) }}
    />
    <span>Confidence: {(currentProjection.cluster_confidence * 100).toFixed(0)}%</span>
  </div>
</div>

// Handlers
function handleNext() {
  const nextIndex = currentIndex + 1
  if (nextIndex < filteredTweets.length) {
    setCurrentIndex(nextIndex)
    
    // Hover effect in 3D (pas de sélection)
    highlightPointIn3D(filteredTweets[nextIndex].tweet_id, 'hover')
  }
}

function handlePrevious() {
  const prevIndex = currentIndex - 1
  if (prevIndex >= 0) {
    setCurrentIndex(prevIndex)
    
    // Hover effect in 3D
    highlightPointIn3D(filteredTweets[prevIndex].tweet_id, 'hover')
  }
}

function highlightPointIn3D(tweetId: string, type: 'hover' | 'selected') {
  if (type === 'hover') {
    // Pulse temporaire
    - Point scale x1.3
    - Light glow
    - Duration: 300ms
  } else {
    // Sélection permanente
    - Point super-glow
    - Camera zoom
  }
}
```

**Préchargement** :
```typescript
// Load tweets on cluster selection
useEffect(() => {
  if (selection.type === 'selected') {
    const clusterTweets = getClusterTweets(selection.clusterId)
    
    // Preload next/prev 5 tweets
    const currentIdx = clusterTweets.findIndex(t => t.id === selection.tweetId)
    const preloadRange = clusterTweets.slice(
      Math.max(0, currentIdx - 5),
      Math.min(clusterTweets.length, currentIdx + 6)
    )
    
    // Preload full tweet data if needed
    preloadTweets(preloadRange)
  }
}, [selection])
```

---

## Performance 3D : Instancing Expliqué

### Le Problème (Approche Naïve)

**Sans instancing** : Chaque point = 1 mesh = 1 draw call
```typescript
// MAUVAIS : 10,000 draw calls
{tweets.map(tweet => (
  <mesh key={tweet.id} position={[tweet.x, tweet.y, tweet.z]}>
    <sphereGeometry args={[0.5, 16, 16]} />
    <meshStandardMaterial color={getColor(tweet.cluster_id)} />
  </mesh>
))}

// Résultat : 5-10 FPS (très lent)
```

### La Solution : Instanced Mesh

**Avec instancing** : 10,000 points = 1 mesh = 1 draw call
```typescript
// BON : 1 seul draw call pour tous les points
import { useRef, useMemo } from 'react'
import { InstancedMesh, Object3D, Color } from 'three'

function OpinionPointCloud({ projections, clusters }) {
  const meshRef = useRef<InstancedMesh>()
  const tempObject = useMemo(() => new Object3D(), [])
  const tempColor = useMemo(() => new Color(), [])
  
  // Setup instances (run once)
  useEffect(() => {
    if (!meshRef.current) return
    
    const mesh = meshRef.current
    
    // Set position + color for each instance
    projections.forEach((proj, i) => {
      // Position
      tempObject.position.set(proj.x, proj.y, proj.z)
      tempObject.updateMatrix()
      mesh.setMatrixAt(i, tempObject.matrix)
      
      // Color
      const color = getClusterColor(proj.cluster_id)
      tempColor.set(color)
      mesh.setColorAt(i, tempColor)
    })
    
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [projections])
  
  return (
    <instancedMesh 
      ref={meshRef}
      args={[undefined, undefined, projections.length]}
    >
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}

// Résultat : 60 FPS constant ✅
```

### Pourquoi C'est Performant

**1 draw call vs 10,000 draw calls** :
```
Sans instancing:
- CPU → GPU : 10,000 fois
- Overhead : ~16ms par frame
- FPS : 10-20

Avec instancing:
- CPU → GPU : 1 fois
- Overhead : ~0.5ms par frame
- FPS : 60 constant
```

**Mémoire GPU optimisée** :
```
Sans instancing:
- 10,000 geometries chargées
- ~200 MB VRAM

Avec instancing:
- 1 geometry partagée
- ~20 MB VRAM
```

### Interactions avec Instancing

**Problème** : Comment détecter hover/click sur instances ?

**Solution** : Raycasting
```typescript
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'

function OpinionMap3D({ projections }) {
  const { camera, raycaster, scene } = useThree()
  
  const handlePointerMove = (event: PointerEvent) => {
    // Convert mouse position to normalized device coordinates
    const mouse = new Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    )
    
    // Raycast
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(instancedMeshRef.current!)
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId!
      const hoveredTweet = projections[instanceId]
      
      onPointHover(hoveredTweet.tweet_id)
    } else {
      onPointLeave()
    }
  }
  
  return (
    <Canvas onPointerMove={handlePointerMove}>
      {/* ... */}
    </Canvas>
  )
}
```

### Highlight Dynamique avec Instancing

**Problème** : Comment changer la couleur/taille d'un point spécifique ?

**Solution** : Update d'une seule instance
```typescript
function highlightInstance(instanceId: number, type: 'hover' | 'selected') {
  const mesh = meshRef.current!
  const tempObject = new Object3D()
  const tempColor = new Color()
  
  // Get current matrix
  mesh.getMatrixAt(instanceId, tempObject.matrix)
  tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale)
  
  // Update scale
  if (type === 'hover') {
    tempObject.scale.setScalar(1.3)
  } else {
    tempObject.scale.setScalar(2.0)
  }
  
  tempObject.updateMatrix()
  mesh.setMatrixAt(instanceId, tempObject.matrix)
  
  // Update color
  tempColor.set(type === 'selected' ? '#ffffff' : '#ffff00')
  mesh.setColorAt(instanceId, tempColor)
  
  // Notify Three.js
  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor!.needsUpdate = true
}
```

### Best Practices Industrie

✅ **Use Instancing** pour > 100 objets identiques  
✅ **LOD (Level of Detail)** pour distances variables  
✅ **Frustum Culling** automatique avec Three.js  
✅ **Texture Atlasing** si textures variées  
✅ **Object Pooling** pour création/destruction dynamique

**Résultat** : Rendu 3D **fidèle** (10K points visibles) + **performant** (60 FPS)

---

## Architecture Base de Données (Simplifiée)

### Tables Nécessaires

**1. Réutilisation : `twitter_tweets.embedding`**
```sql
-- Already exists in V2 schema
ALTER TABLE twitter_tweets
ADD COLUMN IF NOT EXISTS embedding VECTOR(1536),
ADD COLUMN IF NOT EXISTS embedding_model TEXT,
ADD COLUMN IF NOT EXISTS embedding_created_at TIMESTAMPTZ;

-- Index for finding non-embedded tweets
CREATE INDEX IF NOT EXISTS idx_tweets_needs_embedding 
ON twitter_tweets (zone_id, twitter_created_at DESC)
WHERE embedding IS NULL;
```

**2. Nouvelle : `twitter_tweet_projections`**
```sql
CREATE TABLE twitter_tweet_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_db_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- "zone_xxx_2025-11-18T14:30:00Z"
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  z NUMERIC NOT NULL,
  cluster_id INTEGER NOT NULL,
  cluster_confidence NUMERIC CHECK (cluster_confidence >= 0 AND cluster_confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (tweet_db_id, session_id)
);

CREATE INDEX idx_projections_session ON twitter_tweet_projections (zone_id, session_id);
CREATE INDEX idx_projections_cluster ON twitter_tweet_projections (session_id, cluster_id);

-- Keep only active session per zone (auto-cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_projections()
RETURNS TRIGGER AS $$
BEGIN
  -- When new session completes, delete old sessions for this zone
  DELETE FROM twitter_tweet_projections
  WHERE zone_id = NEW.zone_id
    AND session_id != NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_projections
AFTER UPDATE OF status ON twitter_opinion_sessions
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION cleanup_old_projections();
```

**3. Nouvelle : `twitter_opinion_clusters`**
```sql
CREATE TABLE twitter_opinion_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  cluster_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  tweet_count INTEGER DEFAULT 0,
  centroid_x NUMERIC NOT NULL,
  centroid_y NUMERIC NOT NULL,
  centroid_z NUMERIC NOT NULL,
  avg_sentiment NUMERIC CHECK (avg_sentiment >= -1 AND avg_sentiment <= 1),
  coherence_score NUMERIC CHECK (coherence_score >= 0 AND coherence_score <= 1),
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (zone_id, session_id, cluster_id)
);

CREATE INDEX idx_clusters_session ON twitter_opinion_clusters (zone_id, session_id);
```

**4. Nouvelle : `twitter_opinion_sessions`**
```sql
CREATE TABLE twitter_opinion_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'vectorizing', 'reducing', 'clustering', 
    'labeling', 'completed', 'failed', 'cancelled'
  )),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_phase TEXT,
  phase_message TEXT,
  
  -- Configuration
  config JSONB DEFAULT '{}'::JSONB,
  
  -- Statistics
  total_tweets INTEGER,
  vectorized_tweets INTEGER DEFAULT 0,
  total_clusters INTEGER,
  outlier_count INTEGER,
  execution_time_ms INTEGER,
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_sessions_zone ON twitter_opinion_sessions (zone_id, created_at DESC);
CREATE INDEX idx_sessions_active ON twitter_opinion_sessions (status) 
WHERE status NOT IN ('completed', 'failed', 'cancelled');

-- Only one active session per zone
CREATE UNIQUE INDEX idx_one_active_session_per_zone 
ON twitter_opinion_sessions (zone_id)
WHERE status IN ('pending', 'vectorizing', 'reducing', 'clustering', 'labeling');
```

### Cleanup Automatique

**Stratégie** : Garder seulement la session active par zone
```sql
-- Trigger runs when new session completes
-- Deletes old projections + clusters for this zone

-- Result: Max storage = 1 session × 100 zones × 10MB = 1GB total
```

---

## Module Structure

```
/lib/data/twitter/opinion-map/
├── sampling.ts
│   ├── sampleTweetsStratified()
│   └── calculateBucketSize()
│
├── vectorization.ts
│   ├── ensureEmbeddings()          // Check cache, vectorize missing
│   ├── batchVectorize()            // OpenAI embedMany
│   └── getCachedEmbeddingStats()   // % already embedded
│
├── dimensionality.ts
│   ├── reducePCA()                 // 1536D → 20D
│   └── reduceUMAP3D()              // 1536D → 3D
│
├── clustering.ts
│   ├── clusterKMeans()             // K-means on 20D
│   └── autoDetectK()               // Optimal cluster count
│
├── labeling.ts
│   ├── generateClusterLabel()      // AI labeling
│   └── extractKeywords()           // Fallback
│
├── projections.ts
│   ├── getProjections()
│   ├── getProjectionsByCluster()
│   └── saveProjections()
│
├── clusters.ts
│   ├── getClusters()
│   ├── getClusterDetails()
│   └── saveClusters()
│
├── sessions.ts
│   ├── createSession()
│   ├── getActiveSession()
│   ├── updateSessionProgress()
│   └── completeSession()
│
├── time-series.ts
│   ├── generateTimeSeriesData()    // For evolution graph
│   └── calculateGranularity()      // Auto hour/day/week
│
└── index.ts

/app/api/twitter/opinion-map/
├── generate/
│   └── route.ts                     // POST - Start generation
├── status/
│   └── route.ts                     // GET - Session status
└── cancel/
    └── route.ts                     // POST - Cancel session

/app/api/webhooks/qstash/
└── opinion-map-worker/
    └── route.ts                     // Worker endpoint

/components/dashboard/zones/twitter/
├── opinion-map/
│   ├── twitter-opinion-map-view.tsx           // Main container
│   ├── twitter-opinion-map-controls.tsx       // Config panel
│   ├── twitter-opinion-map-3d.tsx             // 3D viz (R3F)
│   ├── twitter-opinion-evolution-chart.tsx    // Time series
│   ├── twitter-opinion-cluster-list.tsx       // Clusters tab
│   ├── twitter-opinion-tweet-slider.tsx       // Tweets slider
│   └── twitter-opinion-map-skeleton.tsx       // Loading
```

---

## API Endpoints

### POST /api/twitter/opinion-map/generate

**Request**:
```typescript
{
  zone_id: string
  start_date: string  // ISO 8601
  end_date: string    // ISO 8601
  sample_size: number // 10000
}
```

**Response**:
```typescript
{
  success: boolean
  session_id: string
  estimated_time_seconds: number
}
```

**Implementation**:
```typescript
export async function POST(request: Request) {
  const { zone_id, start_date, end_date, sample_size } = await request.json()
  
  // 1. Auth check
  const user = await getCurrentUser()
  if (!await canAccessZone(user, zone_id)) {
    return Response.json({ error: 'Access denied' }, { status: 403 })
  }
  
  // 2. Sample tweets (stratified bucketing)
  const samples = await sampleTweetsStratified({
    zoneId: zone_id,
    startDate: new Date(start_date),
    endDate: new Date(end_date),
    targetSize: sample_size
  })
  
  if (samples.length === 0) {
    return Response.json({ 
      error: 'No tweets in selected period' 
    }, { status: 400 })
  }
  
  // 3. Create session
  const sessionId = `zone_${zone_id}_${new Date().toISOString()}`
  
  await supabase.from('twitter_opinion_sessions').insert({
    zone_id,
    session_id: sessionId,
    status: 'pending',
    config: {
      start_date,
      end_date,
      sample_size,
      sampled_tweet_ids: samples.map(t => t.id),
      actual_sample_size: samples.length
    },
    total_tweets: samples.length,
    created_by: user.id
  })
  
  // 4. Schedule QStash worker
  await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/qstash/opinion-map-worker`,
    body: { session_id: sessionId },
    retries: 3
  })
  
  // 5. Return immediately
  return Response.json({
    success: true,
    session_id: sessionId,
    estimated_time_seconds: estimateTime(samples.length)
  })
}
```

### GET /api/twitter/opinion-map/status

**Query Params**: `?session_id=xxx`

**Response**:
```typescript
{
  success: boolean
  session: {
    session_id: string
    status: string
    progress: number
    phase_message: string
    total_tweets: number
    total_clusters: number
    error_message: string | null
    started_at: string
    completed_at: string | null
  }
  projections?: Projection[]  // If completed
  clusters?: OpinionCluster[]  // If completed
}
```

---

## Worker Implementation

### QStash Worker : /api/webhooks/qstash/opinion-map-worker

```typescript
export async function POST(request: Request) {
  const { session_id } = await request.json()
  
  // Load session
  const session = await getSession(session_id)
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 })
  }
  
  try {
    // Phase 0: Ensure embeddings exist
    await updateSessionStatus(session_id, 'vectorizing', 0, 'Checking embeddings...')
    await ensureEmbeddingsPhase(session)
    
    // Phase 1: PCA reduction
    await updateSessionStatus(session_id, 'reducing', 25, 'Running PCA...')
    const pca20D = await reducePCAPhase(session)
    
    // Phase 2: UMAP 3D projection
    await updateSessionStatus(session_id, 'reducing', 40, 'Running UMAP 3D...')
    const projections3D = await reduceUMAP3DPhase(session)
    
    // Phase 3: K-means clustering
    await updateSessionStatus(session_id, 'clustering', 60, 'Detecting clusters...')
    const clusterAssignments = await clusteringPhase(session, pca20D)
    
    // Phase 4: Save projections
    await updateSessionStatus(session_id, 'clustering', 70, 'Saving projections...')
    await saveProjections(session, projections3D, clusterAssignments)
    
    // Phase 5: AI labeling
    await updateSessionStatus(session_id, 'labeling', 80, 'Generating cluster labels...')
    await labelingPhase(session, clusterAssignments)
    
    // Complete
    await updateSessionStatus(session_id, 'completed', 100, 'Completed!')
    
    return Response.json({ success: true })
    
  } catch (error) {
    await updateSessionStatus(
      session_id, 
      'failed', 
      session.progress, 
      error.message
    )
    
    return Response.json({ 
      error: error.message 
    }, { status: 500 })
  }
}

// Phase implementations
async function ensureEmbeddingsPhase(session) {
  const tweetIds = session.config.sampled_tweet_ids
  
  // Get tweets
  const tweets = await supabase
    .from('twitter_tweets')
    .select('*')
    .in('id', tweetIds)
  
  // Filter non-embedded
  const needsEmbedding = tweets.filter(t => !t.embedding)
  
  if (needsEmbedding.length === 0) {
    console.log('All tweets already embedded (cache hit)')
    return
  }
  
  console.log(`Vectorizing ${needsEmbedding.length} new tweets`)
  
  // Batch vectorize (100 per call)
  const BATCH_SIZE = 100
  for (let i = 0; i < needsEmbedding.length; i += BATCH_SIZE) {
    const batch = needsEmbedding.slice(i, i + BATCH_SIZE)
    
    // Enrich content
    const contents = batch.map(t => enrichTweetContent(t))
    
    // OpenAI embedMany
    const result = await embedMany({
      model: 'openai/text-embedding-3-small',
      values: contents
    })
    
    // Save
    for (let j = 0; j < batch.length; j++) {
      await supabase
        .from('twitter_tweets')
        .update({
          embedding: result.embeddings[j],
          embedding_model: 'openai/text-embedding-3-small',
          embedding_created_at: new Date().toISOString()
        })
        .eq('id', batch[j].id)
    }
    
    // Update progress
    const progress = Math.floor((i / needsEmbedding.length) * 20)
    await updateSessionProgress(session.session_id, progress)
    
    // Small delay (rate limit protection)
    await sleep(2000)
  }
}

async function reducePCAPhase(session) {
  // Fetch embeddings
  const tweets = await supabase
    .from('twitter_tweets')
    .select('id, embedding')
    .in('id', session.config.sampled_tweet_ids)
  
  const embeddings = tweets.map(t => t.embedding)
  
  // PCA 1536D → 20D
  const pca20D = await reducePCA(embeddings, 20)
  
  return pca20D
}

async function reduceUMAP3DPhase(session) {
  const tweets = await supabase
    .from('twitter_tweets')
    .select('id, embedding')
    .in('id', session.config.sampled_tweet_ids)
  
  const embeddings = tweets.map(t => t.embedding)
  
  // UMAP 1536D → 3D
  const umap3D = await reduceUMAP3D(embeddings, {
    nNeighbors: 15,
    minDist: 0.1,
    spread: 1.0
  })
  
  // Normalize to 0-100 range
  const normalized = normalizeProjections(umap3D.projections, [0, 100])
  
  return normalized
}

async function clusteringPhase(session, pca20D) {
  // K-means on 20D space
  const result = await clusterKMeans(pca20D, {
    k: undefined, // auto-detect
    maxIterations: 100,
    tolerance: 1e-4
  })
  
  console.log(`Found ${result.clusterCount} clusters`)
  
  return result
}

async function labelingPhase(session, clusterResult) {
  const tweets = await supabase
    .from('twitter_tweets')
    .select('id, text, raw_data')
    .in('id', session.config.sampled_tweet_ids)
  
  // Group by cluster
  const clusterTweets = new Map()
  clusterResult.labels.forEach((clusterId, i) => {
    if (!clusterTweets.has(clusterId)) {
      clusterTweets.set(clusterId, [])
    }
    clusterTweets.get(clusterId).push(tweets[i].text)
  })
  
  // Label each cluster
  const clusters = []
  for (const [clusterId, texts] of clusterTweets) {
    const label = await generateClusterLabel(texts, clusterId)
    
    // Calculate centroid from projections
    const clusterProjections = session.projections.filter(p => p.cluster_id === clusterId)
    const centroid = {
      x: average(clusterProjections.map(p => p.x)),
      y: average(clusterProjections.map(p => p.y)),
      z: average(clusterProjections.map(p => p.z))
    }
    
    clusters.push({
      zone_id: session.zone_id,
      session_id: session.session_id,
      cluster_id: clusterId,
      label: label.label,
      keywords: label.keywords,
      tweet_count: texts.length,
      centroid_x: centroid.x,
      centroid_y: centroid.y,
      centroid_z: centroid.z,
      avg_sentiment: label.sentiment,
      coherence_score: label.confidence,
      reasoning: label.reasoning
    })
    
    // Update progress
    const progress = 80 + Math.floor((clusters.length / clusterTweets.size) * 15)
    await updateSessionProgress(session.session_id, progress)
  }
  
  // Save clusters
  await supabase.from('twitter_opinion_clusters').insert(clusters)
}
```

---

## Animations & Transitions

### Principes

✅ **Durée** : 150ms (rapide) à 250ms (standard)  
✅ **Easing** : `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design)  
✅ **Parallèle** : Animer plusieurs éléments en même temps  
✅ **Feedback** : Toujours indiquer visuellement l'action

### Exemples Concrets

**Click sur point 3D** :
```typescript
// Animation parallèle (250ms)
await Promise.all([
  // 3D camera
  animateCamera({
    from: currentPosition,
    to: pointPosition,
    duration: 250,
    easing: 'easeInOut'
  }),
  
  // Point scale
  animatePointScale({
    from: 1,
    to: 2,
    duration: 250,
    easing: 'easeOut'
  }),
  
  // Cluster fade
  animateClusterOpacity({
    selectedCluster: 1,
    otherClusters: 0.3,
    duration: 250
  }),
  
  // Sidebar tab switch
  animateSidebarSlide({
    from: 'clusters',
    to: 'tweets',
    duration: 250
  })
])
```

**Hover sur courbe graph** :
```typescript
// Animation rapide (150ms)
await animate({
  targets: {
    curveStrokeWidth: { from: 2, to: 3 },
    curveOpacity: { from: 0.8, to: 1 },
    otherCurvesOpacity: { from: 0.8, to: 0.4 },
    clusterGlow: { from: 0, to: 0.5 }
  },
  duration: 150,
  easing: 'easeOut'
})
```

**Slider next/prev** :
```typescript
// Animation slide (200ms)
await animate({
  targets: {
    cardTranslateX: { from: 0, to: -100 },
    cardOpacity: { from: 1, to: 0 }
  },
  duration: 200,
  easing: 'easeInOut',
  onComplete: () => {
    // Load new card
    setCurrentIndex(nextIndex)
    
    // Fade in
    animate({
      targets: {
        cardTranslateX: { from: 100, to: 0 },
        cardOpacity: { from: 0, to: 1 }
      },
      duration: 200
    })
  }
})
```

---

## Implementation Roadmap

### Week 1: Database + Sampling (5 days)
- [ ] Day 1: Create SQL migrations
- [ ] Day 2: Implement stratified sampling
- [ ] Day 3: Implement embedding cache check
- [ ] Day 4: Write tests
- [ ] Day 5: Document + review

### Week 2: Clustering Pipeline (5 days)
- [ ] Day 1: Implement vectorization module
- [ ] Day 2: Implement PCA + UMAP 3D
- [ ] Day 3: Implement K-means clustering
- [ ] Day 4: Implement AI labeling
- [ ] Day 5: Integrate QStash worker

### Week 3: 3D Visualization (5 days)
- [ ] Day 1: Setup React Three Fiber
- [ ] Day 2: Implement instanced point cloud
- [ ] Day 3: Implement raycasting interactions
- [ ] Day 4: Implement hover/click animations
- [ ] Day 5: Polish + performance optimization

### Week 4: UI Components (5 days)
- [ ] Day 1: Main container + controls
- [ ] Day 2: Evolution chart (Recharts)
- [ ] Day 3: Cluster list sidebar
- [ ] Day 4: Tweet slider with TweetCard reuse
- [ ] Day 5: Loading states + error handling

### Week 5: Testing & Polish (5 days)
- [ ] Day 1: E2E tests (100, 1K, 10K tweets)
- [ ] Day 2: Performance profiling
- [ ] Day 3: UX polish (animations, transitions)
- [ ] Day 4: Documentation
- [ ] Day 5: User acceptance testing

**Total**: 5 weeks to production-ready MVP

---

## Success Criteria

✅ **Performance**:
- Full pipeline < 4 min for 10K tweets
- 3D rendering @ 60 FPS constant
- Interactions < 16ms (immediate feedback)

✅ **UX**:
- Smooth animations (150-250ms)
- Clear visual feedback
- Intuitive interactions
- Non-blocking generation

✅ **Cost**:
- < $0.10 per clustering
- 87% savings vs always-embed strategy

✅ **Reliability**:
- 95%+ success rate
- Graceful error handling
- Resume on failure

✅ **Code Quality**:
- Reusable components
- No duplication
- Industry best practices
- Full TypeScript coverage

---

## Ready to Code? 🚀

Architecture **validée et complète**. 

**Prochaine étape** : Créer les migrations SQL (Week 1, Day 1)

**Voulez-vous que je commence** ?


