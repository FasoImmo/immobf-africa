# Activation FedaPay — guide ImmoBF Africa

Vous êtes sur https://live.fedapay.com/auth/activate-account et vous voulez savoir exactement quoi fournir, dans quel ordre, pour que le compte soit validé vite et que l'on puisse brancher l'API en prod.

Ce guide est spécifique au cas ImmoBF Africa (immobilier, montants élevés, escrow). Il complète la doc officielle https://docs.fedapay.com.

---

## 1. Pourquoi FedaPay et non un wallet direct

| Critère                  | FedaPay                                  | Contrat direct (Orange/Moov/Wave)        |
|--------------------------|-------------------------------------------|------------------------------------------|
| Délai d'activation       | 3 à 7 jours ouvrés                        | 4 à 12 semaines                           |
| Contrats à signer        | 1 (FedaPay)                               | 1 par opérateur                           |
| Couverture pays          | BJ, BF, CI, SN, TG, NE, ML, GN            | Pays par pays                             |
| Wallets exposés          | Orange, Moov, MTN, Wave + cartes          | Un seul wallet à la fois                  |
| Frais typiques (mobile)  | ~1.5 à 2.5 %                              | ~1 à 1.8 % négociés                       |
| Settlement (réception)   | T+2 à T+3 vers RIB UEMOA                  | Variable selon opérateur                  |
| Effort tech              | 1 provider à intégrer (déjà fait)         | 1 par wallet                              |
| Idéal pour               | MVP / pilote / Afrique multi-pays         | Volume mensuel > 50 M FCFA                |

**Verdict pour le MVP** : FedaPay seul suffit. On garde l'archi modulaire pour ajouter les contrats directs plus tard, quand le volume justifie la négociation.

---

## 2. Documents à préparer AVANT de cliquer "Activer"

FedaPay refuse les dossiers incomplets ; mieux vaut tout réunir d'abord.

### 2.1 Personne morale (recommandé pour l'immobilier)

- **Statuts de la société** (SARL/SA/SAS) signés et enregistrés.
- **RCCM** (registre du commerce) — extrait < 3 mois.
- **IFU** (Identifiant Fiscal Unique) délivré par la DGI Burkina.
- **Justificatif de domiciliation** : facture SONABEL/ONEA/téléphone < 3 mois au nom de la société.
- **Pièce d'identité du dirigeant** : CNIB recto/verso ou passeport.
- **Pouvoir / nomination** du dirigeant si différent du fondateur.
- **RIB UEMOA** où FedaPay versera les fonds (Coris, Ecobank, UBA, BOA…).

### 2.2 Personne physique (auto-entrepreneur)

Possible mais limité (montants plus faibles, KYC renforcé) :
- CNIB recto/verso
- Justificatif de domicile < 3 mois
- RIB personnel
- Selfie tenant la pièce d'identité

> 💡 **Conseil** : pour ImmoBF qui manipule des dépôts > 1 M FCFA en un seul paiement, démarrer en personne morale dès le départ évite des plafonds bloquants.

### 2.3 Justifications spécifiques immobilier

FedaPay applique un KYC renforcé sur l'immobilier (risque LBC/FT). Préparez :

- **Description de l'activité** : « Plateforme de petites annonces immobilières + collecte d'acomptes/commissions/abonnements agences » (1 paragraphe).
- **URL du site** : `https://immobf.africa` (le site doit être en ligne, ne serait-ce qu'une landing — voir Phase 3 de [DEPLOY_PROD.md](./DEPLOY_PROD.md)).
- **Volume estimé** :
  - Mois 1-3 : ~5 M FCFA / mois (pilote Ouaga)
  - Mois 4-12 : ~30 M FCFA / mois (extension UEMOA)
- **Ticket moyen attendu** : 100 000 à 5 000 000 FCFA (acompte 5 % d'un bien à 50 M).
- **Mention Conditions Générales d'Utilisation** + politique de confidentialité accessibles publiquement.

---

## 3. Parcours d'activation (étape par étape)

### 3.1 Création du compte (5 min)

Sur https://live.fedapay.com/auth/activate-account :
1. Email professionnel (`founder@immobf.africa` plutôt que Gmail perso).
2. Numéro mobile vérifié par OTP.
3. Mot de passe ≥ 12 caractères + 2FA TOTP (recommandé : Aegis ou 1Password).

### 3.2 Profil entreprise (15 min)

- Raison sociale exacte (telle qu'au RCCM).
- Forme juridique (SARL).
- Pays : Burkina Faso.
- Secteur : « Immobilier — petites annonces » (souvent classé sous « Services » ou « Tech »).
- IFU.
- Adresse complète + code postal Ouagadougou.

### 3.3 Upload des justificatifs (10 min)

PDF ou JPEG ≤ 10 Mo. Nommer clairement :
- `RCCM_immobf.pdf`
- `IFU_immobf.pdf`
- `STATUTS_immobf_signes.pdf`
- `RIB_coris_immobf.pdf`
- `CNI_dirigeant_recto.jpg` + `CNI_dirigeant_verso.jpg`

### 3.4 Soumission au KYC (immédiat)

FedaPay envoie un email de confirmation. Délai d'instruction : **3 à 7 jours ouvrés**. Réponse possible :
- ✅ Validé → accès au mode **Live**.
- ⚠ Pièces complémentaires demandées (souvent : justificatif d'activité avec URL en ligne).
- ❌ Refus (rare si dossier propre).

---

## 4. En attendant la validation : mode Sandbox

L'intégration ImmoBF est **déjà branchée** côté code. Vous pouvez tester immédiatement en mode sandbox :

### 4.1 Récupérer les clés sandbox

Dashboard FedaPay → onglet **Mode** : basculer sur **Sandbox** → **API Keys** :
- `pk_sandbox_xxxxxxxxxx` (publique, OK côté frontend)
- `sk_sandbox_xxxxxxxxxx` (secrète, **uniquement** côté backend)

### 4.2 Coller dans Railway

```bash
cd backend
railway variables set --service backend \
  FEDAPAY_LIVE=false \
  FEDAPAY_PUBLIC_KEY=pk_sandbox_xxxxxxxxxx \
  FEDAPAY_SECRET_KEY=sk_sandbox_xxxxxxxxxx \
  FEDAPAY_NOTIFY_URL=https://api.immobf.africa/api/v1/payments/webhooks/fedapay \
  FEDAPAY_RETURN_URL=https://immobf.africa/payment/return
```

Pas de `FEDAPAY_WEBHOOK_SECRET` au début — voir 4.4.

### 4.3 Test E2E sandbox (5 min)

```bash
# 1. Login un user de test
TOKEN=$(curl -s -X POST https://api.immobf.africa/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"acheteur@demo.bf","password":"demo1234"}' \
  | jq -r .access_token)

# 2. Récupérer un property_id
PROP_ID=$(curl -s https://api.immobf.africa/api/v1/properties | jq -r '.results[0].id')

# 3. Initier un paiement FedaPay sandbox
curl -X POST https://api.immobf.africa/api/v1/payments/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"provider\": \"fedapay\",
    \"property_id\": \"$PROP_ID\",
    \"amount\": 4250000,
    \"currency\": \"XOF\",
    \"purpose\": \"deposit\",
    \"customer_phone\": \"+22670000001\",
    \"customer_email\": \"acheteur@demo.bf\",
    \"preferred_operator\": \"orange\"
  }"
```

La réponse contient un `payment_url` vers le checkout FedaPay sandbox. Ouvrir → choisir Orange Money → numéro test fourni par FedaPay (ex: `66000000`) → valider.

### 4.4 Configurer le webhook sandbox

Dashboard sandbox → **Webhooks** → **Add endpoint** :
- URL : `https://api.immobf.africa/api/v1/payments/webhooks/fedapay`
- Events : `transaction.approved`, `transaction.declined`, `transaction.canceled`, `transaction.refunded`
- Copier le **Signing secret** affiché → `FEDAPAY_WEBHOOK_SECRET` côté Railway.
- Redéployer backend (`git commit --allow-empty -m "trigger redeploy" && git push`).

Re-tester : le webhook doit maintenant arriver et être validé HMAC.

Logs Railway attendus :
```
[webhook] fedapay signature OK external_id=12345
[webhook] fedapay status=succeeded amount=4250000 XOF
[escrow] created for transaction <uuid>
[pdf] receipt generated /tmp/receipts/IMO-...-pdf
```

---

## 5. Bascule en Live (après validation KYC)

1. Dashboard FedaPay → **Mode → Live**.
2. **API Keys Live** → copier `pk_live_…` et `sk_live_…`.
3. Refaire les **Webhooks** côté Live (URL identique mais secret différent).
4. Coller dans Railway :

```bash
railway variables set --service backend \
  FEDAPAY_LIVE=true \
  FEDAPAY_PUBLIC_KEY=pk_live_xxxxxxxxxx \
  FEDAPAY_SECRET_KEY=sk_live_xxxxxxxxxx \
  FEDAPAY_WEBHOOK_SECRET=whsec_live_xxxxxxxxxx
```

5. **Test live obligatoire** : transaction réelle de **100 FCFA** sur votre propre numéro avant d'ouvrir au public.
6. Faire le même test pour chaque wallet supporté : Orange, Moov, MTN, Wave, carte Visa.
7. Vérifier que les fonds arrivent sur le RIB sous T+3.

Mettre à jour le tableau dans [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) au fur et à mesure.

---

## 6. Configuration commerciale dans le dashboard

À faire côté FedaPay (UI) une fois live :

- **Logo** ImmoBF Africa (PNG carré 512×512) → s'affiche sur la page de checkout.
- **Couleur primaire** `#0E7C66` (vert sahélien) → harmonise le checkout avec le site.
- **Adresse de support** affichée sur les reçus FedaPay : `support@immobf.africa`.
- **URLs return** : success / cancel séparées si vous voulez tracker (`?status=ok` vs `?status=ko`).
- **Notifications email FedaPay** : copier `payments@immobf.africa` en cc sur chaque transaction (utile pour réconcilier manuellement).

---

## 7. Frais et settlement

À titre indicatif (mai 2026, à reconfirmer dans votre contrat) :

| Wallet              | Frais facturés au marchand   |
|---------------------|------------------------------|
| Orange Money BF     | 1.8 %                        |
| Moov Money BF       | 1.8 %                        |
| Wave Sénégal/CI     | 1 %                          |
| MTN MoMo CI/SN      | 2 %                          |
| Carte Visa/MC       | 2.9 % + 100 FCFA fixe        |
| Settlement RIB      | gratuit, T+2 à T+3           |

Ces frais sont **prélevés au moment du settlement** (pas à chaque transaction). Notre commission applicative (2 %) se rajoute ; à voir si on l'absorbe ou la répercute à l'acheteur (voir [README.md](../README.md) section monétisation).

---

## 8. Limites à anticiper

- **Plafond par transaction Mobile Money BF** : ~ 1 000 000 FCFA (Orange/Moov). Pour un acompte de 4 250 000, l'acheteur devra fractionner ou payer par carte. Le frontend affiche déjà un avertissement quand `amount > 1_000_000`.
- **Plafond cumulé wallet/jour** : ~ 2 M FCFA. À documenter dans la modal de paiement (TODO frontend).
- **KYC acheteur** : pour les transactions > 5 M FCFA, FedaPay exige la pièce d'identité de l'acheteur. Notre flux escrow demande déjà une pièce au moment de signer la promesse de vente.

---

## 9. Quand ajouter les contrats directs

Bascule recommandée : passer FedaPay → Orange/Moov/Wave directs **quand**

- Volume mensuel > 50 M FCFA **OU**
- Nombre de transactions > 1000/mois **OU**
- Demande explicite des opérateurs (ils prospectent dès que le volume est visible).

Économie estimée : 0.5 à 1 point de frais (≈ 250 000 à 500 000 FCFA/mois sur 50 M).

L'archi est déjà prête : voir `OrangeMoneyProvider.js`, `MoovMoneyProvider.js`, `WaveProvider.js`. Activer = renseigner les env vars + ajouter le provider dans le payload `Payments.providers()`.

---

## 10. Support FedaPay

- Chat dashboard (heures bureau Cotonou).
- Email support : `support@fedapay.com`.
- Slack communauté Tech FedaPay (sur invitation après activation).
- Statut API : https://status.fedapay.com.
