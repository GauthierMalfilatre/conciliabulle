# Justice Tech 2026 : prise de rendez-vous avec des conciliateurs de justice

Un « Doctolib » pour les conciliateurs de justice. Les justiciables (comptes **USER**) réservent, modifient et annulent des rendez-vous ; les **conciliateurs** publient leurs créneaux. Les deux sont des types de compte distincts.

| Dossier | Contenu | État |
|---|---|---|
| `backend/` | API REST Django + DRF, JWT stateless, sqlite3 | ✅ en place |
| frontend | à venir | 🚧 on cherche des volontaires, voir [CONTRIBUTING.md](CONTRIBUTING.md) |

## Démarrer l'API

Prérequis : Python 3.12+ (développé en 3.14).

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

- **Swagger (doc interactive)** : <http://localhost:8000/api/docs/>
- **Schéma OpenAPI** (pour générer un client TypeScript, etc.) : <http://localhost:8000/api/schema/>
- **Health check** : <http://localhost:8000/api/v1/health>

### Tester sans attendre la validation d'un conciliateur

Un conciliateur qui s'inscrit n'est pas visible tant qu'un admin ne l'a pas validé. Pour développer, lance :

```bash
python manage.py runserver --authorize-all=yes
```

Les conciliateurs non vérifiés deviennent alors visibles, réservables, et peuvent publier des créneaux. **À ne jamais utiliser autrement qu'en local** (le flag n'existe que sur `runserver`).

### Exemple de parcours

```bash
API=http://localhost:8000/api/v1

# 1. Un conciliateur s'inscrit et se connecte
curl -X POST $API/auth/conciliateur/register -H 'Content-Type: application/json' \
  -d '{"email":"c@example.fr","password":"Mot-de-passe-solide-42","first_name":"Jean","last_name":"Martin","city":"Lyon"}'
curl -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"c@example.fr","password":"Mot-de-passe-solide-42"}'      # -> {"access": "...", "refresh": "..."}

# 2. Il publie un créneau (avec --authorize-all=yes, ou une fois vérifié)
curl -X POST $API/me/slots -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d '{"start":"2030-01-10T09:00:00Z","end":"2030-01-10T10:00:00Z"}'

# 3. Un utilisateur (autre compte, via /auth/register) réserve ce créneau
curl -X POST $API/appointments -H "Authorization: Bearer $USER_ACCESS" -H 'Content-Type: application/json' \
  -d '{"slot_id":1,"motive":"Conflit de voisinage"}'
```

Toutes les routes protégées attendent `Authorization: Bearer <access>`. Le token d'accès expire : renouvelle-le avec `POST /auth/refresh`. Le rôle (`USER` ou `CONCILIATEUR`) est dans le token et dans `GET /me`.

## Règles à connaître côté front
- **CORS** : l'API accepte les appels navigateur depuis `http://localhost:3000` (et `127.0.0.1:3000`). Un autre port ou domaine : variable d'environnement `CORS_ALLOWED_ORIGINS` (séparés par des virgules), ex. `CORS_ALLOWED_ORIGINS=http://localhost:5173 python manage.py runserver`.
- **Annuler ou changer** un rendez-vous est refusé (400) à moins de 24h de son début.
- **Créneau déjà pris** : 409. Rafraîchis la liste des créneaux libres.
- Un conciliateur ne peut pas réserver (403) ; un utilisateur ne peut pas gérer de créneaux (403).
- Les dates sont en UTC (ISO 8601).

## Limites connues
Pas de rate limiting, pas d'e-mails/SMS, `SECRET_KEY`/`DEBUG` en dur. Voir [`.claude/CLAUDE.md`](.claude/CLAUDE.md) pour la liste complète, et ouvre une issue si ça te bloque.

## Aller plus loin
- [CONTRIBUTING.md](CONTRIBUTING.md) : comment proposer une modification (branches, commits, PR)
- [backend/README.md](backend/README.md) : commandes backend et schéma de la base de données
- [.claude/CLAUDE.md](.claude/CLAUDE.md) : architecture détaillée, routes et règles métier

## Licence
[MIT](LICENSE) © 2026 Gauthier Malfilatre, Alexis Variot, Arthur Aubry.
