# Diagnostic hebdomadaire, page Facebook Immo BF Africa
**Date : 15 septembre 2026** (rattrapage — le rapport du 13 septembre n'a pas été généré, la tâche planifiée semble ne pas s'être exécutée ce dimanche-là)

## Résumé exécutif

Le fetch automatisé de facebook.com/immoafricabf reste bloqué, comme chaque semaine. Le point principal de ce rapport concerne le site : neuf jours après la correction de la variable `NEXT_PUBLIC_API_URL` sur Vercel et un redéploiement réussi (confirmés avec Kosmad le 7 septembre), immoafrica.online affiche toujours « Aucune annonce pour l'instant ». Le backend Railway, lui, est vérifié sain : service en ligne, redéployé hier (14 septembre) sans erreur, zéro échec récent. Ce n'est donc plus un problème de configuration ponctuel mais une anomalie confirmée et persistante côté frontend, qui mérite une investigation directe dans le code plutôt qu'un nouveau réglage de variable.

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
| Post de moins de 7 jours | ⚠️ non vérifiable cette semaine | Confirmer la publication des posts du 9 et du 13 septembre (cadence hebdomadaire du mercredi) |
| Posts réguliers (cadence respectée) | ⚠️ non vérifiable cette semaine | Vérifier l'historique de publication directement sur la page |

**Score de complétude estimé : 7/10.** Inchangé depuis plusieurs semaines : les huit premiers critères reposent sur le dernier état confirmé, non recontrôlé directement faute d'accès à la page Facebook elle-même.

## Actions priorisées

1. **Diagnostiquer directement dans le code pourquoi la page d'accueil n'affiche pas les annonces**, puisque backend et configuration Vercel sont confirmés sains. Pistes concrètes : ouvrir immoafrica.online dans un navigateur, ouvrir les outils de développement (onglet Réseau), recharger la page et regarder l'appel réseau vers `/api/v1/properties` — vérifier son URL exacte, son code de statut, et sa réponse. Si l'appel n'apparaît pas du tout ou pointe vers une mauvaise URL, le bug est dans `pages/index.js` (logique `Properties.search()`), pas dans la configuration d'hébergement.
2. Vérifier pourquoi la tâche planifiée du diagnostic hebdomadaire ne s'est pas exécutée le 13 septembre (aucun rapport généré ce jour-là) — s'assurer que la tâche est toujours active.
3. Confirmer que les posts thématiques du mercredi (9 et 13 septembre) ont bien été publiés sur la page.
4. Publier au moins un des trois brouillons ci-dessous.
5. Faire une capture d'écran manuelle de la page Facebook pour actualiser le nombre de mentions J'aime et d'abonnés.

## Brouillons de posts

### Post 1, astuce immobilière

🔑 **Négocier un loyer au Burkina Faso : ce qui se discute vraiment**

Le prix affiché n'est pas toujours le prix final. Selon les quartiers de Ouagadougou et Bobo-Dioulasso, certains points restent négociables : le nombre de mois de caution demandés à l'avance, la prise en charge de petites réparations avant l'entrée dans les lieux, ou la durée du premier bail.

Ce qui se négocie moins facilement : le loyer mensuel lui-même dans les zones à forte demande, ou les charges fixes déjà incluses dans le prix affiché.

Sur ImmoBF Africa, chaque annonce précise clairement les conditions du propriétaire pour éviter les malentendus dès le premier contact.

👉 À consulter sur immoafrica.online

Vous avez déjà négocié un bail à Ouaga ou à Bobo ? Racontez-nous en commentaire, ça aide d'autres utilisateurs. 💬

### Post 2, fonctionnalité plateforme (publication d'annonce)

📸 **Publier une annonce en quelques minutes, depuis un téléphone**

Propriétaire ou agence : publier un bien sur ImmoBF Africa se fait directement depuis l'application, sans ordinateur ni formulaire compliqué. Quelques photos, une description, un prix en francs CFA, et l'annonce est visible par des acheteurs et locataires actifs sur la plateforme.

La première annonce publiée est gratuite. Les annonces suivantes restent accessibles à un tarif pensé pour les propriétaires individuels autant que pour les agences.

📥 Téléchargement de l'application : immoafrica.online/download

Une question sur la publication d'une annonce ? Écrivez-nous en message, nous répondons directement. ✉️

### Post 3, marché immobilier burkinabè

🏘️ **Ouaga ou Bobo : deux marchés qui ne se ressemblent pas**

La demande locative à Ouagadougou reste concentrée sur les quartiers proches du centre et des zones d'activité, avec des délais de location courts quand le bien est bien situé. À Bobo-Dioulasso, le marché de la vente de parcelles en périphérie reste actif, porté par les familles qui construisent progressivement.

Ces différences influencent directement les prix et les délais de transaction d'une ville à l'autre.

Sur ImmoBF Africa, les annonces des deux villes (et au-delà) sont regroupées au même endroit, avec des prix affichés clairement.

🔎 Parcourir les annonces : immoafrica.online

Propriétaire ou agent immobilier dans l'une de ces deux villes ? Rejoignez la plateforme pour gagner en visibilité. 🤝

## Métriques observées

- Nombre de followers / mentions J'aime : non disponible, fetch Facebook automatisé bloqué, donnée non actualisée cette semaine.
- Dernier post visible : non vérifiable directement. Cadence connue : un post thématique par semaine, le mercredi.
- Site immoafrica.online : accessible, charte graphique cohérente (couleur #0E7C66, logo présent), liens vers connexion, publication d'annonce et téléchargement de l'application fonctionnels.
- Backend Railway (`immobf-africa`) : vérifié directement — service en ligne, dernier déploiement réussi le 14 septembre 2026, aucune erreur récente, aucun service en échec.
- Anomalie persistante côté site : « Aucune annonce pour l'instant » toujours affiché sur la page d'accueil au 15 septembre, neuf jours après la correction de configuration Vercel du 6-7 septembre. Le backend étant confirmé sain, cette anomalie doit maintenant être traitée comme un bug de code frontend (logique de récupération des annonces sur la page d'accueil), pas comme un problème d'hébergement ou de variable d'environnement.
