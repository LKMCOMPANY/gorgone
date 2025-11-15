# Test du Système d'Update d'Engagement

**Date**: 2025-11-15  
**Status**: Prêt pour tests  

---

## 🎯 État Actuel

```sql
-- Résultat de la requête :
- 97 tweets dans twitter_engagement_tracking
- Tous en tier ultra_hot ou hot
- Tous sont en retard de ~9 heures pour leur update
- 0 snapshots dans twitter_engagement_history (prêt à recevoir)
```

**Parfait pour tester !** Tous les tweets seront mis à jour au premier run.

---

## ✅ Tests à effectuer

### Test 1 : Vérifier que l'API démarre sans erreur

```bash
cd /Users/lkm/Desktop/GORGONEDEV15/gorgone

# Installer les dépendances si nécessaire
npm install

# Démarrer le serveur de dev
npm run dev
```

**Attendu** : Aucune erreur de compilation TypeScript

### Test 2 : Appeler l'API de statistiques (GET)

```bash
# Ouvrir un nouveau terminal
curl http://localhost:3000/api/twitter/engagement/update \
  -H "Authorization: Bearer new1_efb60bb213ed46489a8604d92efc1edb"
```

**Attendu** :
```json
{
  "success": true,
  "timestamp": "2025-11-15T...",
  "stats": {
    "total": 97,
    "ultra_hot": 88,
    "hot": 9,
    "warm": 0,
    "cold": 0,
    "next_batch_size": 97,
    "next_batch_due": "2025-11-15T00:45:38.628Z"
  }
}
```

### Test 3 : Lancer un petit batch test (10 tweets)

```bash
curl -X POST http://localhost:3000/api/twitter/engagement/update \
  -H "Authorization: Bearer new1_efb60bb213ed46489a8604d92efc1edb" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

**Attendu** :
```json
{
  "success": true,
  "message": "Engagement update completed",
  "batch_result": {
    "total": 10,
    "successful": 8-10,
    "failed": 0-2,
    "skipped": 0,
    "duration_ms": 2000-5000
  },
  "api_stats": {
    "calls": 1,
    "tweets_per_call": 10,
    "avg_latency_ms": 1500-3000
  }
}
```

### Test 4 : Vérifier les snapshots dans la DB

```sql
-- Via Supabase SQL Editor
SELECT 
  eh.snapshot_at,
  eh.retweet_count,
  eh.like_count,
  eh.view_count,
  eh.total_engagement,
  eh.delta_retweets,
  eh.delta_likes,
  eh.engagement_velocity,
  t.tweet_id
FROM twitter_engagement_history eh
JOIN twitter_tweets t ON eh.tweet_id = t.id
ORDER BY eh.snapshot_at DESC
LIMIT 10;
```

**Attendu** : 10 nouveaux snapshots créés

### Test 5 : Vérifier les tiers mis à jour

```sql
SELECT 
  tier,
  COUNT(*) as count,
  MIN(next_update_at) as next_update,
  MAX(update_count) as max_updates
FROM twitter_engagement_tracking
GROUP BY tier;
```

**Attendu** :
- Les 10 tweets testés ont `update_count = 1`
- Leur `next_update_at` est dans le futur (maintenant + 10 min ou + 30 min selon le tier)
- Le tier peut avoir changé selon l'âge des tweets

### Test 6 : Vérifier les métriques mises à jour

```sql
SELECT 
  t.tweet_id,
  t.retweet_count,
  t.like_count,
  t.view_count,
  t.total_engagement,
  t.updated_at
FROM twitter_tweets t
WHERE t.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY t.updated_at DESC
LIMIT 10;
```

**Attendu** : Les 10 tweets ont `updated_at` récent (< 5 min)

---

## 🔍 Que vérifier

### ✅ Succès si :

1. **API démarre** sans erreur TypeScript
2. **GET /api/twitter/engagement/update** retourne les stats correctes
3. **POST /api/twitter/engagement/update** avec limit=10 :
   - Retourne success: true
   - successful = 8-10 (certains tweets peuvent être supprimés)
   - duration_ms < 10000 (moins de 10 secondes)
   - api_calls = 1 (batch de 10 tweets en 1 call)
4. **Snapshots créés** dans `twitter_engagement_history`
5. **Tiers mis à jour** dans `twitter_engagement_tracking`
6. **Métriques mises à jour** dans `twitter_tweets`

### ❌ Échec si :

- Erreurs TypeScript au démarrage
- API retourne 500 Internal Server Error
- Aucun snapshot créé
- duration_ms > 30000 (trop lent)
- api_calls > 2 pour 10 tweets (pas de batch)

---

## 🐛 Debugging

### Voir les logs en temps réel

```bash
# Terminal avec npm run dev
# Les logs apparaîtront ici :
[INFO] Starting batch update for 10 tweets
[INFO] Processing 1 batches (10 tweets per batch)
[DEBUG] Successfully updated engagement for tweet 1989487260098498754
[INFO] Batch update completed { successful: 10, failed: 0, ... }
```

### Si erreur "Failed to fetch tweets from Twitter API"

**Cause** : Tweet supprimé ou compte privé

**Solution** : Normal, le système marque automatiquement ces tweets comme `cold`

### Si erreur "Database connection failed"

**Cause** : Problème de connexion Supabase

**Vérifications** :
```bash
# Vérifier les variables d'environnement
cat .env.local | grep SUPABASE

# Doit contenir :
NEXT_PUBLIC_SUPABASE_URL=https://rgegkezdegibgbdqzesd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_4EUlULaDjOxNHaBSHdtzUw_jZe4VUCK
```

### Si erreur "Rate limit exceeded"

**Cause** : Trop d'appels API trop rapidement

**Solution** : Augmenter le délai entre batches dans `engagement-updater.ts`:
```typescript
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms
```

---

## 📊 Résultats Attendus

### Performance

Pour 10 tweets :
- **API calls** : 1 (batch)
- **Durée totale** : 2-5 secondes
- **Latence moyenne** : 1500-3000ms par call
- **Success rate** : 80-100%

Pour 100 tweets :
- **API calls** : 5 (5 batches de 20)
- **Durée totale** : 10-20 secondes
- **Success rate** : 90-100%

### Base de données

Après test de 10 tweets :
```sql
-- twitter_engagement_history : +10 rows
-- twitter_engagement_tracking : 10 rows updated (update_count +1)
-- twitter_tweets : 10 rows updated (métriques fraîches)
```

---

## 🚀 Si tout fonctionne

### Prochaines étapes :

1. **Tester avec plus de tweets** (limit: 50, puis 100)
2. **Vérifier la courbe d'évolution** dans `twitter_engagement_history`
3. **Configurer QStash** pour automatiser (every 10 min)
4. **Intégrer à l'UI** (bouton refresh + courbe)

### Configuration QStash :

```bash
# Sur Upstash Console : https://console.upstash.com/qstash
Schedule Name: twitter-engagement-update
URL: https://gorgone.onrender.com/api/twitter/engagement/update
Method: POST
Schedule: */10 * * * * (every 10 minutes)
Headers:
  Authorization: Bearer new1_efb60bb213ed46489a8604d92efc1edb
Body:
  {"limit": 100}
```

---

## ✅ Checklist de test

- [ ] npm run dev démarre sans erreur
- [ ] GET /api/twitter/engagement/update retourne les stats
- [ ] POST /api/twitter/engagement/update avec limit=10 fonctionne
- [ ] 10 snapshots créés dans twitter_engagement_history
- [ ] 10 tweets mis à jour dans twitter_tweets
- [ ] 10 tracking records mis à jour dans twitter_engagement_tracking
- [ ] Durée < 10 secondes pour 10 tweets
- [ ] Logs affichent "Batch update completed"
- [ ] Aucune erreur dans la console
- [ ] Tester avec limit=50 (succès)
- [ ] Tester avec limit=100 (succès)
- [ ] Configurer QStash (optionnel pour MVP)

---

**Status** : Prêt pour les tests ! 🚀

**Prochaine action** : Lancer `npm run dev` et tester avec l'endpoint GET puis POST.

