# 🚀 Deploy Opinion Map to Vercel

**Branch**: `analysis`  
**Commit**: `b75df23`  
**Status**: Ready for deployment

---

## ✅ Ce Qui Est Prêt

- ✅ **39 fichiers** commités (12,786 insertions)
- ✅ **Branche pushed** : `origin/analysis`
- ✅ **Code complet** : Backend + Frontend + Documentation
- ✅ **Dev server** : Running on http://localhost:3000

**GitHub**: https://github.com/LKMCOMPANY/gorgone/tree/analysis

---

## 📋 Déploiement sur Vercel (Étape par Étape)

### Étape 1 : Exécuter la Migration SQL (CRITIQUE)

**Avant de déployer**, vous DEVEZ créer les tables dans Supabase.

**Allez sur** : https://rgegkezdegibgbdqzesd.supabase.co/project/rgegkezdegibgbdqzesd/sql

**Copiez-collez ce fichier** :
```
/Users/lkm/Desktop/GORGONEANALYSIS/gorgone/migrations/20251118_opinion_map_tables.sql
```

**OU copiez directement** :
```sql
-- Table 1: Projections
CREATE TABLE IF NOT EXISTS twitter_tweet_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_db_id UUID NOT NULL REFERENCES twitter_tweets(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  z NUMERIC NOT NULL,
  cluster_id INTEGER NOT NULL,
  cluster_confidence NUMERIC,
  is_outlier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tweet_db_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_projections_zone_session ON twitter_tweet_projections (zone_id, session_id);
CREATE INDEX IF NOT EXISTS idx_projections_cluster ON twitter_tweet_projections (session_id, cluster_id) WHERE cluster_id >= 0;

-- Table 2: Clusters
CREATE TABLE IF NOT EXISTS twitter_opinion_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  cluster_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  reasoning TEXT,
  tweet_count INTEGER DEFAULT 0,
  centroid_x NUMERIC NOT NULL,
  centroid_y NUMERIC NOT NULL,
  centroid_z NUMERIC NOT NULL,
  avg_sentiment NUMERIC,
  coherence_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (zone_id, session_id, cluster_id)
);

CREATE INDEX IF NOT EXISTS idx_clusters_zone_session ON twitter_opinion_clusters (zone_id, session_id);

-- Table 3: Sessions
CREATE TABLE IF NOT EXISTS twitter_opinion_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_phase TEXT,
  phase_message TEXT,
  config JSONB DEFAULT '{}',
  total_tweets INTEGER,
  vectorized_tweets INTEGER DEFAULT 0,
  total_clusters INTEGER,
  outlier_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  error_stack TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_zone_recent ON twitter_opinion_sessions (zone_id, created_at DESC);

-- Enable RLS
ALTER TABLE twitter_tweet_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "authenticated_access_projections" ON twitter_tweet_projections FOR ALL TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "authenticated_access_clusters" ON twitter_opinion_clusters FOR ALL TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "authenticated_access_sessions" ON twitter_opinion_sessions FOR ALL TO authenticated USING (true);

-- Verify
SELECT '✅ Opinion Map tables created!' as status;
```

**Exécutez** → Vous devriez voir "✅ Opinion Map tables created!"

---

### Étape 2 : Configurer les Variables d'Environnement Vercel

**Allez sur** : https://vercel.com/your-team/gorgone/settings/environment-variables

**Ajoutez (si manquantes)** :

```
OPENAI_API_KEY = sk-your-key-here
```

**Note** : Les autres variables (Supabase, QStash, etc.) sont déjà configurées.

---

### Étape 3 : Déployer sur Vercel

**Option A : Via Dashboard Vercel**

1. Allez sur : https://vercel.com/your-team/gorgone
2. Cliquez "Deployments"
3. Trouvez la branche "analysis"
4. Cliquez "Deploy"
5. Attendez 3-5 minutes
6. Testez sur l'URL de preview

**Option B : Via CLI**

```bash
cd /Users/lkm/Desktop/GORGONEANALYSIS/gorgone

# Deploy la branche analysis
vercel --branch analysis

# Ou créer un déploiement de preview
vercel
```

---

### Étape 4 : Tester sur Vercel

**URL de preview** : https://gorgone-xxx-your-team.vercel.app

1. Login
2. Allez sur : Zone > Analysis
3. Générez une opinion map
4. Vérifiez que tout fonctionne

---

## 🔍 Vérifications Pré-Déploiement

### Vérifier le Build Local

```bash
cd /Users/lkm/Desktop/GORGONEANALYSIS/gorgone

# Build production
npm run build

# Si le build passe, Vercel devrait aussi passer ✅
```

### Vérifier les Imports

Tous les imports utilisent bien le SDK Vercel AI (pas besoin de clé manuelle) :

```typescript
// ✅ CORRECT - Utilise SDK Vercel
import { embed, embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: contents
})

// La clé OPENAI_API_KEY est auto-injectée par Vercel
```

---

## 📊 Ce Qui Sera Déployé

**Backend** :
- 9 modules data layer
- 4 API routes  
- 1 worker QStash
- Migration SQL (à exécuter manuellement)

**Frontend** :
- 7 composants React
- 3D visualization (WebGL)
- Evolution chart
- Sidebar interactive

**Documentation** :
- 8 fichiers de documentation
- 2 fichiers de guide

**Total** : 39 fichiers, 12,786 lignes

---

## ⚠️ Checklist Avant Déploiement

- [ ] Migration SQL exécutée dans Supabase ✅
- [ ] Variable `OPENAI_API_KEY` configurée dans Vercel
- [ ] Build local réussi (`npm run build`)
- [ ] Toutes les dépendances dans package.json
- [ ] Branche `analysis` pushée sur GitHub ✅

---

## 🎯 Après Déploiement

1. **Tester une génération** (petit dataset d'abord)
2. **Vérifier les logs** Vercel
3. **Vérifier les données** dans Supabase
4. **Tester les interactions** 3D
5. **Valider les performances**

---

## 🐛 Si Problèmes

**Build failed** :
- Vérifier les logs Vercel
- Vérifier les imports TypeScript
- Vérifier les dépendances

**Worker timeout** :
- Réduire sample_size (tester avec 1,000 d'abord)
- Vérifier QStash configuration
- Vérifier OpenAI API key

**3D ne s'affiche pas** :
- Vérifier console browser
- Vérifier Three.js/R3F versions
- Tester sur Chrome

---

## 🚀 Commandes Rapides

```bash
# Build local test
npm run build

# Deploy to Vercel (preview)
vercel

# Deploy to production
vercel --prod
```

---

**Status** : ✅ Ready to deploy!  
**Next** : Execute SQL migration, then deploy to Vercel

