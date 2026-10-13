# Projet : Doctolib-like pour conciliateurs de justice

API REST (backend/) pour prendre, modifier et annuler des rendez-vous avec des conciliateurs de justice.
Le frontend n'existe pas encore (il affichera un gros bouton « JE SUIS UN CONCILIATEUR »).

## Cahier des charges (résumé)
- **Plaignant** : crée un compte / se connecte ; voit les conciliateurs d'une zone géographique (département) ; réserve un créneau dans le calendrier d'un conciliateur en donnant nom, prénom, téléphone (obligatoires) ; voit les consignes du rendez-vous après réservation (venir avec tout document utile) ; modifie/annule jusqu'à 24h avant.
- **Conciliateur** : se connecte ; consulte son calendrier (créneaux libres/réservés) ; reçoit une alerte (e-mail + notification in-app) quand un rendez-vous est pris / modifié / annulé ; exporte vers Outlook/Google Calendar (iCalendar).
- **Autres** : bouton « Comment devenir conciliateur de justice » (front) ; modalités de recrutement (contenu) ; dépôt de ses informations pour être recontacté par l'association du département (`POST candidatures`).
- Tout est couvert côté API, sauf le contenu statique des modalités de recrutement (front).

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
Python 3.14 (venv `.venv` à la racine), gunicorn + whitenoise (prod), Django 6.1, DRF 3.18, simplejwt (JWT stateless), drf-spectacular (Swagger), django-cors-headers, sqlite3 (`backend/db.sqlite3`, ignoré par git).

## Configuration
Tout réglage dépendant de l'environnement vient de variables d'environnement, lues pour le dev dans `backend/.env` (git-ignoré ; modèle : `backend/.env.example`, qui documente toutes les variables). Une nouvelle variable = `.env.example` + tableau de `backend/README.md`. `DEBUG` est **faux par défaut** et `SECRET_KEY` est obligatoire hors `DEBUG=true`. `requirements.txt` est entièrement épinglé. Déploiement : `backend/Dockerfile` + `docker-compose.yml` (testés : image construite, `/api/v1/health` OK, statiques servis par whitenoise).

## Commandes (depuis `backend/`)
```bash
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py runserver                      # Swagger : /api/docs/
../.venv/bin/python manage.py runserver --authorize-all=yes  # test : conciliateurs non vérifiés visibles/réservables
../.venv/bin/python manage.py create_conciliateur EMAIL --password X --city Lyon --department 69   # pas d'inscription publique ; --unverified possible
../.venv/bin/python manage.py seed_demo [--reset]            # jeu de données de test (comptes @demo.fr, mdp Demo-pass-2026!, DEBUG uniquement)
../.venv/bin/python manage.py makemigrations                 # après modif d'un modèle ; commiter la migration
../.venv/bin/ruff check .                                     # lint (pip install -r requirements-dev.txt) ; la CI le lance
../.venv/bin/python manage.py test
../.venv/bin/python manage.py spectacular --validate --fail-on-warn   # le schéma OpenAPI doit rester sans warning
```

## Architecture (`backend/`)
Un module = un dossier dans `apps/`. `config/` = settings, urls racine.
| Module | Rôle |
|---|---|
| `apps/health` | `GET /api/v1/health` (état API + base ; 503 si base KO) |
| `apps/accounts` | `User` custom (login par email, `role`), register/login/refresh/me, permission `IsPlainUser` |
| `apps/conciliateurs` | `ConciliateurProfile` (`department`, `is_verified`, `calendar_token`, `instructions`), `Availability` (récurrence), `Slot` (`location`), annuaire + filtres, `services.py` (génération des créneaux), commandes `runserver` (surchargée), `create_conciliateur` et `seed_demo` (données de démo ; garder `DOMAIN`/`--reset` limités aux comptes `@demo.fr`), permission `IsConciliateur` |
| `apps/appointments` | `Appointment` (contact du plaignant), `services.py` (book / update / cancel + règles), `ics.py` (export iCalendar) |
| `apps/notifications` | `Notification` (alertes in-app du conciliateur), `services.notify_conciliateur` (crée la notification + e-mail après commit) ; appelé par `appointments.services` |
| `apps/candidatures` | `Candidature` : demandes pour devenir conciliateur (route publique limitée, traitées dans l'admin) |
| `config/validators.py` | validateurs partagés (téléphone, code département) |

Docs : `GET /api/docs/` (Swagger UI), `GET /api/schema/` (OpenAPI), hors de `/api/v1/`. Tags : Auth, Account, Conciliateurs, Créneaux, Rendez-vous, Calendrier, Notifications, Candidatures, Health.

## Routes (`/api/v1/`, JWT `Authorization: Bearer <access>` sauf mention)
| Route | Qui | Effet |
|---|---|---|
| `POST auth/register` | public | crée un compte USER (le rôle n'est jamais choisi par le client). **Pas d'inscription publique de conciliateur** : `create_conciliateur` ou l'admin Django |
| `POST auth/login`, `POST auth/refresh` | public | tokens JWT ; le claim `role` est dans le token |
| `GET me` | connecté | compte courant |
| `GET conciliateurs?department=&available=true` | connecté | conciliateurs visibles (vérifiés), filtrés par département / ayant un créneau libre |
| `GET conciliateurs/{id}/slots?from=&to=` | connecté | créneaux futurs libres (`from` inclus, `to` exclu ; date ou datetime ISO) |
| `GET/POST me/slots?from=&to=`, `DELETE me/slots/{id}` | conciliateur | son calendrier : chaque créneau a `is_booked` et `appointment` (coordonnées du plaignant) ; `location` requis ; suppression 409 si le créneau a des rendez-vous |
| `GET/PATCH me/profile` | conciliateur | `city`, `department`, `bio`, `instructions` (consignes montrées au plaignant) ; `is_verified` en lecture seule |
| `GET/POST me/availabilities`, `DELETE me/availabilities/{id}` | conciliateur | disponibilités hebdomadaires récurrentes, expansées en créneaux (supprimer retire les créneaux futurs non réservés) |
| `GET/POST appointments` | USER | liste ses rendez-vous / réserve (`slot_id`, `first_name`, `last_name`, `phone` obligatoires, `motive` ; la réponse contient `instructions`) |
| `GET/PATCH/DELETE appointments/{id}` | USER | détail / change `slot_id` et/ou coordonnées/motif (au moins un champ) / annule |
| `GET me/appointments` | conciliateur | rendez-vous sur ses créneaux, avec les coordonnées du plaignant |
| `GET me/notifications?unread=true`, `POST me/notifications/{id}/read`, `POST me/notifications/read-all` | connecté | alertes in-app (rendez-vous pris / modifié / annulé) |
| `GET/POST me/calendar` | conciliateur | GET : URL privée d'abonnement ; POST : la régénère |
| `GET calendar/{token}.ics` | public (le token fait office de secret) | flux iCalendar des rendez-vous `BOOKED` (30 derniers jours + à venir) |
| `POST candidatures` | public | dépôt d'une candidature (`consent: true` requis ; 5/heure/IP) |

Codes : 409 créneau déjà pris ; 400 hors fenêtre, déjà annulé, créneau passé ou donnée invalide ; 403 mauvais rôle ; 404 pour la ressource d'un autre ; 429 trop de candidatures.

## Règles métier
- USER et CONCILIATEUR sont deux types de compte distincts ; un conciliateur ne peut pas réserver.
- Un conciliateur est invisible et ne peut pas publier de créneaux tant que `is_verified=False` (validation par un admin dans `/admin/`). `ConciliateurProfile.objects.visible()` est le seul point d'accès à cette règle.
- `settings.AUTHORIZE_ALL` (flag `--authorize-all=yes`, défaut off) désactive cette vérification : annuaire, réservation et publication de créneaux. Il n'existe que via `runserver`.
- Les coordonnées du plaignant (nom, prénom, téléphone) sont saisies à la réservation et stockées **sur le rendez-vous** ; seul le conciliateur concerné les voit (ainsi que le plaignant lui-même).
- Consignes : `instructions` du conciliateur, sinon `settings.DEFAULT_APPOINTMENT_INSTRUCTIONS`, exposées en lecture seule dans chaque rendez-vous.
- Alertes : à chaque `book` / `update` / `cancel` réussi, une `Notification` est créée pour le conciliateur concerné (déplacement vers un autre conciliateur : l'ancien reçoit « annulé », le nouveau « nouveau ») et un e-mail part **après commit** (`transaction.on_commit`) ; un échec d'envoi est loggé et ne casse jamais la requête. E-mail dans la console par défaut ; SMTP si `EMAIL_HOST` est défini (+ `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`). L'e-mail contient le téléphone du plaignant (sauf annulation).
- Les conciliateurs sont recrutés via l'association : pas d'auto-inscription. Les candidatures arrivent dans l'admin (`Candidature`, filtre par département).
- Annuler/changer un rendez-vous est refusé à moins de `CANCELLATION_WINDOW_HOURS` (24h) du début. L'annulation est « soft » (`status=CANCELLED`, la ligne reste).
- Pas de double réservation : contrainte unique conditionnelle `one_booking_per_slot` (créneau unique parmi les `BOOKED`) + 409.
- Disponibilités récurrentes : l'heure est locale (`LOCAL_TIME_ZONE`=Europe/Paris, gère l'heure d'été), expansée en `Slot` sur `AVAILABILITY_HORIZON_WEEKS` (8) semaines. Pas de cron : `services.extend_rules()` prolonge paresseusement à chaque consultation des créneaux/annuaire. `generated_until` évite de recréer un créneau supprimé à la main.
- Export calendrier : le flux `.ics` n'a pas de JWT (les clients calendrier n'en envoient pas) ; le token secret de `ConciliateurProfile.calendar_token` est le seul secret, créé au premier appel de `GET me/calendar`.
- Stateless : pas de session, pas de logout serveur.

## CI et dépôt
`.github/workflows/ci.yml` (sur chaque PR et push sur `main`) : ruff, `manage.py check`, `makemigrations --check`, validation du schéma OpenAPI (publié en artefact `openapi-schema` pour le front), tests, build de l'image Docker. Dependabot (pip, Actions, Docker) : `.github/dependabot.yml`. Lint = `backend/ruff.toml` (pas de formateur ; E501 ignoré). Hooks optionnels : `.pre-commit-config.yaml`. Modèles d'issues dans `.github/ISSUE_TEMPLATE/`, `SECURITY.md`, `CODEOWNERS`. Avant de proposer une PR, lancer les mêmes commandes que la CI.

## Pièges connus
- Les tests et toutes les commandes `manage.py` exigent `SECRET_KEY` (ou `DEBUG=true`) dans l'environnement ou `backend/.env` : `cp .env.example .env` après un clone. La clé en dur qui existait avant cette configuration est dans l'historique git : la considérer comme compromise.
- `ALLOWED_HOSTS` : en `DEBUG=false`, une liste vide refuse tout (le client de test ajoute `testserver` tout seul).
- CORS : `CorsMiddleware` doit rester avant `CommonMiddleware`. Origines autorisées = `CORS_ALLOWED_ORIGINS` (env, séparées par des virgules ; défaut `localhost:3000` et `127.0.0.1:3000`). Ne jamais mettre `CORS_ALLOW_ALL_ORIGINS`.
- `apps.conciliateurs` doit rester **en premier** dans `INSTALLED_APPS` : sa commande `runserver` doit passer avant celle de `staticfiles`.
- `AppointmentSerializer.Meta.validators = []` est voulu : sinon DRF renvoie 400 au lieu de 409 sur un créneau pris.
- drf-spectacular : sur une `APIView` à plusieurs méthodes, mettre `request=None` dans `extend_schema` pour les méthodes sans corps ; `ICalRenderer` doit renvoyer `b""` pour les corps d'erreur (dicts).
- Django 6.1 : les réglages `EMAIL_*` sont dépréciés et **interdits** si `MAILERS` est défini (c'est le cas dans `settings.py`) ; configurer l'e-mail uniquement via `MAILERS`.
- Dans les tests, `transaction.on_commit` ne s'exécute pas dans un `TestCase` : utiliser `self.captureOnCommitCallbacks(execute=True)` pour tester les e-mails.
- `apps.appointments` importe `apps.notifications` et `apps.conciliateurs` (jamais l'inverse : `conciliateurs` lit `slot.appointments` via la relation, sans importer le modèle).
- Une migration qui ajoute un champ obligatoire à une table existante a besoin d'un défaut ponctuel (`preserve_default=False`).
- Les vues qui utilisent `request.user` dans `get_queryset` testent `swagger_fake_view` pour la génération du schéma.
- Permissions par défaut : `IsAuthenticated` ; les vues publiques déclarent `AllowAny` + `authentication_classes = []`.

## Pas encore fait
Annulation par le conciliateur, notification de l'association pour une candidature, e-mail de confirmation au plaignant (non demandé), envoi d'e-mails asynchrone (file de tâches) si le SMTP est lent, contenu « modalités et conditions de recrutement » (prévu côté front), détection des chevauchements entre disponibilités/créneaux, modification d'une disponibilité (supprimer puis recréer), recherche par ville/rayon GPS, rate limiting hors candidatures, durée de conservation des données personnelles (RGPD), frontend.
