# Intégration PawaPay — plan d'action

Objectif : ajouter PawaPay comme option supplémentaire pour le Burkina Faso, en complément de CinetPay (pas en remplacement — même opérateurs BF couverts : Orange Money + Moov Money). Intérêt principal : inscription self-service (pas de formulaire commercial filtrant le BF comme Wave/Flutterwave), et solution déjà utilisée en production par Canal Box en Afrique francophone.

---

## 1. Couverture confirmée (recherche du 25/06/2026)

| Élément | Détail |
|---|---|
| Pays | 20 pays africains, dont le Burkina Faso (confirmé sur `pawapay.io/markets`) |
| Opérateurs BF | `MOOV_BFA` (Moov Money), `ORANGE_BFA` (Orange Money) — voir `docs.pawapay.io/v2/docs/providers` |
| Devise BF | XOF |
| Carte bancaire | ❌ Non — mobile money uniquement (comme CinetPay actuellement) |
| Inscription | Self-service : `pawapay.io/plans` → "Create account" → accès direct à un compte **sandbox** (pas de validation préalable nécessaire pour tester) |
| Tarifs | Plan Standard : 1% + frais MMO (collections, payouts, refunds, remittances) |
| Société | PawaPay UK Limited (Royaume-Uni) |

**Nuance importante côté Orange Money BF** : dans le tableau des providers, `ORANGE_BFA` a un type d'autorisation `PREAUTH` (contrairement à `MOOV_BFA` qui est `PROVIDER_AUTH`, un simple push USSD). `PREAUTH` signifie que le client doit obtenir un code OTP via USSD **avant** l'appel à l'API deposit, et ce code doit être transmis dans `preAuthorisationCode`. Ce n'est pas un push-and-approve simple comme pour les autres providers déjà codés (CinetPay, FedaPay) — à valider précisément avec le support PawaPay ou en sandbox avant de l'activer pour Orange BF. Moov BF (`PROVIDER_AUTH`) n'a pas cette contrainte.

---

## 2. Étapes

1. [ ] **Toi** : créer un compte sur [pawapay.io/plans](https://www.pawapay.io/plans) → "Create account" (accès sandbox immédiat, aucune validation préalable requise pour tester).
2. [ ] **Toi** : dans le dashboard sandbox (`dashboard.sandbox.pawapay.io`), générer un **API token** (menu config → API tokens) et configurer une **callback URL** (menu config → Callback URLs).
3. [ ] **Moi** : une fois le token obtenu, finaliser `PawaPayProvider.js` (squelette déjà créé, voir section 3) et l'enregistrer dans `PaymentProviderRegistry.js`.
4. [ ] **Toi** : coller la variable d'env `PAWAPAY_API_TOKEN` (sandbox) sur Railway ou en local.
5. [ ] **Test sandbox** : initier un dépôt test sur `MOOV_BFA` (push simple) avec un [numéro de test PawaPay](https://docs.pawapay.io/v2/docs/test_numbers) — pas de vrai argent en sandbox.
6. [ ] **Investiguer le flux OTP Orange BF** (`PREAUTH`) avant de l'activer côté UI — sinon le laisser désactivé et ne proposer que Moov BF via PawaPay dans un premier temps.
7. [ ] Une fois validé en sandbox : compléter l'onboarding PawaPay (KYC — réutiliser le dossier RCCM/IFU/statuts/CNI déjà assemblé pour FedaPay/CinetPay) pour débloquer le compte production.
8. [ ] Générer un nouveau token **production** et mettre à jour les variables Railway.

---

## 3. Code — squelette du provider

Fichier : `backend/src/services/PawaPayProvider.js` (voir fichier créé). Points clés :
- Auth : un seul `Bearer <token>` (pas de site_id/secret séparés comme CinetPay).
- `initiate()` : `POST /deposits` avec `depositId` (UUIDv4), `amount` (string), `currency: "XOF"`, `payer: { type: "MMO", accountDetails: { phoneNumber, provider } }`.
- Statut retourné à l'initiation : `ACCEPTED` (pas encore final) — le statut définitif (`COMPLETED`/`FAILED`) arrive par callback ou via `GET /deposits/{depositId}`.
- Webhook : callbacks PawaPay sont **non signés par défaut** (signature RFC-9421/ECDSA optionnelle, à activer plus tard dans le dashboard si besoin — plus complexe que le HMAC simple de CinetPay/FedaPay). Pour le MVP, on fait confiance à l'IP/au secret partagé dans l'URL de callback, comme première mesure.

---

## 4. KYC à anticiper

PawaPay (société UK) demandera probablement : certificat d'enregistrement de société, preuve d'adresse, pièce d'identité du dirigeant, description de l'activité. Base réutilisable : `docs/KYC_FEDAPAY_DOSSIER.md`.

---

## 5. Résumé des avantages/inconvénients vs CinetPay

| | CinetPay | PawaPay |
|---|---|---|
| Inscription | Formulaire commercial (en attente de validation depuis 09/06) | Self-service, sandbox immédiat |
| Opérateurs BF | Orange, Moov (mobile money via leur agrégation) | Orange (`PREAUTH`, plus complexe), Moov (`PROVIDER_AUTH`, simple) |
| Carte | Temporairement indisponible | Non proposée du tout |
| Société | Côte d'Ivoire (zone XOF, francophone) | UK |
| Utilisé par | — | Canal Box (référence terrain BF) |

Conclusion : PawaPay est un bon plan B/parallèle à CinetPay pendant que la validation commerciale CinetPay traîne, surtout pour Moov BF (flux simple). Pas un remplacement total tant que le flux OTP Orange BF n'est pas clarifié.
