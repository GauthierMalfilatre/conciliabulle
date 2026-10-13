# Projet : Doctolib-like pour conciliateurs de justice

API REST (backend/) pour prendre, modifier et annuler des rendez-vous avec des conciliateurs de justice.
Le frontend n'existe pas encore (il affichera un gros bouton « JE SUIS UN CONCILIATEUR »).

## Règles de travail
- Les contributeurs externes suivent `CONTRIBUTING.md` (PR vers `main`, modèle dans `.github/pull_request_template.md`) ; `README.md` à la racine = démarrage rapide pour tout le monde. Garder ces trois fichiers cohérents avec ce document.
- Branche courante du travail backend : `feat/backend`. Commits fréquents et petits, en **Conventional Commits** (`feat(scope):`, `fix:`, `test:`, `docs:`, `chore:`), terminés par la ligne Co-Authored-By demandée par l'environnement.
- Chaque fonctionnalité a ses tests. Lancer `python manage.py test` (depuis `backend/`) avant de commiter.
- **Mettre à jour ce fichier à chaque changement important** (nouvelle route, nouveau modèle, règle métier, commande, décision d'architecture). Mettre aussi à jour le schéma Mermaid de `backend/README.md` quand un modèle change.
- Chaque nouvelle vue doit avoir `@extend_schema(tags=[...])` (un test vérifie que tout est taggé) et apparaître proprement dans Swagger.
- Réponses à l'utilisateur en français.

## Licence
MIT (`LICENSE`), © 2026 Gauthier Malfilatre, Alexis Variot, Arthur Aubry. Les contributions sont publiées sous cette licence (voir `CONTRIBUTING.md`).

## Stack
Python 3.14 (venv `.venv` à la racine), Django 6.1, DRF 3.18, simplejwt (JWT stateless), drf-spectacular (Swagger), sqlite3 (`backend/db.sqlite3`, ignoré par git).

## Commandes (depuis `backend/`)
```bash
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py runserver                      # Swagger : /api/docs/
../.venv/bin/python manage.py runserver --authorize-all=yes  # test : conciliateurs non vérifiés visibles/réservables
../.venv/bin/python manage.py makemigrations                 # après modif d'un modèle ; commiter la migration
../.venv/bin/python manage.py test
../.venv/bin/python manage.py spectacular --validate --fail-on-warn   # le schéma OpenAPI doit rester sans warning
```

## Architecture (`backend/`)
Un module = un dossier dans `apps/`. `config/` = settings, urls racine.
| Module | Rôle |
|---|---|
| `apps/health` | `GET /api/v1/health` (état API + base ; 503 si base KO) |
| `apps/accounts` | `User` custom (login par email, `role`), register/login/refresh/me, permission `IsPlainUser` |
| `apps/conciliateurs` | `ConciliateurProfile` (`is_verified`), `Slot`, annuaire, gestion des créneaux, commande `runserver` surchargée, permission `IsConciliateur` |
| `apps/appointments` | `Appointment`, `services.py` (book / cancel / reschedule + règles) |

Docs : `GET /api/docs/` (Swagger UI), `GET /api/schema/` (OpenAPI), hors de `/api/v1/`. Tags : Auth, Account, Conciliateurs, Créneaux, Rendez-vous, Health.

## Routes (`/api/v1/`, JWT `Authorization: Bearer <access>` sauf mention)
| Route | Qui | Effet |
|---|---|---|
| `POST auth/register` | public | crée un compte USER (le rôle n'est jamais choisi par le client) |
| `POST auth/conciliateur/register` | public | crée un compte CONCILIATEUR (+ profil, `city` requis, non vérifié) |
| `POST auth/login`, `POST auth/refresh` | public | tokens JWT ; le claim `role` est dans le token |
| `GET me` | connecté | compte courant |
| `GET conciliateurs` | connecté | conciliateurs visibles (vérifiés) |
| `GET conciliateurs/{id}/slots` | connecté | créneaux futurs libres |
| `GET/POST me/slots`, `DELETE me/slots/{id}` | conciliateur | gère ses créneaux (409 si le créneau a des rendez-vous) |
| `GET/POST appointments` | USER | liste ses rendez-vous / réserve (`slot_id`, `motive`) |
| `GET/PATCH/DELETE appointments/{id}` | USER | détail / change de créneau (`slot_id`) / annule |
| `GET me/appointments` | conciliateur | rendez-vous sur ses créneaux |

Codes : 409 créneau déjà pris ; 400 hors fenêtre, déjà annulé ou créneau passé ; 403 mauvais rôle ; 404 pour la ressource d'un autre.

## Règles métier
- USER et CONCILIATEUR sont deux types de compte distincts ; un conciliateur ne peut pas réserver.
- Un conciliateur est invisible et ne peut pas publier de créneaux tant que `is_verified=False` (validation par un admin dans `/admin/`). `ConciliateurProfile.objects.visible()` est le seul point d'accès à cette règle.
- `settings.AUTHORIZE_ALL` (flag `--authorize-all=yes`, défaut off) désactive cette vérification : annuaire, réservation et publication de créneaux. Il n'existe que via `runserver`.
- Annuler/changer un rendez-vous est refusé à moins de `CANCELLATION_WINDOW_HOURS` (24h) du début. L'annulation est « soft » (`status=CANCELLED`, la ligne reste).
- Pas de double réservation : contrainte unique conditionnelle `one_booking_per_slot` (créneau unique parmi les `BOOKED`) + 409.
- Stateless : pas de session, pas de logout serveur.

## Pièges connus
- `apps.conciliateurs` doit rester **en premier** dans `INSTALLED_APPS` : sa commande `runserver` doit passer avant celle de `staticfiles`.
- `AppointmentSerializer.Meta.validators = []` est voulu : sinon DRF renvoie 400 au lieu de 409 sur un créneau pris.
- Les vues qui utilisent `request.user` dans `get_queryset` testent `swagger_fake_view` pour la génération du schéma.
- Permissions par défaut : `IsAuthenticated` ; les vues publiques déclarent `AllowAny` + `authentication_classes = []`.

## Pas encore fait
Annulation par le conciliateur, e-mails/SMS, fuseaux horaires (UTC seulement), disponibilités récurrentes, recherche (ville/spécialité), rate limiting, `SECRET_KEY`/`DEBUG`/`ALLOWED_HOSTS` en variables d'environnement, CORS, frontend.
