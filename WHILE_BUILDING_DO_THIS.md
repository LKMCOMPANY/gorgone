# ⏱️ Pendant que Vercel Build... Faites Ceci !

**Build en cours** : Commit `1090b13` (avec .npmrc fix)  
**ETA Build** : 5-10 minutes  
**Utilisez ce temps** : Pour préparer la base de données

---

## 🗄️ ÉTAPE 1 : Migration SQL (MAINTENANT !)

### Ouvrez Supabase SQL Editor

**URL** : https://rgegkezdegibgbdqzesd.supabase.co/project/rgegkezdegibgbdqzesd/sql

### Copiez-Collez ce SQL

```sql
-- ============================================================================
-- GORGONE V2 - Opinion Map Tables
-- Execute this BEFORE testing the opinion map feature
-- ============================================================================

-- Table 1: Tweet Projections (3D coordinates)
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

CREATE INDEX IF NOT EXISTS idx_projections_zone_session 
  ON twitter_tweet_projections (zone_id, session_id);

CREATE INDEX IF NOT EXISTS idx_projections_cluster 
  ON twitter_tweet_projections (session_id, cluster_id) 
  WHERE cluster_id >= 0;

-- Table 2: Opinion Clusters (metadata)
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

CREATE INDEX IF NOT EXISTS idx_clusters_zone_session 
  ON twitter_opinion_clusters (zone_id, session_id);

CREATE INDEX IF NOT EXISTS idx_clusters_tweet_count 
  ON twitter_opinion_clusters (session_id, tweet_count DESC);

-- Table 3: Sessions (job tracking)
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

CREATE INDEX IF NOT EXISTS idx_sessions_zone_recent 
  ON twitter_opinion_sessions (zone_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_active 
  ON twitter_opinion_sessions (status, created_at DESC) 
  WHERE status IN ('pending', 'vectorizing', 'reducing', 'clustering', 'labeling');

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_per_zone 
  ON twitter_opinion_sessions (zone_id) 
  WHERE status IN ('pending', 'vectorizing', 'reducing', 'clustering', 'labeling');

-- Enable RLS
ALTER TABLE twitter_tweet_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_opinion_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all authenticated - fine-grained control in app)
DROP POLICY IF EXISTS "auth_access_projections" ON twitter_tweet_projections;
DROP POLICY IF EXISTS "auth_access_clusters" ON twitter_opinion_clusters;
DROP POLICY IF EXISTS "auth_access_sessions" ON twitter_opinion_sessions;

CREATE POLICY "auth_access_projections" 
  ON twitter_tweet_projections FOR ALL TO authenticated 
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_access_clusters" 
  ON twitter_opinion_clusters FOR ALL TO authenticated 
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_access_sessions" 
  ON twitter_opinion_sessions FOR ALL TO authenticated 
  USING (true) WITH CHECK (true);

-- Verify success
SELECT 
  tablename,
  '✅' as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'twitter_tweet_projections',
    'twitter_opinion_clusters',
    'twitter_opinion_sessions'
  )
ORDER BY tablename;
```

### Cliquez "RUN" (en bas à droite)

**Résultat attendu** :

| tablename | status |
|-----------|--------|
| twitter_opinion_clusters | ✅ |
| twitter_opinion_sessions | ✅ |
| twitter_tweet_projections | ✅ |

**Si vous voyez les 3 lignes** → Migration réussie ! 🎉

---

## 🔑 ÉTAPE 2 : OpenAI API Key dans Vercel

### Obtenir la Clé

1. Allez sur : https://platform.openai.com/api-keys
2. Cliquez "Create new secret key"
3. Copiez la clé (commence par `sk-...`)
4. **Sauvegardez-la** quelque part (vous ne la reverrez plus)

### Ajouter dans Vercel

1. Allez sur votre Dashboard Vercel
2. Sélectionnez le projet Gorgone
3. Allez dans "Settings" (en haut)
4. Cliquez "Environment Variables" (menu gauche)
5. Cliquez "Add New"
6. Configurez :
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-...` (votre clé)
   - **Environments**:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
7. Cliquez "Save"

**Important** : Le build actuel n'aura pas la clé, mais le prochain (après merge) l'aura.

---

## ⏰ Timeline

**Maintenant (15:08)** : Build Vercel en cours  
**15:15** : Build devrait être terminé  
**15:20** : Migration SQL + OpenAI key configurés (vous)  
**15:25** : Test de l'opinion map ! 🎉

---

## 🎯 Après le Build Vercel

### Vous Recevrez

- ✅ Notification de build success
- ✅ Preview URL : `https://gorgone-git-analysis-xxx.vercel.app`

### Vous Pourrez

1. Ouvrir la preview URL
2. Login
3. Aller sur : Dashboard > Zones > [Une Zone] > Analysis
4. Voir le bouton "Generate Opinion Map"

**Mais ne testez pas encore !** Sans la migration SQL, ça va crasher.

---

## ✅ Ordre des Opérations

**ORDRE IMPORTANT** :

1. ✅ Build Vercel réussit (en cours...)
2. ✅ Migration SQL (faites-la MAINTENANT pendant le build)
3. ✅ OpenAI Key dans Vercel (2 min après migration)
4. ✅ Test sur preview URL

**Si vous faites la migration maintenant**, vous serez prêt dès que le build termine ! ⚡

---

## 🚨 Si le Build Échoue Encore

**Option A** : Downgrader drei à une version plus ancienne
**Option B** : Attendre que drei supporte fiber v9
**Option C** : Utiliser Three.js vanilla (sans R3F)

**Mais normalement**, `.npmrc` devrait résoudre le problème ! 🤞

---

**Action NOW** : Exécutez la migration SQL pendant que Vercel build ! ⏱️

