# Diagnostic hebdomadaire, page Facebook Immo BF Africa
**Date : 6 septembre 2026**

## Résumé exécutif

Le fetch automatisé de facebook.com/immoafricabf n'a de nouveau renvoyé aucun contenu cette semaine (blocage anti-scraping de Meta sans session connectée, constaté depuis plusieurs mois). Le diagnostic du profil reprend donc le dernier état confirmé. Le point le plus important cette semaine concerne le site : la section « Parcourir les annonces » de la page d'accueil affiche à nouveau « Aucune annonce pour l'instant », alors que ce problème avait été corrigé le 31 août (variable `NEXT_PUBLIC_API_URL` sur Vercel, redéployée) et vérifié avec des annonces réelles visibles. Le retour de cette anomalie six jours plus tard est un signal à vérifier rapidement plutôt qu'à reporter une nouvelle fois.

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
| Post de moins de 7 jours | ⚠️ non vérifiable cette semaine | Confirmer qu'un post a bien été publié le mercredi 2 septembre, selon la cadence hebdomadaire fixée le 21 août |
| Posts réguliers (cadence respectée) | ⚠️ non vérifiable cette semaine | Vérifier l'historique de publication directement sur la page |

**Score de complétude estimé : 7/10.** Les huit premiers critères reposent sur le dernier état confirmé, non recontrôlé directement cette semaine faute d'accès à la page. Les deux derniers restent non vérifiables. Ce score porte sur le profil Facebook lui-même ; il ne reflète pas l'anomalie du site décrite ci-dessus, traitée séparément en priorité 1.

## Actions priorisées

1. **Vérifier en priorité pourquoi « Aucune annonce pour l'instant » est réapparu sur immoafrica.online**, six jours seulement après la correction du 31 août (`NEXT_PUBLIC_API_URL` pointée vers le backend Railway). Deux pistes : un retour en arrière accidentel de la variable d'environnement lors d'un redéploiement Vercel, ou une panne côté backend Railway (le plan actuel est un essai limité à durée déterminée, voir les ressources cloud du projet). Un appel direct à `GET /api/v1/properties` sur le backend confirmerait si les 77 annonces existent toujours côté serveur.
2. Confirmer que le post thématique du mercredi 2 septembre a bien été publié et qu'il reste visible sur la page.
3. Publier au moins un des trois brouillons ci-dessous, en gardant la cadence d'un post thématique le mercredi.
4. Faire une capture d'écran manuelle de la page Facebook pour obtenir un nombre à jour de mentions J'aime et d'abonnés, donnée que le fetch automatisé ne peut pas récupérer.

## Brouillons de posts

### Post 1, astuce immobilière

📋 **Les documents à préparer avant une visite au Burkina Faso**

Avant de se déplacer pour visiter un logement, quelques documents évitent les allers-retours inutiles : une pièce d'identité valide, un justificatif de revenus ou d'activité, et, pour une location, les références d'un garant si le propriétaire en demande un.

Du côté du propriétaire ou de l'agence, le titre de propriété ou le bail précédent doit être disponible pour rassurer un acheteur ou un locataire sérieux dès la première rencontre.

Sur ImmoBF Africa, chaque annonce précise le type de transaction et les conditions générales du bien, pour arriver préparé le jour de la visite.

👉 À consulter sur immoafrica.online

Une question sur les démarches à prévoir pour un bien précis ? Écrivez-nous en commentaire, nous répondons directement. 💬

### Post 2, fonctionnalité plateforme (couverture régionale)

🌍 **Une seule plateforme pour plusieurs pays de l'UEMOA**

ImmoBF Africa ne se limite pas à Ouagadougou ou Bobo-Dioulasso. La recherche par pays et par ville permet de comparer des biens au Burkina Faso et dans d'autres pays de la zone, pour les familles et professionnels qui envisagent une installation ou un investissement en dehors de leur ville actuelle.

Chaque annonce affiche le prix en francs CFA, la localisation précise et le type de transaction, location ou vente, pour comparer facilement d'une ville à l'autre.

📱 L'application Android permet de consulter ces annonces même avec une connexion limitée, et de réserver un bien en mobile money (Orange Money, Moov Money, Wave).

📥 Téléchargement : immoafrica.online/download

Vous êtes agence ou promoteur actif dans plusieurs villes ? Publier vos annonces sur la plateforme est gratuit. Contactez-nous pour en savoir plus. ✉️

### Post 3, marché immobilier burkinabè

🌧️ **Louer ou acheter pendant la saison des pluies**

La saison des pluies change certains critères de choix d'un logement à Ouagadougou ou Bobo-Dioulasso : l'écoulement de l'eau autour de la parcelle, l'état de la toiture, l'accès à la rue en cas de fortes pluies. Ce sont des points qui se vérifient mal sur une photo et beaucoup mieux sur place, à cette période de l'année.

C'est aussi une période où certains propriétaires ajustent leurs prix, notamment sur les biens en périphérie où les routes se dégradent plus vite.

Sur ImmoBF Africa, les annonces sont mises à jour par les propriétaires et agences directement, avec des prix affichés clairement.

🔎 Parcourir les annonces : immoafrica.online

Propriétaire ou agent immobilier ? Rejoignez la plateforme pour gagner en visibilité auprès d'acheteurs et de locataires actifs. 🤝

## Métriques observées

- Nombre de followers / mentions J'aime : non disponible, fetch Facebook automatisé bloqué, donnée non actualisée cette semaine.
- Dernier post visible : non vérifiable directement. Cadence connue : un post thématique par semaine, le mercredi, décidée le 21 août 2026.
- Site immoafrica.online : accessible, charte graphique cohérente (couleur #0E7C66, logo présent), liens vers connexion, publication d'annonce et téléchargement de l'application fonctionnels dans le rendu récupéré aujourd'hui.
- Anomalie relevée côté site : la section « Parcourir les annonces » affichait de nouveau « Aucune annonce pour l'instant » lors du fetch de ce jour, six jours après la correction du 31 août. À la différence des semaines précédentes où le problème était persistant depuis plusieurs relevés, il s'agit ici d'une réapparition après correction confirmée, ce qui pointe vers une régression récente plutôt qu'un problème non résolu de longue date.
