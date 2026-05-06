# Checklist Go-Live — ImmoBF Africa

À dérouler **dans l'ordre** avant d'annoncer publiquement la plateforme.
Chaque case doit être validée par une commande ou une capture d'écran.

---

## J-1 : préparation

### Infrastructure
- [ ] Domaine `immobf.africa` actif (résolution DNS OK depuis 3 FAI différents)
- [ ] SSL valide jusqu'à au moins J+90 sur `immobf.africa`, `www.immobf.africa`, `api.immobf.africa`
- [ ] Backend Railway répond 200 sur `/api/v1/health`
- [ ] Frontend Vercel répond 200 sur `/` et `/properties`
- [ ] Backups Postgres activés (daily, retention 7 j minimum)
- [ ] MongoDB Atlas M0 connecté et écrit (vérifier collection `payment_events`)
- [ ] Redis répond (vérifier via `railway run redis-cli PING`)

### Sécurité
- [ ] `JWT_SECRET` ≥ 64 caractères aléatoires, jamais commit
- [ ] Tous les `*_WEBHOOK_SECRET` configurés des deux côtés (Railway + dashboard opérateur)
- [ ] `CORS_ORIGINS` ne contient PAS `*` ni `localhost`
- [ ] Endpoint `/api/v1/payments/mock-succeed` désactivé (`NODE_ENV=production` le bloque)
- [ ] Rate limit actif : `curl` 70 fois en 60 s sur `/properties` doit déclencher 429
- [ ] Aucune clé secrète visible dans les logs (`railway logs | grep -i secret`)
- [ ] Variables Vercel `NEXT_PUBLIC_*` ne contiennent QUE des valeurs publiques

### Légal et conformité
- [ ] Page `/legal/cgu` rédigée et accessible (CGU)
- [ ] Page `/legal/privacy` rédigée (politique de confidentialité, mention BCEAO)
- [ ] Page `/legal/cookies` (bandeau cookies fonctionnel)
- [ ] Email contact `support@immobf.africa` opérationnel (test : envoyer + recevoir)
- [ ] Email sécurité `security@immobf.africa` documenté dans `/.well-known/security.txt`

---

## J-0 : smoke tests post-deploy

### Auth
```bash
# Register
curl -X POST https://api.immobf.africa/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234!","name":"Smoke"}'
# → 201 Created, retourne user + access_token

# Login
curl -X POST https://api.immobf.africa/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234!"}'
# → 200 OK + tokens

# Mauvais password
curl -X POST https://api.immobf.africa/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"wrong"}'
# → 401 Unauthorized
```

- [ ] Register OK
- [ ] Login OK
- [ ] Login avec mauvais password → 401
- [ ] Refresh token roule (vérifier rotation)

### Properties
```bash
# Liste publique
curl https://api.immobf.africa/api/v1/properties | jq '.results | length'
# → > 0 si seed actif

# Recherche géo (Ouagadougou centre, rayon 10 km)
curl "https://api.immobf.africa/api/v1/properties?lat=12.3686&lng=-1.5275&radius_km=10"

# Estimation prix
curl -X POST https://api.immobf.africa/api/v1/properties/estimate \
  -H "Content-Type: application/json" \
  -d '{"city":"Ouagadougou","type":"villa","area_m2":250}'
```

- [ ] GET `/properties` retourne ≥ 5 résultats (seed)
- [ ] Recherche par rayon fonctionne (PostGIS)
- [ ] Estimation prix retourne `{value, confidence, comparables}`
- [ ] Filtres `min_price`/`max_price`/`type` fonctionnent

### Frontend
- [ ] Page d'accueil charge en < 2,5 s (Lighthouse mobile)
- [ ] Recherche par ville → résultats affichés sur carte ET liste
- [ ] Détail annonce affiche photos, prix, calcul acompte
- [ ] Click "Payer acompte" ouvre la modal paiement
- [ ] Sélection opérateur affiche le bon code USSD
- [ ] Changement de langue (FR → EN → Mooré → Dioula) persiste
- [ ] PWA installable (Chrome desktop : icône + dans la barre d'URL)
- [ ] Mode offline : couper le wifi, recharger → service worker sert le shell

### Paiements - test live 100 FCFA

⚠️ Faire **un par opérateur** avec un vrai téléphone et un vrai compte mobile money.

| Opérateur     | Montant test | Webhook reçu | Tx → succeeded | Escrow créé | PDF généré |
|---------------|--------------|--------------|----------------|-------------|------------|
| Orange Money  | 100 FCFA     | [ ]          | [ ]            | [ ]         | [ ]        |
| Moov Money    | 100 FCFA     | [ ]          | [ ]            | [ ]         | [ ]        |
| Wave          | 100 FCFA     | [ ]          | [ ]            | [ ]         | [ ]        |
| CinetPay      | 100 FCFA     | [ ]          | [ ]            | [ ]         | [ ]        |

Pour chaque opérateur, vérifier dans Railway logs :
```
[webhook] orange-money signature OK external_id=...
[webhook] orange-money status=succeeded amount=100 XOF
[escrow] created for transaction <id>
[pdf] receipt generated /tmp/receipts/<ref>.pdf
```

### Paiements - cas d'erreur
- [ ] Webhook avec mauvaise signature → 401 + log warning
- [ ] Webhook répété (même `external_id`) → 200 mais pas de double traitement (idempotence)
- [ ] Initier un paiement avec opérateur inconnu → 400 `unknown_provider`
- [ ] Initier un paiement avec montant 0 → 400 `invalid_amount`
- [ ] Webhook avec status `failed` → transaction `failed`, pas d'escrow

### Admin
- [ ] Login `admin@immobf.africa` → accès dashboard
- [ ] Stats par ville s'affichent (Ouagadougou, Bobo)
- [ ] Export CSV des transactions fonctionne (`/admin/export.csv`)
- [ ] Modération annonce : suspend/restaure une annonce → reflété sur le frontend en < 30 s
- [ ] Libération escrow manuelle → tx → `released`, log MongoDB

---

## J+0 : annonce publique

- [ ] Post LinkedIn / Twitter / Facebook avec lien et capture
- [ ] Mail aux 50 premiers testeurs (newsletter)
- [ ] Tag UptimeRobot status page → public
- [ ] Activer Plausible analytics (vérifier que les vues remontent)
- [ ] Surveillance active 4 h après le lancement (équipe sur Slack)

---

## J+1 à J+7 : monitoring rapproché

### Quotidien
- [ ] Vérifier UptimeRobot : aucune alerte
- [ ] Vérifier Sentry : taux d'erreur < 0.5 %
- [ ] Vérifier Railway logs : aucune ERROR non triée
- [ ] Vérifier MongoDB : tous les `payment_events` ont `signature_valid: true`

### Hebdo
- [ ] Revue des transactions pending > 24 h (lancer le script de réconciliation)
- [ ] Backup test restore : restaurer un backup Postgres dans une DB temporaire
- [ ] Lighthouse audit : score perf ≥ 80 mobile

---

## Critères de succès semaine 1

| Métrique                     | Cible        | Mesure |
|------------------------------|--------------|--------|
| Uptime                       | > 99.5 %     |        |
| Latence p95 API              | < 600 ms     |        |
| Inscriptions                 | > 100        |        |
| Annonces publiées            | > 30         |        |
| Paiements aboutis            | > 10         |        |
| Taux d'échec webhook         | < 1 %        |        |
| Taux de fraude détectée IA   | tracking only |       |
| NPS premiers testeurs        | > 40         |        |

---

## Plan B - rollback rapide

Si métrique critique en panne :

1. **API down** : Railway → service backend → redeploy version précédente (1 click).
2. **Frontend cassé** : `vercel rollback` (CLI) ou dashboard Vercel.
3. **Base corrompue** : restore backup Railway (UI) → switch DATABASE_URL temporairement.
4. **Webhook opérateur en panne** : désactiver le provider via env var (`OM_DISABLED=true`) puis redéployer ; les autres opérateurs continuent.

---

## Contact d'urgence

| Rôle              | Nom        | Téléphone     | Email                   |
|-------------------|------------|---------------|-------------------------|
| Tech lead         | _________ | +226 ___      | tech@immobf.africa      |
| Support n1        | _________ | +226 ___      | support@immobf.africa   |
| Sécurité          | _________ | +226 ___      | security@immobf.africa  |
| CinetPay          | -          | +225 ___      | merchant@cinetpay.com   |
| Orange BF marchand| _________ | -             | -                       |

À remplir avant le J-1.
