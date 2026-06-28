# Guide de remplissage — formulaire "Ouvrir un compte" CinetPay

CinetPay n'a pas d'inscription self-service comme FedaPay : il faut passer par leur formulaire commercial (`cinetpay.com` → "Log in" → "Contact a sales representative to open your account"). Un commercial te recontacte ensuite pour finaliser l'ouverture (et fournir `apikey`/`site_id`/`secret key`).

> ⚠️ Ce formulaire contient des données d'entreprise et personnelles (n° RCCM, téléphone, nom du dirigeant). Je ne peux pas le remplir ni le soumettre à ta place — voici les réponses suggérées pour les champs où je peux t'aider, à toi de compléter le reste et d'envoyer.

---

## Réponses suggérées (à copier-coller)

| Champ | Valeur suggérée |
|---|---|
| **Company name** | `ImmoBF Africa` *(ou la raison sociale exacte du RCCM si différente)* |
| **Email** | `contact@immoafrica.online` |
| **Site Internet** | `https://www.immoafrica.online` |
| **Sector of activity** | `Autre` *(pas d'option "Immobilier" dans la liste — si un champ libre apparaît après sélection, préciser : "Immobilier — petites annonces / services numériques")* |
| **Sales figures** | `0 - 50 000 000` *(cohérent avec le volume estimé du dossier KYC : ~5M FCFA/mois en phase pilote, ~30M/mois en extension — voir [KYC_FEDAPAY_DOSSIER.md](./KYC_FEDAPAY_DOSSIER.md) section 2.3)* |
| **Trade register number** | *(ton n° RCCM — à compléter par toi)* |
| **Company country** | `Burkina Faso` |
| **How did you hear about CinetPay?** | `Moteur de recherche (Google, Yahoo, Bing, etc)` *(ou "Bouche à oreille" si plus exact pour toi)* |
| **Which CinetPay service do you need?** | `CinetPay Collect` *(c'est le produit "encaissement" qui correspond à notre besoin — paiements entrants par mobile money/carte ; à ne pas confondre avec "Mass Payout" qui sert aux décaissements)* |
| **Full name** | *(ton nom complet — à compléter)* |
| **Phone number** | *(ton numéro — à compléter)* |
| **Function** | `Founder` *(ou `CEO` selon ton statut au RCCM)* |
| **Receive the latest Fintech news** | à toi de voir |

---

## Après soumission

1. Le commercial CinetPay te recontacte (généralement par téléphone ou email) pour valider le profil et ouvrir le compte.
2. Une fois le compte créé, connecte-toi sur `app-new.cinetpay.com` → menu **Intégrations** pour récupérer `apikey`, `site_id` et la `secret key`.
3. On reprend alors l'étape 3 du plan ([CINETPAY_INTEGRATION.md](./CINETPAY_INTEGRATION.md)) : configurer les variables Railway et lancer le test sandbox.

> 💡 Le KYC documentaire (statuts, RCCM, IFU, RIB, CNI dirigeant…) sera probablement redemandé à ce stade ou juste après — tu as déjà tout réuni pour FedaPay (voir [KYC_FEDAPAY_DOSSIER.md](./KYC_FEDAPAY_DOSSIER.md)), il devrait être largement réutilisable.
