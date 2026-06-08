# Intégration CinetPay en parallèle de FedaPay — plan d'action

Objectif : garder **FedaPay** comme agrégateur principal là où il fonctionne bien (Bénin, Côte d'Ivoire, Sénégal…) et faire de **CinetPay** le fournisseur prioritaire pour le **Burkina Faso**, le temps que FedaPay rétablisse Orange/Moov BF et ajoute Wave BF (voir [FEDAPAY_TICKET_WAVE_BF.md](./FEDAPAY_TICKET_WAVE_BF.md)).

Bonne nouvelle : **le scaffold est déjà en place** — pas besoin de tout réécrire.

---

## 1. État actuel du code (déjà fait, à vérifier)

| Élément | Fichier | État |
|---|---|---|
| Provider CinetPay | `backend/src/services/CinetPayProvider.js` | ✅ Implémenté (appels API réels, pas un stub) |
| Enregistrement | `backend/src/services/PaymentProviderRegistry.js` | ✅ `cinetpay: new CinetPay()` déjà dans `instances` |
| Config / variables d'env | `backend/src/config/index.js` (lignes 85-90) | ✅ Bloc `cinetpay: { apiKey, siteId, secret, notifyUrl }` déjà câblé |
| Pays couverts déclarés | `CinetPayProvider.get countries()` | `["BF","CI","SN","ML","TG","BJ","CM"]` |

Donc l'essentiel du travail n'est **pas** d'écrire du code from scratch, mais de :
1. corriger deux points du provider existant qui généreraient les mêmes bugs déjà rencontrés avec FedaPay (signature webhook + lookup de référence),
2. renseigner les vraies clés API,
3. ajuster l'ordre d'affichage pour que CinetPay soit prioritaire au Burkina,
4. tester en sandbox.

---

## 2. Bugs à corriger AVANT d'activer CinetPay

### 2.1 Signature webhook (HMAC) — actuellement fausse

Le code actuel (ligne 84) calcule le HMAC sur le corps brut :

```js
const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
```

Or la documentation officielle CinetPay (`docs.cinetpay.com/api/1.0-fr/checkout/hmac`) précise que le token `x-token` est un HMAC-SHA256 calculé sur la **concaténation ordonnée de 16 champs précis** du corps de la requête — pas sur le JSON brut :

```
cpm_site_id + cpm_trans_id + cpm_trans_date + cpm_amount + cpm_currency + signature +
payment_method + cel_phone_num + cpm_phone_prefixe + cpm_language + cpm_version +
cpm_payment_config + cpm_page_action + cpm_custom + cpm_designation + cpm_error_message
```

C'est exactement le même type de piège que le format Stripe-like de FedaPay (`t=...,s=...`) qu'on a dû corriger en commit `b721a51`. Remplacement à faire dans `verifyWebhookSignature` :

```js
verifyWebhookSignature(headers, rawBody) {
  const { secret } = config.providers.cinetpay;
  if (!secret) return true; // stub mode

  const token = headers["x-token"] || headers["x-Token"] || "";
  if (!token) return false;

  let body;
  try {
    body = typeof rawBody === "string" ? JSON.parse(rawBody) : JSON.parse(rawBody.toString("utf8"));
  } catch {
    return false;
  }

  const data = [
    body.cpm_site_id, body.cpm_trans_id, body.cpm_trans_date, body.cpm_amount,
    body.cpm_currency, body.signature, body.payment_method, body.cel_phone_num,
    body.cpm_phone_prefixe, body.cpm_language, body.cpm_version, body.cpm_payment_config,
    body.cpm_page_action, body.cpm_custom, body.cpm_designation, body.cpm_error_message,
  ].map((v) => (v == null ? "" : String(v))).join("");

  const expected = crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
  return safeEqual(token, expected);
}
```

### 2.2 `parseWebhook` — le lookup de référence pointe au mauvais champ

Ligne 91 actuelle :

```js
reference: body?.cpm_custom || body?.transaction_id,
```

`cpm_custom` correspond au champ `metadata` envoyé à l'initialisation (ici on y met un objet JSON sérialisé, pas notre référence `IMO-...`). Notre référence (`reference` = `transaction_id` à l'initiation) revient dans `cpm_trans_id`. À corriger :

```js
parseWebhook(body) {
  return {
    external_id: body?.cpm_trans_id,
    reference: body?.cpm_trans_id,           // = notre transaction_id/reference d'origine
    status: body?.cpm_error_message === "SUCCES" || body?.cpm_result === "00" || body?.status === "ACCEPTED"
      ? "succeeded" : "failed",
    amount: body?.cpm_amount ? Number(body.cpm_amount) : null,
    currency: body?.cpm_currency || "XOF",
    raw: body,
  };
}
```

> Comme pour FedaPay, on garde le même filet de sécurité côté `paymentsController.webhook` : si `findByReference` échoue, fallback sur `findByExternalId("cinetpay", parsed.external_id)`. Avec `cpm_trans_id` utilisé pour les deux, ça devrait matcher du premier coup — mais le fallback ne coûte rien à garder.

### 2.3 Vérifier le statut succès exact

La doc liste `cpm_error_message` (texte du statut, ex. raison d'échec). Le mapping `"succeeded"` exact à utiliser sera à confirmer avec un vrai webhook de test sandbox (comme on l'a fait pour FedaPay où on a découvert le format réel par l'observation). Prévoir un log temporaire du payload brut au premier test, à retirer ensuite (cf. notre nettoyage en commit `80826da`).

---

## 3. Variables d'environnement à ajouter sur Railway

Le bloc config existe déjà (`config/index.js` lignes 85-90), il attend :

| Variable | Description | Où la récupérer |
|---|---|---|
| `CINETPAY_API_KEY` | Clé API marchand | `app-new.cinetpay.com/login` → menu **Intégrations** |
| `CINETPAY_SITE_ID` | Identifiant du site marchand | Idem, menu **Intégrations** |
| `CINETPAY_SECRET_KEY` | Secret pour vérifier le HMAC `x-token` des webhooks | Idem, menu **Intégrations** → "Secret Key" |
| `CINETPAY_NOTIFY_URL` | URL de notification (webhook) | À définir : `https://api.immoafrica.online/api/v1/payments/webhooks/cinetpay` (vérifier le chemin exact dans `routes/index.js`) |

```bash
cd backend
railway variables set --service backend \
  CINETPAY_API_KEY=xxxxxxxxxxxxxxxx \
  CINETPAY_SITE_ID=xxxxx \
  CINETPAY_SECRET_KEY=xxxxxxxxxxxxxxxx \
  CINETPAY_NOTIFY_URL=https://api.immoafrica.online/api/v1/payments/webhooks/cinetpay
```

> ⚠️ Comme pour les clés FedaPay, je ne dois pas saisir ces valeurs à ta place — c'est toi qui les colles dans Railway via la commande ci-dessus ou l'interface web.

---

## 4. Vérifier la route webhook CinetPay côté backend

FedaPay a sa route dédiée (`/api/v1/payments/webhooks/fedapay`). Il faut confirmer qu'une route équivalente `/webhooks/cinetpay` existe (ou la créer) dans `routes/index.js` / `paymentsController.js`, qui :
1. récupère le provider via `registry.get("cinetpay")`,
2. appelle `verifyWebhookSignature`,
3. parse et fait le lookup transaction (avec le même fallback `findByExternalId`).

Si le contrôleur webhook est déjà générique (un seul handler paramétré par `providerName`), rien à faire de plus que de vérifier que `"cinetpay"` est bien accepté dans le routing.

---

## 5. Routage : CinetPay prioritaire au Burkina, FedaPay ailleurs

Aujourd'hui, `PaymentProviderRegistry.listForCountry()` renvoie les providers dans l'ordre d'insertion de `instances` — FedaPay est déclaré en premier, donc il sortirait en tête partout, y compris au Burkina, une fois CinetPay configuré.

Pour que **CinetPay soit proposé/sélectionné en priorité au Burkina** sans changer l'ordre global (FedaPay reste prioritaire pour BJ/CI/SN/...), ajouter une table de priorité par pays :

```js
// PaymentProviderRegistry.js — ajout proposé
const COUNTRY_PRIORITY = {
  BF: ["cinetpay", "fedapay", "orange_money_bf", "moov_money_bf", "wave"],
  // par défaut (non listé ici) : ordre d'insertion, FedaPay en tête
};

function listForCountry(countryCode) {
  const ranked = COUNTRY_PRIORITY[countryCode];
  const list = Object.values(instances)
    .filter((p) => p.countries.includes(countryCode))
    .filter((p) => p.isConfigured());

  if (ranked) {
    list.sort((a, b) => {
      const ia = ranked.indexOf(a.name);
      const ib = ranked.indexOf(b.name);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }
  return list.map((p) => ({ name: p.name, countries: p.countries, currencies: p.currencies }));
}
```

Ainsi :
- Un visiteur déclarant le **Burkina Faso** verra **CinetPay en premier** (et FedaPay toujours disponible en repli).
- Les visiteurs des **autres pays UEMOA** continuent de voir **FedaPay en premier**, comme aujourd'hui.

Pas besoin de retirer FedaPay nulle part — les deux cohabitent, exactement comme demandé.

---

## 6. Plan de test sandbox CinetPay (calqué sur le test FedaPay, section 4 de FEDAPAY_ACTIVATION.md)

1. **Créer un compte marchand CinetPay** sur `app-new.cinetpay.com` si pas déjà fait, récupérer `apikey` + `site_id` + `secret key` (menu Intégrations).
2. **Coller les variables sandbox** dans Railway (étape 3 ci-dessus). CinetPay n'a pas de "mode sandbox" séparé comme FedaPay (un seul jeu de clés) — leur SDK propose un *mode test* via le paramètre `channels`/plateforme `TEST` côté seamless, mais pour l'API Checkout classique (celle qu'on utilise, basée sur `payment_url`), le test se fait directement avec un petit montant réel ou via les numéros de test fournis par leur support.
3. **Initier un paiement de test** (ex. 100 FCFA) :
   ```bash
   curl -X POST https://api.immoafrica.online/api/v1/payments/initiate \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "provider": "cinetpay",
       "property_id": "'"$PROP_ID"'",
       "amount": 100,
       "currency": "XOF",
       "purpose": "deposit",
       "customer_phone": "+22670000001",
       "customer_email": "acheteur@demo.bf",
       "customer_name": "Test Cinetpay"
     }'
   ```
4. **Ouvrir le `payment_url`** retourné, choisir Orange Money BF ou Moov Money BF, valider avec un numéro réel.
5. **Observer le webhook** dans les logs Railway :
   ```
   [webhook] cinetpay x-token OK external_id=...
   [webhook] cinetpay status=succeeded amount=100 XOF
   [escrow] created for transaction <uuid>
   [pdf] receipt generated ...
   ```
6. **Si le payload diffère de la doc** (les agrégateurs changent parfois leur format sans prévenir, comme observé avec FedaPay), ajuster `parseWebhook`/`verifyWebhookSignature` en conséquence — logguer temporairement le `raw body` et le retirer une fois validé (même discipline que pour FedaPay, commit `80826da`).
7. Une fois validé : refaire le test pour chaque opérateur BF (Orange, Moov, Wave si disponible chez CinetPay) avant ouverture au public.

---

## 7. KYC / activation CinetPay (à anticiper)

CinetPay applique aussi une vérification marchand avant d'autoriser les paiements réels — généralement plus rapide que FedaPay (souvent quelques jours). Documents probablement demandés (à confirmer sur leur dashboard) : statuts/RCCM, IFU, RIB, pièce d'identité du dirigeant — la même base que pour le dossier FedaPay (`docs/KYC_FEDAPAY_DOSSIER.md`), réutilisable presque telle quelle.

---

## 8. Résumé des étapes

1. [ ] Corriger `verifyWebhookSignature` et `parseWebhook` dans `CinetPayProvider.js` (section 2)
2. [ ] Créer/vérifier le compte marchand CinetPay + récupérer `apikey`/`site_id`/`secret`
3. [ ] Ajouter les 4 variables d'env sur Railway (section 3)
4. [ ] Vérifier/créer la route webhook `/payments/webhooks/cinetpay` (section 4)
5. [ ] Ajouter la table `COUNTRY_PRIORITY` dans le registry pour prioriser CinetPay au Burkina (section 5)
6. [ ] Lancer le test sandbox/réel (section 6) — Orange BF, Moov BF, Wave si listé
7. [ ] Une fois validé, soumettre le KYC CinetPay pour le mode production (section 7)
8. [ ] Mettre à jour `GO_LIVE_CHECKLIST.md` et la mémoire projet
