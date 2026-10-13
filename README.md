# ConciliaBulle

**Prise de rendez-vous avec des conciliateurs de justice.** ConciliaBulle est un « Doctolib » pour les conciliateurs. Les justiciables (comptes **USER**) réservent, modifient et annulent des rendez-vous ; les **conciliateurs** publient leurs créneaux. Les deux sont des types de compte distincts.

| Dossier | Contenu | État |
|---|---|---|
| `backend/` | API REST Django + DRF, JWT stateless, sqlite3 | ✅ en place |
| `front-end/` | Next.js 16 + React 19 + Tailwind, branché sur l'API (voir [front-end/README.md](front-end/README.md)) | 🚧 en cours : dossiers, rappels et réglages encore fictifs |

## Démarrer l'API

Prérequis : Python 3.12+ (développé en 3.14) ; Node 20.9+ pour le front.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
cp .env.example .env                  # configuration locale (git-ignorée) : à ouvrir, SECRET_KEY à générer
python manage.py migrate
python manage.py runserver
```

**Sans rien installer**, avec Docker : `cp backend/.env.example backend/.env && SESSION_SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))') docker compose up --build` (API sur <http://localhost:8000>, site sur <http://localhost:3000>, base sqlite conservée dans un volume). Le `SESSION_SECRET` signe les cookies de session du site.

- **Swagger (doc interactive)** : <http://localhost:8000/api/docs/>
- **Schéma OpenAPI** (pour générer un client TypeScript, etc.) : <http://localhost:8000/api/schema/>
- **Health check** : <http://localhost:8000/api/v1/health>

### Jeu de données de test

```bash
python manage.py seed_demo            # crée conciliateurs, plaignants, créneaux, rendez-vous, notifications, candidatures
python manage.py seed_demo --reset    # supprime les données de démo (comptes en @demo.fr) puis les recrée
```

Tous les comptes ont le mot de passe `Demo-pass-2026!` (la commande affiche la liste, ex. `alice.durand@demo.fr`, `jean.martin@demo.fr`, `admin@demo.fr`). Un des conciliateurs est volontairement non vérifié. La commande refuse de tourner si `DEBUG` est désactivé.

### Tester sans attendre la validation d'un conciliateur

Il n'y a pas d'inscription publique pour les conciliateurs : un admin les crée (`create_conciliateur`, ou l'admin Django `/admin/`) et les valide. Pour développer sans cette étape, lance :

```bash
python manage.py runserver --authorize-all=yes
```

Les conciliateurs non vérifiés deviennent alors visibles, réservables, et peuvent publier des créneaux. **À ne jamais utiliser autrement qu'en local** (le flag n'existe que sur `runserver`).

### Exemple de parcours

```bash
API=http://localhost:8000/api/v1

# 1. Un admin crée le conciliateur (pas d'inscription publique : les conciliateurs passent par l'association)
python manage.py create_conciliateur c@example.fr --password 'Mot-de-passe-solide-42' \
  --first-name Jean --last-name Martin --city Lyon --department 69   # vérifié par défaut ; --unverified pour l'inverse
curl -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"c@example.fr","password":"Mot-de-passe-solide-42"}'      # -> {"access": "...", "refresh": "..."}

# 2. Il déclare une disponibilité récurrente (tous les lundis 9h-11h, heure de Paris) : les créneaux sont générés 8 semaines à l'avance
curl -X POST $API/me/availabilities -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d '{"weekday":0,"start_time":"09:00","end_time":"11:00","slot_minutes":60,"location":"Mairie du 3e, salle 2"}'
#    ... ou un créneau isolé
curl -X POST $API/me/slots -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d '{"start":"2030-01-10T09:00:00Z","end":"2030-01-10T10:00:00Z","location":"Mairie du 3e, salle 2"}'

# 3. Un plaignant (compte créé via /auth/register) cherche dans son département, puis réserve
curl "$API/conciliateurs?department=69&available=true" -H "Authorization: Bearer $USER_ACCESS"
curl "$API/conciliateurs/1/slots?from=2030-01-01&to=2030-02-01" -H "Authorization: Bearer $USER_ACCESS"
curl -X POST $API/appointments -H "Authorization: Bearer $USER_ACCESS" -H 'Content-Type: application/json' \
  -d '{"slot_id":1,"first_name":"Alice","last_name":"Durand","phone":"06 12 34 56 78","motive":"Conflit de voisinage"}'

# 4. Le conciliateur voit son calendrier (libre/réservé), ses alertes, et récupère son lien d'abonnement (Google Calendar, Outlook...)
curl "$API/me/slots?from=2030-01-01&to=2030-02-01" -H "Authorization: Bearer $ACCESS"
curl "$API/me/notifications?unread=true" -H "Authorization: Bearer $ACCESS"
curl $API/me/calendar -H "Authorization: Bearer $ACCESS"     # -> {"url": ".../api/v1/calendar/<secret>.ics"}
```

Toutes les routes protégées attendent `Authorization: Bearer <access>`. Le token d'accès expire : renouvelle-le avec `POST /auth/refresh`. Le rôle (`USER` ou `CONCILIATEUR`) est dans le token et dans `GET /me`.

## Règles à connaître côté front
- **CORS** : l'API accepte les appels navigateur depuis `http://localhost:3000` (et `127.0.0.1:3000`). Un autre port ou domaine : variable d'environnement `CORS_ALLOWED_ORIGINS` (séparés par des virgules), ex. `CORS_ALLOWED_ORIGINS=http://localhost:5173 python manage.py runserver`.
- **Réserver** exige `first_name`, `last_name` et `phone` du plaignant (400 sinon) ; le conciliateur les voit sur ses rendez-vous.
- **Annuler ou changer** (`PATCH` : nouveau `slot_id`, et/ou nom, téléphone, motif) est refusé (400) à moins de 24h du début.
- **Zone géographique** : `GET /conciliateurs?department=69` (code département, `2A`/`2B` pour la Corse) ; `&available=true` ne garde que ceux qui ont un créneau libre. Les créneaux d'un conciliateur se filtrent avec `?from=` et `?to=` (date ou datetime ISO ; `from` inclus, `to` exclu).
- **Consignes** : la réponse de `POST /appointments` (et de `GET /appointments`) contient `instructions`, à afficher au plaignant après la réservation. Le conciliateur les personnalise avec `PATCH /me/profile`.
- **Alertes du conciliateur** : à chaque rendez-vous pris, modifié ou annulé, il reçoit une notification (`GET /me/notifications?unread=true`, puis `POST /me/notifications/{id}/read` ou `/read-all`) et un e-mail (dans la console du serveur en dev).
- **Lieu** : chaque créneau a un `location` (affiché au plaignant).
- **Devenir conciliateur** : `POST /candidatures` (public, sans compte, 5 par heure et par IP) avec `first_name`, `last_name`, `email`, `phone`, `department`, `message`, `consent: true`. L'association du département les traite depuis l'admin Django.
- **Export calendrier** : `GET /me/calendar` (conciliateur) donne une URL privée `.ics` à coller dans Google Calendar / Outlook ; `POST /me/calendar` en génère une nouvelle (l'ancienne cesse de marcher). Ne la partage pas : elle contient les noms et téléphones des plaignants.
- **Créneau déjà pris** : 409. Rafraîchis la liste des créneaux libres.
- Un conciliateur ne peut pas réserver (403) ; un utilisateur ne peut pas gérer de créneaux (403).
- Les dates sont en UTC (ISO 8601).

## Limites connues
Pas de SMS, pas de contenu « modalités de recrutement » côté API (à mettre dans le front), pas d'annulation par le conciliateur, `SECRET_KEY`/`DEBUG` en dur. Voir [`.claude/CLAUDE.md`](.claude/CLAUDE.md) pour la liste complète, et ouvre une issue si ça te bloque.

## Aller plus loin
- [CONTRIBUTING.md](CONTRIBUTING.md) : comment proposer une modification (branches, commits, PR, CI)
- [SECURITY.md](SECURITY.md) : signaler une faille
- [backend/README.md](backend/README.md) : commandes backend et schéma de la base de données
- [.claude/CLAUDE.md](.claude/CLAUDE.md) : architecture détaillée, routes et règles métier

## Licence
[MIT](LICENSE) © 2026 Gauthier Malfilatre, Alexis Variot, Arthur Aubry.
