# Diagnostic hebdomadaire — Page Facebook Immo BF Africa
**Date : 23 août 2026**

## Résumé exécutif

La récupération automatisée du contenu public de la page Facebook (facebook.com/immoafricabf) n'a renvoyé aucun contenu exploitable cette semaine : Facebook bloque le fetch programmatique hors connexion authentifiée, comme observé lors des diagnostics précédents. Le diagnostic ci-dessous s'appuie donc sur l'état confirmé au 10 août 2026 (vérification Meta Business résolue, publication automatique avec photos testée et fonctionnelle, 77 annonces réelles disponibles côté plateforme) plutôt que sur une lecture directe de la page cette semaine. Le site immoafrica.online reste accessible et cohérent avec la charte de marque. Un point mérite une vérification manuelle : la page d'accueil du site a renvoyé "Aucune annonce pour l'instant", ce qui contredit les 77 annonces confirmées précédemment et provient probablement d'un chargement dynamique non exécuté par l'outil de récupération plutôt que d'une régression réelle.

## Tableau diagnostic

| Élément | État | Action requise |
|---|---|---|
| Nom de page complet | ✅ (dernière vérification) | Aucune, à reconfirmer visuellement |
| Bio / description optimisée | ✅ (dernière vérification) | Aucune |
| Photo de profil (logo) | ✅ (dernière vérification) | Aucune |
| Photo de couverture | ✅ (dernière vérification) | Aucune |
| Lien site web | ✅ (dernière vérification) | Aucune |
| Lien app download | ✅ (dernière vérification) | Aucune |
| Email de contact | ✅ (dernière vérification) | Aucune |
| Catégorie (Immobilier) | ✅ (dernière vérification) | Aucune |
| Post de moins de 7 jours | ⚠️ non vérifiable cette semaine | Confirmer manuellement qu'un post a bien été publié le mercredi 19 août, conformément à la cadence hebdomadaire décidée le 21 août |
| Posts réguliers (cadence respectée) | ⚠️ non vérifiable cette semaine | Vérifier l'historique de publication sur la page directement |

**Score de complétude estimé : 7/10** (deux critères non vérifiables faute d'accès direct à la page cette semaine ; les huit autres reposent sur le dernier état confirmé, non recontrôlé aujourd'hui).

## Actions priorisées

1. Vérifier manuellement, via un navigateur connecté, que le post du mercredi 19 août a bien été publié sur la page et qu'il reste visible.
2. Contrôler pourquoi la page d'accueil du site a renvoyé "Aucune annonce pour l'instant" lors du fetch automatisé : tester le chargement du widget d'annonces dans un navigateur classique pour écarter un problème de rendu ou d'API.
3. Publier au moins un des trois brouillons ci-dessous cette semaine, en respectant la cadence d'un post thématique le mercredi.
4. Envisager un contrôle mensuel manuel (capture d'écran) de la page Facebook pour disposer d'un nombre de mentions J'aime et d'abonnés à jour, donnée que le fetch automatisé ne peut pas récupérer.

## Brouillons de posts

### Post 1 — Astuce immobilière

🏠 **Bien choisir son quartier avant de louer ou d'acheter à Ouagadougou**

Avant de signer un bail ou un compromis de vente, quelques points valent la peine d'être vérifiés sur place : l'accès à l'eau et à l'électricité selon la saison, l'état des routes en période de pluie, la distance jusqu'aux écoles ou au lieu de travail, et le niveau sonore du voisinage aux heures de pointe.

Sur ImmoBF Africa, chaque annonce précise la localisation exacte du bien pour faciliter cette évaluation avant tout déplacement. 📍

Vous cherchez un logement au Burkina Faso ou ailleurs dans l'espace UEMOA ? Parcourez les annonces disponibles dès maintenant sur notre site.

👉 immoafrica.online

Une question sur un bien en particulier ? Écrivez-nous en commentaire ou par message, nous répondons directement. 💬

### Post 2 — Fonctionnalité plateforme (paiement mobile)

📱 **Réserver un bien immobilier sans passer par une banque, c'est possible**

Sur ImmoBF Africa, le paiement d'une réservation se fait directement par mobile money : Orange Money, Moov Money ou Wave, selon ce que vous utilisez déjà au quotidien.

Pas de déplacement en agence pour un premier versement, pas de délai bancaire à attendre : la transaction se fait depuis votre téléphone, au moment où vous êtes prêt à avancer sur un bien qui vous intéresse.

L'application est disponible gratuitement pour Android et permet de consulter les annonces même avec une connexion limitée.

📥 Téléchargez l'application : immoafrica.online/download

Propriétaires et agences : publier une annonce sur la plateforme est également gratuit pour démarrer. Contactez-nous pour en savoir plus. ✉️

### Post 3 — Marché immobilier burkinabè

🏗️ **Le marché immobilier burkinabè continue de se structurer**

Entre les nouveaux lotissements en périphérie de Ouagadougou et de Bobo-Dioulasso et une demande locative qui reste forte dans les centres-villes, les prix et les délais de transaction varient beaucoup d'un quartier à l'autre.

C'est pour cette raison que nous construisons ImmoBF Africa avec des annonces vérifiées, des prix affichés clairement en francs CFA, et une couverture qui s'étend progressivement à d'autres pays de l'UEMOA.

Que vous cherchiez à louer, acheter ou simplement suivre l'évolution des prix dans votre quartier, la plateforme est ouverte à tous, sans frais de consultation.

🔎 À consulter ici : immoafrica.online

Vous êtes propriétaire, agent immobilier ou promoteur ? Rejoignez la plateforme et gagnez en visibilité auprès d'acheteurs et de locataires actifs. 🤝

## Métriques observées

- **Nombre de followers / mentions J'aime** : non disponible (fetch Facebook automatisé bloqué, données non actualisées cette semaine).
- **Dernier post visible** : non vérifiable directement ; cadence connue = un post thématique par semaine, le mercredi (décision du 21 août 2026).
- **Site immoafrica.online** : accessible, charte graphique cohérente (couleur #0E7C66, logo présent), liens vers connexion, publication d'annonce et téléchargement de l'application fonctionnels dans le rendu récupéré.
- **Anomalie relevée côté site** : la section "Parcourir les annonces" de la page d'accueil affichait "Aucune annonce pour l'instant" au moment du fetch, alors que 77 annonces réelles avaient été confirmées le 10 août 2026. Probablement un effet du chargement dynamique côté client non exécuté par l'outil de récupération, à confirmer manuellement.
