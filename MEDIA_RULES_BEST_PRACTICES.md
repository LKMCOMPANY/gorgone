# 📋 Media Rules - Best Practices Guide

**Date**: December 4, 2025  
**Status**: Production Ready  
**Quality**: Government-Grade

---

## ✅ **RÉSUMÉ EXÉCUTIF**

### Problème Résolu

Event Registry API a un **bug avec les phrases multi-mots combinées avec l'opérateur OR**, ce qui donne 0 résultats même quand les articles existent.

### Solution Implémentée

**Une règle = Un keyword**

Cette approche simple résout tous les problèmes et offre de meilleurs avantages:

---

## 🎯 **NOUVELLE ARCHITECTURE**

### Mode Simple (Recommandé)

```
✅ UNE RÈGLE PAR KEYWORD

Exemple pour IHC:
├── Règle 1: "International Holding Company" → 263 articles
├── Règle 2: "Basar Shueb" → 35 articles
└── Règle 3: "IHC" + "Abu Dhabi" (AND) → 19 articles

Total: 3 règles simples, 317+ articles collectés
```

### ❌ Ancien Pattern (Ne Fonctionne Pas)

```
❌ UNE RÈGLE AVEC MULTIPLES KEYWORDS + OR

Règle IHC:
└── ["International Holding Company", "IHC Abu Dhabi", "Basar Shueb"] + OR
    → 0 résultats (bug Event Registry API)
```

---

## 🔧 **CHANGEMENTS UX**

### Formulaire Media Rule Dialog

**AVANT**:
```typescript
Keywords: "keyword1, keyword2, keyword3"
Help text: "Use commas to separate multiple keywords"
```

**APRÈS**:
```typescript
Keyword or Phrase: "International Holding Company"
Help text: "💡 Best Practice: Create one rule per keyword"
          "Avoid multiple keywords - create separate rules instead"
```

**Comportement**:
- ✅ Pas de split par virgules
- ✅ Traite l'input comme UN SEUL keyword ou phrase
- ✅ Encourage la création de plusieurs règles
- ✅ Time window par défaut: 31 jours (meilleure couverture)

---

## 💡 **AVANTAGES**

### 1. **Contourne les Bugs API**

Event Registry API fonctionne mal avec:
- ❌ Multi-phrases + OR operator
- ❌ Keywords complexes combinés

Fonctionne parfaitement avec:
- ✅ Un seul keyword ou phrase par requête
- ✅ AND operator pour 2 mots (ex: "IHC" + "Abu Dhabi")

### 2. **Meilleur Tracking**

```
Avec 1 règle multi-keywords:
❓ "100 articles collectés" → Lesquels viennent de quel keyword ?

Avec 1 règle par keyword:
✅ "International Holding Company" → 45 articles
✅ "Basar Shueb" → 12 articles
✅ "IHC Abu Dhabi" → 8 articles
→ Visibilité totale par source
```

### 3. **Flexibilité**

```
✅ Activer/désactiver chaque keyword individuellement
✅ Ajuster fetch_interval par importance
✅ Modifier un keyword sans affecter les autres
✅ Tester de nouveaux keywords facilement
```

### 4. **Performance**

```
✅ Les règles s'exécutent indépendamment
✅ Si une règle échoue, les autres continuent
✅ Batching intelligent (10 règles/exécution)
✅ Pas de timeout même avec 50+ règles
```

---

## 📊 **EXEMPLE RÉEL: Zone IHC**

### Configuration Finale

| Règle | Keyword(s) | Opérateur | Articles Trouvés | Interval |
|-------|-----------|-----------|------------------|----------|
| IHC - International Holding Company | `"International Holding Company"` | - | 263 | 3h |
| IHC - Basar Shueb | `"Basar Shueb"` | - | 35 | 3h |
| IHC - Abu Dhabi Context | `["IHC", "Abu Dhabi"]` | AND | 19 | 3h |

**Total**: 317+ articles uniques couvrant tous les aspects IHC

### Paramètres Optimaux

```typescript
{
  fetch_interval_minutes: 180,  // 3h (économise API calls)
  articles_per_fetch: 50,       // 50 articles/fetch
  force_max_data_time_window: 31,  // Chercher sur 31 jours
  sort_by: "date",              // Les plus récents d'abord
  is_active: true
}
```

---

## 🚀 **GUIDE UTILISATEUR**

### Comment Créer des Règles Efficaces

#### ✅ **DO - Bonnes Pratiques**

1. **Une règle par keyword principal**
   ```
   ✅ Règle 1: "International Holding Company"
   ✅ Règle 2: "Basar Shueb"
   ✅ Règle 3: "Climate Change"
   ```

2. **Utiliser des phrases exactes entre guillemets** (Event Registry les reconnaît)
   ```
   ✅ "International Holding Company"  (phrase exacte)
   ✅ "Syed Basar Shueb"  (nom complet)
   ```

3. **Utiliser AND pour contexte spécifique**
   ```
   ✅ Keyword 1: "IHC" + Keyword 2: "Abu Dhabi" (AND)
   → Articles mentionnant IHC dans le contexte Abu Dhabi
   ```

4. **Interval adapté à la fréquence de publication**
   ```
   ✅ Topic très actif (Dubai News): 60 min
   ✅ Topic moyen (IHC): 180 min (3h)
   ✅ Topic rare (personne spécifique): 360 min (6h)
   ```

#### ❌ **DON'T - À Éviter**

1. **Ne PAS mettre plusieurs keywords dans une règle**
   ```
   ❌ "IHC, International Holding Company, Basar Shueb"
   → Risque 0 résultats (bug API)
   ```

2. **Ne PAS utiliser keywords trop génériques seuls**
   ```
   ❌ "IHC" seul → 1,542 articles non pertinents
   ✅ "IHC" + "Abu Dhabi" (AND) → 19 articles pertinents
   ```

3. **Ne PAS mettre interval trop court**
   ```
   ❌ 15 min pour keyword rare → Gaspille API calls
   ✅ 180 min (3h) → Optimal pour la plupart des cas
   ```

---

## 🔍 **TESTING WORKFLOW**

### Avant de Créer une Règle

1. **Tester le keyword individuellement**:
   ```bash
   # Via API directe
   keyword: "International Holding Company"
   → Vérifier nombre de résultats (> 0 ?)
   ```

2. **Vérifier la pertinence**:
   ```
   Si > 1000 articles: Trop générique, affiner
   Si 50-500 articles: Parfait
   Si < 10 articles: Peut-être trop spécifique
   Si 0 articles: Keyword n'existe pas dans Event Registry
   ```

3. **Créer la règle et tester manuellement**:
   ```
   Settings → Media tab → "Fetch Now"
   → Vérifier que des articles arrivent
   ```

4. **Vérifier le feed**:
   ```
   Feed → Media tab
   → Les articles sont pertinents ?
   ```

---

## 📈 **MONITORING**

### Indicateurs de Santé

```typescript
// Règle en bonne santé
{
  last_fetch_status: "success",
  articles_collected: > 0,
  last_fetch_error: null,
  is_active: true
}

// Règle problématique
{
  last_fetch_status: "error",
  articles_collected: 0,  // Après plusieurs fetches
  last_fetch_error: "API rate limit exceeded",
  → Action: Augmenter fetch_interval_minutes
}
```

### Alertes à Surveiller

1. **0 articles collectés après 7 jours**:
   - ⚠️ Keyword n'existe pas dans Event Registry
   - ✅ Ajuster ou désactiver la règle

2. **Erreurs répétées**:
   - ⚠️ API rate limit atteint (max 50 calls/jour gratuit)
   - ✅ Réduire nombre de règles actives ou augmenter intervals

3. **Trop d'articles non pertinents**:
   - ⚠️ Keyword trop générique
   - ✅ Ajouter contexte avec AND operator

---

## 🎓 **EXEMPLES PAR CAS D'USAGE**

### 1. Monitoring d'une Entreprise

```typescript
Zone: "Acme Corp"
Règles:
├── "Acme Corporation" (nom officiel)
├── "Acme Corp CEO" (mentions dirigeants)
├── ["Acme", "acquisition"] AND (activité M&A)
└── ["Acme", "lawsuit"] AND (risques légaux)
```

### 2. Monitoring d'une Personnalité

```typescript
Zone: "John Doe"
Règles:
├── "John Doe" (nom complet)
├── ["John Doe", "UAE"] AND (contexte géographique)
└── ["John Doe", "investment"] AND (activité financière)
```

### 3. Monitoring Sectoriel

```typescript
Zone: "Tech Industry UAE"
Règles:
├── ["artificial intelligence", "UAE"] AND
├── ["fintech", "Dubai"] AND
├── ["startup", "Abu Dhabi"] AND
└── ["technology", "emirates"] AND
```

### 4. Monitoring Crise/Événement

```typescript
Zone: "Climate Summit 2025"
Règles:
├── "COP30" (nom événement)
├── "Climate Summit UAE"
├── ["climate change", "Dubai"] AND
└── ["carbon emissions", "UAE"] AND

Paramètres spéciaux:
- fetch_interval_minutes: 60 (1h - événement en cours)
- articles_per_fetch: 100 (volume élevé)
```

---

## 🛠️ **DÉPANNAGE**

### Problème: 0 Articles Collectés

**Diagnostic**:
```typescript
1. Tester le keyword seul via API test
   → Nombre de résultats ?

2. Si > 0 mais règle donne 0:
   - Vérifier force_max_data_time_window (31 jours?)
   - Vérifier articles_per_fetch (assez élevé?)
   
3. Si toujours 0:
   - Simplifier le keyword
   - Retirer contexte (AND) temporairement
   - Tester avec keyword plus générique
```

### Problème: Trop d'Articles Non Pertinents

**Solution**:
```typescript
// Ajouter du contexte avec AND
AVANT: "IHC" → 1,542 articles (bruit)
APRÈS: ["IHC", "Abu Dhabi"] AND → 19 articles (signal)
```

### Problème: API Rate Limit

**Solution**:
```typescript
// Réduire fréquence de fetch
AVANT: 15 règles × fetch_interval 60min = 15 calls/h
APRÈS: 15 règles × fetch_interval 180min = 5 calls/h

// OU désactiver règles peu productives
```

---

## 📚 **RESSOURCES**

### Event Registry Documentation

- API Docs: https://newsapi.ai/documentation
- Query Language: https://github.com/EventRegistry/event-registry-python/wiki/Query-language
- Quota: 50 API calls/jour (plan gratuit)

### Gorgone Internal

- Migration: `migrations/20251204_allow_same_article_multiple_zones.sql`
- Worker: `lib/workers/media/article-fetcher.ts`
- Data Layer: `lib/data/media/`
- UI Component: `components/dashboard/zones/media/media-rule-dialog.tsx`

---

## ✅ **CHECKLIST CRÉATION RÈGLE**

Avant de créer une règle media:

- [ ] J'ai testé le keyword individuellement (vérifié > 0 résultats)
- [ ] Le keyword est spécifique à mon besoin
- [ ] J'ai UN SEUL keyword principal par règle
- [ ] J'ai défini un interval adapté (180min par défaut)
- [ ] J'ai mis force_max_data_time_window = 31 jours
- [ ] J'ai un nom de règle clair et descriptif
- [ ] Je ferai un "Fetch Now" après création pour tester

---

## 🎉 **CONCLUSION**

La stratégie **"Une règle = Un keyword"** est:

✅ **Simple**: Facile à comprendre et gérer  
✅ **Fiable**: Contourne les bugs Event Registry API  
✅ **Flexible**: Contrôle granulaire par keyword  
✅ **Trackable**: Visibilité parfaite sur chaque source  
✅ **Scalable**: Fonctionne de 1 à 100+ règles  

**Recommandation**: Suivez ce guide pour créer des règles media robustes et performantes.

---

*Document créé: December 4, 2025*  
*Dernière mise à jour: December 4, 2025*  
*Version: 1.0 - Production Ready*

