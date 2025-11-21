# Chat AI Tools - Inventaire Complet

**Date**: November 21, 2025  
**Status**: Planning Phase 2

---

## 📊 DONNÉES DISPONIBLES

### 🐦 Twitter (Complet)

#### Tables principales
- `twitter_profiles` (1,599 profiles)
- `twitter_tweets` (2,553 tweets)
- `twitter_engagement_history` (5,638 snapshots)
- `twitter_entities` (16,910 hashtags/mentions/URLs)
- `twitter_rules` (4 rules actives)
- `twitter_profile_zone_tags` (labels: Attila, Adversary, Ally, etc.)
- `twitter_engagement_tracking` (tracking tiered)
- `twitter_tweet_projections` (5,570 - Opinion Map 3D)
- `twitter_opinion_clusters` (142 clusters)
- `twitter_opinion_sessions` (34 sessions)

#### Materialized Views (Optimisées)
- `twitter_zone_stats_hourly` - Stats horaires
- `twitter_top_profiles_3h/6h/12h/24h/7d/30d` - Top profiles par période
- `twitter_top_tweets_3h/6h/12h/24h/7d/30d` - Top tweets par période
- `twitter_share_of_voice_3h/6h/12h/24h/7d/30d` - Share of Voice par tags

#### Fonctions data disponibles
**Analytics** (`lib/data/twitter/analytics.ts`):
- `getZoneStats()` - Stats zone période
- `getTopProfiles()` - Top comptes
- `getTopProfilesByPeriod()` - Top comptes par période (3h à 30d)
- `getTopTweetsByPeriod()` - Top tweets par période
- `getShareOfVoice()` - Share of Voice par tags
- `getVolumeTrend()` - Évolution volume horaire
- `getEngagementRate()` - Taux d'engagement
- `detectVolumeSpikes()` - Détection pics de volume
- `detectEngagementAcceleration()` - Détection accélération engagement

**Tweets** (`lib/data/twitter/tweets.ts`):
- `getTweetsByZone()` - Tweets avec filtres (date, pagination, profil)
- `getTweetById()` - Tweet par ID
- `searchTweets()` - Recherche full-text
- `getTweetsByHashtag()` - Tweets par hashtag
- `getTweetsByMention()` - Tweets mentionnant user
- `getTweetsByProfile()` - Tweets d'un profil

**Profiles** (`lib/data/twitter/profiles.ts`):
- `getProfileByTwitterId()` - Profil par ID Twitter
- `getProfileByUsername()` - Profil par @username
- `getProfilesByZone()` - Tous les profils d'une zone
- `getProfilesByTag()` - Profils par tag (Attila, Ally, etc.)
- `getProfileTags()` - Tags d'un profil
- `getProfileGrowth()` - Croissance followers

**Entities** (`lib/data/twitter/entities.ts`):
- `getTrendingHashtags()` - Hashtags tendances
- `getTrendingMentions()` - Mentions les plus fréquentes
- `getHashtagStats()` - Stats d'un hashtag
- `getEntityTrend()` - Évolution temporelle hashtag/mention

**Threads** (`lib/data/twitter/threads.ts`):
- `getFullThread()` - Reconstitution thread complet
- `getThreadByConversationId()` - Thread par conversation ID
- `getRootTweet()` - Tweet racine d'une conversation

**Opinion Map** (`lib/data/twitter/opinion-map/`):
- `getLatestSession()` - Dernière session opinion map
- `getSessionById()` - Session par ID
- `getClusters()` - Tous les clusters d'une session
- `getClusterById()` - Détails d'un cluster
- `getProjections()` - Projections 3D des tweets
- `getTimeSeriesData()` - Évolution temporelle clusters

**Zone Stats** (`lib/data/twitter/zone-stats.ts`):
- `getZoneEngagementThreshold()` - Seuil P25 (cached Redis)
- `getZoneEngagementStats()` - Stats complètes (P25, P75, avg, max)

---

### 🎵 TikTok (Complet)

#### Tables principales
- `tiktok_profiles` (143 profiles)
- `tiktok_videos` (178 videos)
- `tiktok_engagement_history` (132 snapshots)
- `tiktok_entities` (849 hashtags/mentions)
- `tiktok_rules` (4 rules)
- `tiktok_profile_zone_tags` (mêmes 7 labels que Twitter)
- `tiktok_engagement_tracking` (178 tracking)

#### Fonctions data disponibles
**Videos** (`lib/data/tiktok/videos.ts`):
- `getVideosByZone()` - Videos avec filtres (date, pagination, profil)
- `getVideoById()` - Video par ID
- `videoExists()` - Check existence
- `searchVideos()` - Recherche dans descriptions

**Profiles** (`lib/data/tiktok/profiles.ts`):
- `getProfileById()` - Profil par ID
- `getProfileByUsername()` - Profil par @username
- `getProfilesByZone()` - Tous les profils
- `getProfilesByTag()` - Profils par tag

**Entities** (`lib/data/tiktok/entities.ts`):
- `getTrendingHashtags()` - Hashtags tendances TikTok
- `getHashtagStats()` - Stats hashtag

**Engagement** (`lib/data/tiktok/engagement.ts`):
- `getEngagementHistory()` - Historique engagement video
- `createEngagementSnapshot()` - Snapshot manuel

---

### 📰 Media (Complet)

#### Tables principales
- `media_articles` (407 articles)
- `media_sources` (213 sources)
- `media_rules` (2 rules)

#### Fonctions data disponibles
**Articles** (`lib/data/media/articles.ts`):
- `getArticlesByZone()` - Articles avec filtres complets:
  - Date range
  - Langue (lang)
  - Source (sourceUri)
  - Sentiment (min/max)
  - Recherche full-text
  - Sort (date, social_score, sentiment)
- `getArticleById()` - Article par ID
- `getArticlesBySource()` - Articles d'une source
- `getTrendingArticles()` - Articles viraux (social_score élevé)
- `getArticlesByCategory()` - Articles par catégorie
- `getArticlesByConcept()` - Articles par concept

**Sources** (`lib/data/media/sources.ts`):
- `getSourceByUri()` - Source par URI
- `getSourcesByCountry()` - Sources par pays
- `getTopSources()` - Sources les plus actives

---

## 🛠️ AI TOOLS À CRÉER

### 🎯 Niveau 1 : Essentiels (à créer en priorité)

#### 1. `search_content`
**Description**: Recherche cross-platform (Twitter + TikTok + Media)  
**Utilité**: "Trouve-moi du contenu sur l'IA"  
**Params**:
- `query`: string (recherche)
- `platforms`: array ["twitter", "tiktok", "media"]
- `start_date`: date (optionnel)
- `end_date`: date (optionnel)
- `limit`: number (défaut: 20)

**Retourne**: Tweets + Videos + Articles mélangés par pertinence

---

#### 2. `get_zone_overview`
**Description**: Vue d'ensemble complète d'une zone  
**Utilité**: "Donne-moi un aperçu de la zone"  
**Params**:
- `period`: "3h" | "6h" | "12h" | "24h" | "7d" | "30d"

**Retourne**:
```json
{
  "twitter": {
    "total_tweets": 1234,
    "total_engagement": 45678,
    "top_profiles": [...],
    "trending_hashtags": [...]
  },
  "tiktok": {
    "total_videos": 56,
    "total_views": 123456,
    "top_creators": [...]
  },
  "media": {
    "total_articles": 78,
    "top_sources": [...],
    "avg_sentiment": 0.42
  }
}
```

---

#### 3. `get_top_content`
**Description**: Top contenu par engagement  
**Utilité**: "Quels sont les posts avec le plus d'interactions ?"  
**Params**:
- `platform`: "twitter" | "tiktok" | "all"
- `period`: "3h" à "30d"
- `limit`: number (défaut: 10)

**Retourne**: Liste de tweets/videos triés par engagement

---

#### 4. `get_top_accounts`
**Description**: Top comptes par influence  
**Utilité**: "Quels sont les comptes les plus influents ?"  
**Params**:
- `platform`: "twitter" | "tiktok" | "all"
- `period`: "3h" à "30d"
- `limit`: number (défaut: 10)

**Retourne**: Profils avec stats (followers, engagement, tweets count)

---

#### 5. `get_trending_topics`
**Description**: Sujets et hashtags tendances  
**Utilité**: "Quels sont les sujets tendances ?"  
**Params**:
- `platform`: "twitter" | "tiktok" | "all"
- `period`: "3h" à "30d"
- `limit`: number (défaut: 10)

**Retourne**: Hashtags/topics avec volume et croissance

---

#### 6. `analyze_sentiment`
**Description**: Analyse de sentiment général  
**Utilité**: "Quel est le sentiment dominant ?"  
**Params**:
- `topic`: string (optionnel)
- `period`: "3h" à "30d"

**Retourne**:
```json
{
  "overall_sentiment": 0.35,
  "positive_percent": 45,
  "negative_percent": 20,
  "neutral_percent": 35,
  "media_avg_sentiment": 0.42
}
```

---

### 🎯 Niveau 2 : Avancés

#### 7. `get_share_of_voice`
**Description**: Share of Voice par labels (Attila, Ally, etc.)  
**Utilité**: "Quelle est la répartition entre alliés et adversaires ?"  
**Params**:
- `period`: "3h" à "30d"

**Retourne**: Volume et % par tag type

---

#### 8. `analyze_account`
**Description**: Analyse détaillée d'un compte  
**Utilité**: "Analyse-moi le compte @elonmusk"  
**Params**:
- `username`: string
- `platform`: "twitter" | "tiktok"

**Retourne**:
```json
{
  "profile": {...},
  "stats": {
    "total_posts": 123,
    "avg_engagement": 4567,
    "engagement_rate": 0.023,
    "growth_7d": 150
  },
  "top_posts": [...],
  "tags": ["attila", "surveillance"]
}
```

---

#### 9. `get_opinion_map_summary`
**Description**: Résumé de la dernière opinion map  
**Utilité**: "Quelles sont les opinions dominantes ?"  
**Params**: Aucun (utilise dernière session)

**Retourne**:
```json
{
  "session_date": "2025-11-20",
  "total_tweets": 5570,
  "total_clusters": 142,
  "dominant_cluster": {
    "label": "Tech Innovation",
    "tweet_count": 1250,
    "percentage": 22.4,
    "keywords": ["AI", "GPT", "innovation"]
  },
  "top_clusters": [...]
}
```

---

#### 10. `detect_anomalies`
**Description**: Détection d'anomalies et alertes  
**Utilité**: "Y a-t-il des événements inhabituels ?"  
**Params**: Aucun

**Retourne**:
```json
{
  "volume_spikes": [...],
  "engagement_accelerations": [...],
  "viral_content": [...]
}
```

---

#### 11. `get_volume_trend`
**Description**: Évolution du volume au fil du temps  
**Utilité**: "Comment évolue le volume de tweets ?"  
**Params**:
- `platform`: "twitter" | "tiktok" | "media" | "all"
- `period`: "24h" | "7d" | "30d"
- `granularity`: "hour" | "day"

**Retourne**: Données time-series pour graphiques

---

#### 12. `compare_accounts`
**Description**: Comparaison entre deux comptes  
**Utilité**: "Compare @elonmusk et @grok"  
**Params**:
- `usernames`: string[] (2 à 5 comptes)
- `platform`: "twitter" | "tiktok"

**Retourne**: Comparatif stats, engagement, audience

---

### 🎯 Niveau 3 : Spécialisés

#### 13. `get_conversation_thread`
**Description**: Reconstitution complète d'un thread  
**Utilité**: "Montre-moi le thread de ce tweet"  
**Params**:
- `tweet_id`: string

**Retourne**: Thread complet hiérarchique

---

#### 14. `find_influencers`
**Description**: Identifier les influenceurs sur un sujet  
**Utilité**: "Qui sont les influenceurs sur l'IA ?"  
**Params**:
- `topic`: string
- `min_followers`: number (optionnel)

**Retourne**: Profils triés par influence sur le sujet

---

#### 15. `get_media_coverage`
**Description**: Couverture médiatique d'un sujet  
**Utilité**: "Quelle est la couverture média sur ce sujet ?"  
**Params**:
- `topic`: string
- `period`: "24h" | "7d" | "30d"

**Retourne**:
```json
{
  "total_articles": 78,
  "sources": [...],
  "sentiment_breakdown": {...},
  "top_articles": [...]
}
```

---

#### 16. `generate_report`
**Description**: Génération de rapport complet  
**Utilité**: "Génère un rapport des dernières 24h"  
**Params**:
- `period`: "3h" à "30d"
- `include_sections`: array (optionnel)

**Retourne**: Rapport structuré markdown avec:
- Executive summary
- Volume stats
- Top content
- Top accounts
- Trending topics
- Sentiment analysis
- Key events

---

## 📋 PRIORISATION RECOMMANDÉE

### Sprint 1 (Essentiels - 4h)
1. ✅ `get_zone_overview` - Vue d'ensemble
2. ✅ `get_top_content` - Top posts
3. ✅ `get_top_accounts` - Top comptes
4. ✅ `get_trending_topics` - Hashtags tendances

### Sprint 2 (Recherche & Analyse - 3h)
5. ✅ `search_content` - Recherche cross-platform
6. ✅ `analyze_sentiment` - Sentiment analysis
7. ✅ `get_share_of_voice` - Share of Voice

### Sprint 3 (Avancé - 4h)
8. ✅ `get_opinion_map_summary` - Opinion map
9. ✅ `analyze_account` - Analyse compte
10. ✅ `get_volume_trend` - Tendances volume
11. ✅ `detect_anomalies` - Alertes

### Sprint 4 (Spécialisé - 3h)
12. ✅ `get_media_coverage` - Couverture média
13. ✅ `compare_accounts` - Comparaison comptes
14. ✅ `generate_report` - Rapports complets

---

## 🎯 RECOMMENDATION FINALE

**Commencer par Sprint 1** (4 tools essentiels):
- Ce sont les questions les plus fréquentes
- Couvrent 80% des use cases
- Simples à implémenter (data layer déjà prête)
- Impact immédiat pour l'utilisateur

**Structure des tools**:
```typescript
// lib/ai/tools/get-zone-overview.ts
export const getZoneOverviewTool = tool({
  description: 'Get comprehensive overview of a zone...',
  parameters: z.object({
    period: z.enum(['3h', '6h', '12h', '24h', '7d', '30d']).default('24h'),
  }),
  execute: async ({ period }, { zoneId }) => {
    // Appel aux fonctions data existantes
    const twitterStats = await getTopProfilesByPeriod(zoneId, period)
    const trendingHashtags = await getTrendingHashtags(zoneId, period)
    // ...
    return formatOverview(...)
  }
})
```

---

## ✅ AVANTAGES DE CETTE APPROCHE

1. **Données déjà là** : 0 requête API externe, tout en DB
2. **Performance** : Materialized views = queries < 50ms
3. **Cache Redis** : Thresholds et stats cachés 1h
4. **Scalable** : Gère 10K+ tweets/jour sans problème
5. **Modulaire** : Chaque tool indépendant
6. **Testable** : Peut tester chaque tool séparément

---

**Prêt à coder Sprint 1 ?** 🚀

