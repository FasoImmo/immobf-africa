# Dossier KYC FedaPay — checklist & textes prêts à coller

Objectif : faire valider le compte FedaPay en mode **Live** pour activer les paiements réels (Orange Money, Moov, Wave, cartes). Délai d'instruction annoncé : 3 à 7 jours ouvrés une fois le dossier complet soumis.

Référence complète : [FEDAPAY_ACTIVATION.md](./FEDAPAY_ACTIVATION.md).

---

## 1. Checklist des documents à réunir (personne morale — recommandé)

Cocher au fur et à mesure. Format attendu : PDF ou JPEG, ≤ 10 Mo, nommage clair.

- [ ] **Statuts de la société** (SARL/SA/SAS), signés et enregistrés → `STATUTS_immobf_signes.pdf`
- [ ] **RCCM** (registre du commerce), extrait de moins de 3 mois → `RCCM_immobf.pdf`
- [ ] **IFU** (Identifiant Fiscal Unique, DGI Burkina) → `IFU_immobf.pdf`
- [ ] **Justificatif de domiciliation** : facture SONABEL/ONEA/téléphone < 3 mois au nom de la société → `DOMICILIATION_immobf.pdf`
- [ ] **Pièce d'identité du dirigeant** : CNIB recto/verso ou passeport → `CNI_dirigeant_recto.jpg` + `CNI_dirigeant_verso.jpg`
- [ ] **Pouvoir/nomination du dirigeant** (si différent du fondateur) → `POUVOIR_dirigeant.pdf`
- [ ] **RIB UEMOA** (Coris, Ecobank, UBA, BOA…) où FedaPay versera les fonds → `RIB_immobf.pdf`

### Variante personne physique (auto-entrepreneur)

Possible mais avec des plafonds plus bas — à éviter pour ImmoBF vu les montants (acomptes > 1 M FCFA) :
- [ ] CNIB recto/verso
- [ ] Justificatif de domicile < 3 mois
- [ ] RIB personnel
- [ ] Selfie tenant la pièce d'identité

> ⚠️ Tous ces documents contiennent des données personnelles/sensibles (identité, coordonnées bancaires). Je ne peux pas les saisir ou les téléverser à ta place dans le dashboard FedaPay — c'est à toi de les préparer et de les soumettre directement.

---

## 2. Textes prêts à coller dans le formulaire

### 2.1 Description de l'activité

```
ImmoBF Africa est une plateforme de petites annonces immobilières dédiée au
Burkina Faso et extensible à l'espace UEMOA / Afrique de l'Ouest. Elle met en
relation propriétaires, agences et particuliers pour la vente et la location
de biens (maisons, appartements, terrains, locaux commerciaux). La plateforme
collecte, via FedaPay, des acomptes de réservation, des frais de publication
d'annonces, des commissions d'agence et des abonnements professionnels, réglés
par mobile money (Orange Money, Moov Money, Wave) ou carte bancaire.
```

### 2.2 Profil entreprise

```
Raison sociale     : [à compléter — telle qu'inscrite au RCCM]
Forme juridique    : SARL
Pays               : Burkina Faso
Secteur d'activité : Immobilier — petites annonces / services numériques
IFU                : [à compléter]
Adresse            : [adresse complète, Ouagadougou + code postal]
Site web           : https://www.immoafrica.online
Email professionnel: contact@immoafrica.online
```

### 2.3 Volume estimé (si demandé)

```
Mois 1 à 3   : environ 5 000 000 FCFA / mois (phase pilote, Ouagadougou)
Mois 4 à 12  : environ 30 000 000 FCFA / mois (extension régionale UEMOA)
Ticket moyen attendu : 100 000 à 5 000 000 FCFA
  (ex. acompte de 5 % sur un bien à 50 000 000 FCFA)
```

### 2.4 Justificatifs publics à avoir en ligne avant soumission

FedaPay vérifie que ces pages existent réellement sur le site (déjà en place sur immoafrica.online d'après nos échanges précédents — à reconfirmer avant soumission) :

- Conditions Générales d'Utilisation : `https://www.immoafrica.online/legal/cgu`
- Politique de confidentialité : `https://www.immoafrica.online/legal/privacy`
- Mentions légales : `https://www.immoafrica.online/legal`

---

## 3. Étapes de soumission (résumé)

1. Se connecter sur https://live.fedapay.com (compte déjà créé d'après nos échanges).
2. Compléter le **profil entreprise** avec les textes de la section 2.2.
3. Téléverser les documents de la section 1, un par un, avec les noms de fichiers indiqués.
4. Coller la description d'activité (2.1) et le volume estimé (2.3) si demandés.
5. Soumettre → email de confirmation FedaPay → attendre 3 à 7 jours ouvrés.
6. Si FedaPay demande des pièces complémentaires, c'est généralement le justificatif d'activité avec URL en ligne (déjà couvert par la section 2.4).

---

## 4. Une fois validé → bascule en Live

Voir section 5 de [FEDAPAY_ACTIVATION.md](./FEDAPAY_ACTIVATION.md) :
1. Dashboard FedaPay → Mode → **Live**.
2. Récupérer les clés `pk_live_…` / `sk_live_…`.
3. Recréer le webhook côté Live (URL identique, nouveau secret).
4. Mettre à jour les variables Railway (`FEDAPAY_LIVE=true`, nouvelles clés, nouveau `FEDAPAY_WEBHOOK_SECRET`).
5. **Test obligatoire** : transaction réelle de 100 FCFA sur ton propre numéro avant ouverture au public, puis un test par wallet (Orange, Moov, Wave, carte).
6. Vérifier la réception des fonds sur le RIB sous T+2/T+3.
