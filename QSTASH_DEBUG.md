# QStash Worker Debug

**Problème** : Session reste en "pending", worker ne démarre pas

**Session créée** : `zone_975594d1-7acf-45aa-8b78-86cd56fced65_2025-11-18T15:05:20.282Z`  
**Status** : `pending` (depuis 10+ minutes)  
**Tweets échantillonnés** : 357 ✅

---

## Cause Probable

Le worker QStash n'a pas été appelé ou a échoué silencieusement.

**Worker URL attendue** :
```
https://gorgone-fneix1bbo-odissea.vercel.app/api/webhooks/qstash/opinion-map-worker
```

---

## Actions de Debug

### 1. Vérifier QStash Dashboard

**URL** : https://console.upstash.com/qstash

**Cherchez** :
- Messages récents
- Échecs de delivery
- Worker endpoint appelé ?

### 2. Tester Worker Endpoint Manuellement

```bash
curl -X POST https://gorgone-fneix1bbo-odissea.vercel.app/api/webhooks/qstash/opinion-map-worker \
  -H "Content-Type: application/json" \
  -d '{"session_id":"zone_975594d1-7acf-45aa-8b78-86cd56fced65_2025-11-18T15:05:20.282Z"}'
```

**Attendu** : 200 OK ou erreur spécifique

### 3. Vérifier Variables Vercel

S'assurer que :
- ✅ `AI_GATEWAY_API_KEY` est configuré
- ✅ `QSTASH_TOKEN` est configuré  
- ✅ `NEXT_PUBLIC_APP_URL` pointe vers le bon domaine

### 4. Solution Rapide

**Relancer manuellement** :

1. Dans Supabase, mettre status à 'pending'
2. Déclencher worker manuellement via curl
3. OU régénérer depuis l'UI

---

## Prochaine Étape

Vérifiez QStash dashboard et logs Vercel pour identifier l'erreur exacte.

