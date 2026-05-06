# Contribuer à ImmoBF Africa

Merci de votre intérêt pour ImmoBF Africa. Ce projet est ouvert sous licence MIT et accepte les contributions de toute la communauté africaine (et au-delà).

## Flux de contribution

1. Fork le dépôt, crée une branche depuis `develop` : `feat/nom-fonctionnalité` ou `fix/ticket-xxx`.
2. Installe le projet localement (voir README.md) et assure-toi que `npm run lint && npm test` passent.
3. Commits conventionnels :
   - `feat: ajoute support MTN MoMo Ghana`
   - `fix: corrige signature webhook Wave`
   - `docs: complète la doc escrow`
   - `refactor`, `test`, `chore`…
4. Ouvre une PR vers `develop` avec :
   - résumé clair, capture d'écran si UI,
   - checklist des tests ajoutés,
   - lien vers l'issue associée.

## Code style

- JavaScript : ESLint (`eslint:recommended`) + Prettier par défaut.
- Nommage : `camelCase` pour fichiers/variables, `PascalCase` pour composants React.
- Tests : Jest côté backend + frontend. Couverture cible > 70 %.

## Issues

- Utilise les templates `bug`, `feature`, `question`.
- `good-first-issue` : perfaites pour débuter (voir ROADMAP.md).

## Discussion

- GitHub Discussions pour propositions techniques.
- Discord communauté : https://discord.gg/immobf

## Code of Conduct

Ce projet suit le [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Soyez respectueux, accueillant pour les nouveaux contributeurs, surtout ceux qui débutent en programmation.

## Sécurité

Vulnérabilité découverte ? Ne l'ouvre pas en issue publique. Envoie un mail à `security@immobf.africa` avec une description reproductible. Nous répondons sous 72 h.
