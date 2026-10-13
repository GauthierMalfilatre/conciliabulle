# Sécurité

Ce projet manipule des données personnelles (noms, téléphones, e-mails de plaignants et de conciliateurs).

## Signaler une faille
**Ne publie pas la faille dans une issue ou une PR.** Utilise plutôt, par ordre de préférence :

1. l'onglet **Security → Report a vulnerability** du dépôt GitHub (signalement privé) ;
2. à défaut, contacte directement un des mainteneurs (voir l'historique des commits ou `LICENSE`).

Indique ce que tu as trouvé, comment le reproduire (requête, étapes) et l'impact que tu imagines. N'utilise pas de vraies données de personnes pour tester : lance `python manage.py seed_demo` ou crée tes propres comptes locaux.

Nous répondons dès que possible et te tiendrons au courant de la correction.

## Versions concernées
Seule la branche `main` est maintenue.

## Bonnes pratiques du projet
- Aucun secret dans le dépôt : tout passe par des variables d'environnement (`backend/.env.example`).
- Le lien d'abonnement calendrier (`/api/v1/calendar/<token>.ics`) est un secret : un conciliateur peut le régénérer avec `POST /api/v1/me/calendar`.
- Les dépendances sont épinglées et mises à jour via Dependabot.
