# Wireframes — ImmoBF Africa

Wireframes textuels (low-fidelity) décrivant la structure des écrans clés.
Chaque schéma utilise ASCII/Unicode pour visualiser layout, hiérarchie et actions.
Les maquettes Figma haute-fidélité seront produites en V1.1 (workflow : Figma file `ImmoBF-Africa.fig`, design system `/design-system/`).

## Principes de design

- **Vert sahélien** `#0E7C66` (confiance, croissance) + jaune soleil `#E0A500` (appel à l'action).
- **Mobile-first** : colonne unique < 640 px, grille 12 au-delà.
- **Accessibilité** : contraste AAA, touch target ≥ 44 px, fonte Inter 16 px minimum.
- **Icônes** : Material Icons + Lucide (cohérents avec la charte).
- **États** : loading skeleton, offline banner, empty state avec CTA.

## 1. Accueil (web + mobile)

```
┌──────────────────────────────────────────────────────┐
│ [≡] ImmoBF Africa          [FR▾]   [Connexion]       │  ← AppBar sticky vert
├──────────────────────────────────────────────────────┤
│ ╔══════════════════════════════════════════════════╗ │
│ ║   ImmoBF Africa                                  ║ │
│ ║   L'immobilier africain, payé en mobile money.   ║ │ ← Hero gradient
│ ║                                                  ║ │
│ ║   ┌──────────┬─────────┬──────┬─────────┐        ║ │
│ ║   │ 🔍 Q     │ Ville   │ Type │ [Chercher]│      ║ │
│ ║   └──────────┴─────────┴──────┴─────────┘        ║ │
│ ╚══════════════════════════════════════════════════╝ │
│                                                      │
│ Annonces récentes                                    │
│ ┌────────┐  ┌────────┐  ┌────────┐                   │
│ │ [IMG]  │  │ [IMG]  │  │ [IMG]  │  ← PropertyCard   │
│ │ Villa  │  │ F3 ZdB │  │ Parc.  │                   │
│ │ 85 M   │  │ 250k/m │  │ 6,5 M  │                   │
│ └────────┘  └────────┘  └────────┘                   │
│                                                      │
│ Par ville : Ouaga (42) · Bobo (18) · Saaba (7)…      │
└──────────────────────────────────────────────────────┘
```

## 2. Résultats de recherche `/properties`

```
┌──────────────────────────────────────────────────────┐
│ Parcourir                                            │
│ ┌─ Filtres ────────────────────────────────────────┐ │
│ │ [Q…] [Ville] [Type▾] [Prix min] [Prix max] [✓]  │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ┌──── Carte ─────┐  ┌─── Liste ───┐                  │
│ │   🗺 Leaflet   │  │ [Card]      │                  │
│ │   pins par     │  │ [Card]      │                  │
│ │   annonce      │  │ [Card]      │                  │
│ │   (PostGIS)    │  │ [Pagination]│                  │
│ └────────────────┘  └─────────────┘                  │
└──────────────────────────────────────────────────────┘
```

Sur mobile : la carte devient un toggle (bouton « Voir la carte »), la liste occupe toute la largeur.

## 3. Détail annonce `/properties/:id`

```
┌──────────────────────────────────────────────────────┐
│ ← Retour                                             │
│ [Type] [Vérifié ✓] [Ouagadougou, BF]                 │
│ Villa moderne 4 chambres à Ouaga 2000                │
│ ╔═══════════════════════════════╦═══════════════════╗│
│ ║                               ║ 85 000 000 FCFA   ║│
│ ║    [Photo couverture]         ║ 320 m² · 4 ch · 3 ║│
│ ║                               ║ ───────────────── ║│
│ ║  ┌──┬──┬──┬──┐ thumbnails     ║ Acompte (5%)      ║│
│ ║  │  │  │  │  │ + badge 360°   ║ 4 250 000 FCFA    ║│
│ ║  └──┴──┴──┴──┘                ║                   ║│
│ ║                               ║ [🟢 Payer acompte]║│
│ ║ Description                   ║ [  Contacter     ]║│
│ ║ Belle villa 4ch, jardin…      ║ [  Favoris ♥     ]║│
│ ║                               ║                   ║│
│ ║ 🗺 Carte (PostGIS + OSM)      ║ Calculateur prêt  ║│
│ ╚═══════════════════════════════╩═══════════════════╝│
└──────────────────────────────────────────────────────┘
```

## 4. Modal paiement mobile money

```
┌─────────────────────────────────────┐
│ Choisir un moyen de paiement    [×] │
├─────────────────────────────────────┤
│ Villa Ouaga 2000 — 4 250 000 FCFA   │
│                                     │
│ [Opérateur ▾]                       │
│   ○ CinetPay (tous opérateurs)      │
│   ● Orange Money (*144*4*6#)        │
│   ○ Moov Money (*555*6#)            │
│   ○ Wave                            │
│                                     │
│ Téléphone : [+226 70 00 00 00]      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ℹ Composez *144*4*6# et validez │ │
│ │   avec votre PIN. Réf: IMO-…    │ │
│ └─────────────────────────────────┘ │
│                                     │
│   [Annuler]      [Payer 4 250 000]  │
└─────────────────────────────────────┘
```

Après `succeeded` côté webhook : modal remplacé par reçu PDF téléchargeable.

## 5. Publier une annonce `/sell`

```
┌──────────────────────────────────────────────────────┐
│ Publier une annonce                                  │
├──────────────────────────────────────────────────────┤
│ Type [Maison ▾]         Pays [BF]                    │
│ Titre  [__________________________________]          │
│ Description                                          │
│ [  textarea ................................... ]   │
│                                                      │
│ Prix [________] FCFA   Surface [__] m²  Acompte [5]% │
│ Ville [________]    Adresse [______________]         │
│ Chambres [_]   Sdb [_]                               │
│                                                      │
│ 📷 Photos  [ + Ajouter ]  ──  □ Visite 360°          │
│ 🗺 Position [choisir sur carte]                      │
│                                                      │
│ ⚠ Modération IA anti-fraude en cours…                │
│                                                      │
│                         [ Publier ]                  │
└──────────────────────────────────────────────────────┘
```

## 6. Dashboard admin/agence `/admin`

```
┌──────────────────────────────────────────────────────┐
│ Tableau de bord                                      │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│ │ Annonces │  │ Valeur   │  │ Trans.   │             │
│ │ 128      │  │ 4,2 Mds  │  │ 47       │             │
│ └──────────┘  └──────────┘  └──────────┘             │
│                                                      │
│ Par ville          ─────[ Export CSV ]               │
│ Ouagadougou ████████████  72                         │
│ Bobo-Dioulasso ████ 23                               │
│ Saaba ██ 12                                          │
│                                                      │
│ Dernières transactions                               │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Ref         Acheteur    Ville    Provider   État │ │
│ │ IMO-…-A1    J. Ouédraogo Ouaga   Orange    ✓    │ │
│ │ IMO-…-A2    F. Diallo   Bobo    Wave      ✓    │ │
│ │ IMO-…-A3    M. Kaboré   Ouaga   CinetPay  ⏳    │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## 7. App mobile — Navigation

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ [⚙] Parcourir    │   │ ← Villa Ouaga    │   │ ← Paiement       │
│ ┌────────────┐   │   │ ┌──────────────┐ │   │ Villa Ouaga      │
│ │ 🔍 search  │   │   │ │   [IMG]      │ │   │ 4 250 000 FCFA   │
│ └────────────┘   │   │ └──────────────┘ │   │                  │
│ ┌──────────────┐ │   │ 85 000 000 FCFA  │   │ Opérateur        │
│ │  [IMG]       │ │   │ 320 m² · 4 ch    │   │ ○ CinetPay       │
│ │  Villa Ouaga │ │   │ Acompte 5%       │   │ ● Orange Money   │
│ │  85 M FCFA   │ │   │ = 4 250 000 FCFA │   │ ○ Moov           │
│ └──────────────┘ │   │                  │   │ ○ Wave           │
│ ┌──────────────┐ │   │ Description…     │   │                  │
│ │  [IMG] F3    │ │   │                  │   │ Tel +226…        │
│ │  250k/mois   │ │   │ [🟢 Payer]        │   │ [🟢 Payer]        │
│ └──────────────┘ │   │                  │   │ ℹ *144*4*6#      │
│ [Parcourir] [Moi]│   │                  │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

## 8. Empty states & offline

- **Liste vide** : illustration + « Aucun résultat dans cette ville pour ce budget. » + CTA « Élargir la recherche ».
- **Offline banner** : bandeau jaune en haut d'écran « Mode hors ligne — les résultats sont ceux de votre dernière visite ».
- **Erreur paiement** : icône ⚠, message clair, CTA « Réessayer » + « Contacter le support ».

## 9. Accessibilité & i18n

- Tout texte est clé i18n (jamais en dur) ; clés organisées par écran (`home.*`, `property.*`).
- RTL non nécessaire pour FR/EN/Mooré/Dioula, mais prévu via CSS logical properties pour extension arabe (Mauritanie future).
- Tous les boutons ont un `aria-label` explicite.
- Les champs de téléphone utilisent un mask dynamique par pays (libphonenumber-js).

## 10. Assets à produire (Figma V1.1)

- Logo horizontal + carré (SVG + PNG 192/512).
- Jeu d'illustrations « Real estate Africa » (6 scènes : villa, parcelle, appartement, escrow signature, paiement mobile, agence).
- Icônes d'opérateurs (CinetPay, Orange Money, Moov, Wave) en SVG monochrome pour pouvoir teinter.
- Splash screen animée (Lottie) 1.5 s max.
