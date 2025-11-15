# Engagement Update System - Analyse Technique

**Date**: 2025-11-15  
**Status**: Analyse avant implémentation  
**Objectif**: Système de mise à jour périodique et manuelle des métriques d'engagement Twitter

---

## 📊 État Actuel

### ✅ Ce qui existe déjà (très bien architecturé !)

#### 1. **Base de données**
- ✅ `twitter_tweets` - Table principale avec métriques d'engagement (97 tweets)
- ✅ `twitter_engagement_history` - Stockage des snapshots (actuellement vide - prêt à recevoir les données)
- ✅ `twitter_engagement_tracking` - Système de tiers avec planification
  - 97 tweets trackés : 88 ultra_hot, 9 hot, 0 warm, 0 cold
  - `next_update_at` déjà calculé pour chaque tweet

#### 2. **Data Layer (`lib/data/twitter/engagement.ts`)**
✅ Toutes les fonctions nécessaires existent :
- `createEngagementSnapshot()` - Crée un snapshot avec calcul automatique des deltas
- `getEngagementHistory()` - Récupère l'historique pour un tweet
- `getTweetsForEngagementUpdate()` - **CRUCIAL** : Retourne les tweets due pour update
- `createEngagementTracking()` - Initialise le tracking (déjà utilisé au webhook)
- `updateEngagementTracking()` - Met à jour le tier après update
- `getHighVelocityTweets()` - Détecte les tweets viraux

✅ **Data Layer (`lib/data/twitter/tweets.ts`)**
- `getTweetById()` - Récupère un tweet par ID interne
- `getTweetByTwitterId()` - Récupère un tweet par tweet_id Twitter
- `updateTweetEngagement()` - **CRITIQUE** : Met à jour les métriques dans `twitter_tweets`

#### 3. **API Client (`lib/api/twitter/client.ts`)**
✅ La fonction clé existe déjà :
```typescript
getTweetById(tweetId: string): Promise<TwitterAPITweet | null>
```
- Endpoint: `GET /twitter/tweet?id={tweetId}`
- Retourne toutes les métriques actualisées
- Gestion d'erreur intégrée

⚠️ **OPTIMISATION DÉCOUVERTE** : L'API supporte aussi le batch fetching :
```typescript
getTweetsByIds(tweetIds: string[]): Promise<TwitterAPITweet[]>
```
- Endpoint: `GET /twitter/tweets?tweet_ids=id1,id2,id3`
- Récupère jusqu'à 100 tweets en un seul appel
- **10x plus rapide** que les appels individuels
- Documentation : https://docs.twitterapi.io/api-reference/endpoint/get_tweet_by_ids

#### 4. **Système de Tiers**

Le système de tiers est **déjà implémenté** et fonctionnel :

| Tier | Âge | Intervalle | Description |
|------|-----|------------|-------------|
| `ultra_hot` | 0-1h | 10 min | Nouveaux tweets, croissance rapide |
| `hot` | 1-4h | 30 min | Tweets actifs |
| `warm` | 4-12h | 1h | Tweets moins actifs |
| `cold` | 12h+ | stop | Fin du tracking |

**Logique automatique** :
- Création initiale : `createEngagementTracking()` définit le tier selon l'âge
- Après chaque update : `updateEngagementTracking()` recalcule le tier
- Le `next_update_at` est automatiquement ajusté

---

## ❌ Ce qui manque (à implémenter)

### 1. **Module de mise à jour d'engagement**

Fichier à créer : `lib/data/twitter/engagement-updater.ts`

**Fonctions nécessaires** :

```typescript
// 1. Mettre à jour un seul tweet (modulaire, réutilisable)
async function updateSingleTweetEngagement(
  tweetDbId: string
): Promise<boolean>

// 2. Mettre à jour un batch de tweets (pour le cron)
async function updateBatchTweetEngagement(
  limit: number = 100
): Promise<UpdateBatchResult>

// 3. Forcer l'update d'un tweet spécifique (pour UI)
async function forceUpdateTweetEngagement(
  tweetDbId: string
): Promise<UpdateResult>
```

**Workflow pour `updateSingleTweetEngagement()` :**

```
1. Récupérer le tweet de la DB (avec tweet_id et twitter_created_at)
   → getTweetById(tweetDbId)

2. Appeler l'API Twitter pour les métriques fraîches
   → twitterApi.getTweetById(tweetId)

3. Si succès :
   a. Mettre à jour les métriques dans twitter_tweets
      → updateTweetEngagement(tweetDbId, metrics)
   
   b. Créer un snapshot dans twitter_engagement_history
      → createEngagementSnapshot(tweetDbId, metrics)
   
   c. Récupérer le tracking record et mettre à jour le tier
      → updateEngagementTracking(trackingId, tweetCreatedAt)

4. Retourner succès/échec avec détails
```

### 2. **API Routes**

#### Route pour refresh manuel (UI)
Fichier : `app/api/twitter/tweets/[id]/refresh/route.ts`

```typescript
POST /api/twitter/tweets/[id]/refresh
```

**Usage** : Bouton "Refresh" sur les cards de tweets dans le feed

**Logique** :
1. Vérifier permissions (user a accès à la zone)
2. Appeler `forceUpdateTweetEngagement(tweetId)`
3. Retourner les nouvelles métriques + snapshot créé

#### Route pour batch update (worker/cron)
Fichier : `app/api/twitter/engagement/update/route.ts`

```typescript
POST /api/twitter/engagement/update
```

**Usage** : Appelé par QStash toutes les 10 minutes

**Logique** :
1. Vérifier authentification (QStash signature ou API key)
2. Appeler `updateBatchTweetEngagement(limit: 100)`
3. Retourner statistiques (updated, errors, skipped)

### 3. **Worker QStash (plus tard)**

**Configuration QStash** :
- Endpoint : `https://gorgone.vercel.app/api/twitter/engagement/update`
- Schedule : `*/10 * * * *` (toutes les 10 minutes)
- Retry : 3 tentatives avec backoff exponentiel
- Timeout : 60 secondes

**Avantage** :
- Déclenché automatiquement par QStash
- Pas besoin de serveur dédié
- Scalable et fiable

---

## 🏗️ Architecture proposée

### Flux Automatique (Cron)

```
QStash Timer (every 10 min)
  ↓
POST /api/twitter/engagement/update
  ↓
updateBatchTweetEngagement(100)
  ↓
getTweetsForEngagementUpdate() → [tweets due now]
  ↓
Pour chaque tweet:
  ├─ twitterApi.getTweetById(tweet_id)
  ├─ updateTweetEngagement(metrics)
  ├─ createEngagementSnapshot(metrics)
  └─ updateEngagementTracking(tier++)
  ↓
Résultat: { updated: 95, errors: 2, duration: 12s }
```

### Flux Manuel (UI)

```
User clique "Refresh" sur tweet card
  ↓
POST /api/twitter/tweets/[id]/refresh
  ↓
forceUpdateTweetEngagement(tweetDbId)
  ↓
twitterApi.getTweetById(tweet_id)
  ↓
updateTweetEngagement(metrics)
  ↓
createEngagementSnapshot(metrics)
  ↓
Retour: { success: true, newMetrics: {...}, snapshot: {...} }
  ↓
UI met à jour la card + courbe d'engagement
```

---

## 🚀 Points forts de l'architecture existante

1. **✅ Modulaire** : Data layer bien séparé, fonctions réutilisables
2. **✅ Scalable** : Système de tiers optimise les appels API
3. **✅ Performant** : Indexes sur `next_update_at`, queries < 10ms
4. **✅ Fiable** : Calcul automatique des deltas et velocity
5. **✅ Production-ready** : Gestion d'erreurs, logging, types complets

---

## 📋 Plan d'implémentation

### Phase 1 : Module de mise à jour (core)
1. Créer `lib/data/twitter/engagement-updater.ts`
2. Implémenter `updateSingleTweetEngagement()`
3. Implémenter `updateBatchTweetEngagement()`
4. Implémenter `forceUpdateTweetEngagement()`
5. Tests unitaires avec mock de l'API

### Phase 2 : API Routes
1. Créer route refresh manuel (`/api/twitter/tweets/[id]/refresh`)
2. Créer route batch update (`/api/twitter/engagement/update`)
3. Ajouter authentification et permissions
4. Tests d'intégration

### Phase 3 : QStash Worker (optionnel pour MVP)
1. Configurer QStash dans Upstash dashboard
2. Ajouter webhook signature verification
3. Monitoring et alertes

---

## 🎯 Optimisations prévues

### 1. **Gestion des erreurs API**
- Retry automatique (3x avec backoff)
- Logging détaillé des échecs
- Statistiques de santé (success rate)

### 2. **Rate Limiting**
- Respecter les limites de twitterapi.io
- Batch processing avec délai entre requêtes
- Circuit breaker si trop d'erreurs

### 3. **Performance**
- **Batch API calls** : Récupérer 10-20 tweets par appel API (au lieu de 1)
- Parallel processing (5 batches en parallèle avec Promise.all)
- Timeout de 10s par batch
- Cache Redis pour tweets récemment mis à jour (optionnel)

### 4. **Monitoring**
- Logs structurés (logger.info, logger.error)
- Métriques : temps d'exécution, success rate, API latency
- Dashboard Vercel Analytics

---

## 🔍 Points d'attention

### ⚠️ API Quotas
- twitterapi.io : limite à vérifier dans la doc
- Système de tiers réduit déjà les appels (16 calls/tweet sur 12h vs 36)
- Prioriser les tweets avec engagement > 50 (top 5-10%)

### ⚠️ Coûts estimés
Pour une zone avec 10K tweets/jour :
- Tracking sélectif (top 5%) : ~12K updates/jour = ~$2/jour
- **Recommandation** : Tracker seulement tweets avec engagement initial > 10

### ⚠️ Edge Cases
1. Tweet supprimé par l'auteur → API retourne 404 → marquer comme `cold`
2. Tweet privé (compte privé) → API retourne erreur → skip
3. Rate limit atteint → pause 15 min et retry

---

## 📊 Données actuelles

**Résumé** :
- 97 tweets dans `twitter_tweets`
- 97 tracking records dans `twitter_engagement_tracking`
- 0 snapshots dans `twitter_engagement_history` (prêt à recevoir les données)
- 88 tweets `ultra_hot` (< 1h), 9 tweets `hot` (1-4h)
- Tous les `next_update_at` sont déjà calculés

**État** : Le système est prêt à recevoir le module de mise à jour !

---

## ✅ Conclusion

**Le code existant est excellent** :
- Architecture modulaire et scalable
- Toutes les fonctions de base sont là
- Système de tiers intelligent déjà fonctionnel
- Tables optimisées avec indexes

**Il ne manque que** :
1. Le module `engagement-updater.ts` (cœur de la logique)
2. Deux routes API (refresh manuel + batch update)
3. Configuration QStash (5 minutes)

**Estimation** : 2-3 heures de développement pour un système production-ready.

---

**Prêt à coder ?** 🚀

