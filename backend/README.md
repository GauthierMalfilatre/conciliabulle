# Backend

Django REST Framework API, stateless (JWT), sqlite3.

```bash
pip install -r requirements.txt
cp .env.example .env                            # local config (git-ignored); set SECRET_KEY
python manage.py migrate
python manage.py runserver                      # Swagger: http://localhost:8000/api/docs/
python manage.py runserver --authorize-all=yes  # testing: unverified conciliateurs are visible/bookable
python manage.py test
```

Conciliateurs have no public registration: create them with
`python manage.py create_conciliateur EMAIL --password ... --city Lyon --department 69` (verified by default, `--unverified` otherwise),
or from the Django admin (`createsuperuser`, then `/admin/`). The admin also lists the `Candidature`s (people who want to become conciliateurs).
## Configuration

All environment-specific settings come from environment variables; for local work they are read from `backend/.env`
(copy `.env.example`, which documents every variable). Real environment variables always win over the file.

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | none | **Required** unless `DEBUG=true` (Django refuses to start). Never commit it. |
| `DEBUG` | `false` | Secure by default; `.env.example` sets `true` for local work. |
| `ALLOWED_HOSTS` | empty | Comma-separated. With `DEBUG=true` and empty, only localhost works. |
| `CORS_ALLOWED_ORIGINS` | `localhost:3000` | Front origins allowed to call the API from a browser. |
| `CSRF_TRUSTED_ORIGINS` | empty | Only for the Django admin behind an HTTPS domain. |
| `DATABASE_PATH` | `backend/db.sqlite3` | sqlite file (the Docker image uses `/data/db.sqlite3`). |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | console e-mails | Alert e-mails go through SMTP once `EMAIL_HOST` is set. |
| `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `BEHIND_HTTPS_PROXY` | off | Production hardening, see `.env.example`. |

Check a production-like configuration with `python manage.py check --deploy`.

## Deployment

`Dockerfile` (gunicorn + whitenoise for static files, runs `migrate` at start, sqlite in the `/data` volume) and, at the repository root,
`docker-compose.yml` for a production-like local run: `docker compose up --build`. Static files are served by whitenoise
(`collectstatic` runs at image build time). sqlite is fine for a demo or a small deployment; plan a proper database and backups before real traffic.

Other settings worth knowing (`config/settings.py`): `CANCELLATION_WINDOW_HOURS` (24), `AVAILABILITY_HORIZON_WEEKS` (8),
`LOCAL_TIME_ZONE` (Europe/Paris, used by recurring availabilities) and `DEFAULT_APPOINTMENT_INSTRUCTIONS`.

## Database schema

Hand-written from the models: update it when a model changes.

```mermaid
erDiagram
    User ||--o| ConciliateurProfile : "has (role CONCILIATEUR)"
    User ||--o{ Appointment : books
    User ||--o{ Notification : receives
    Appointment ||--o{ Notification : about
    ConciliateurProfile ||--o{ Availability : defines
    ConciliateurProfile ||--o{ Slot : publishes
    Availability ||--o{ Slot : generates
    Slot ||--o{ Appointment : "booked by"

    User {
        int id PK
        string email UK
        string password
        string first_name
        string last_name
        string role "USER | CONCILIATEUR"
    }
    ConciliateurProfile {
        int id PK
        int user_id FK, UK
        string city
        string department "indexed, ex 69 or 2A"
        text bio
        text instructions "shown after booking, empty = default text"
        bool is_verified "default false"
        string calendar_token UK "nullable, secret of the .ics feed"
    }
    Availability {
        int id PK
        int conciliateur_id FK
        int weekday "0 = Monday"
        time start_time "local time"
        time end_time
        int slot_minutes "15 to 240"
        string location
        date valid_from "nullable"
        date valid_until "nullable"
        date generated_until "slots exist up to this day"
    }
    Slot {
        int id PK
        int conciliateur_id FK
        int availability_id FK "nullable, SET_NULL"
        datetime start "UK with conciliateur"
        datetime end "CHECK end > start"
        string location
    }
    Appointment {
        int id PK
        int user_id FK
        int slot_id FK "on_delete PROTECT"
        string status "BOOKED | CANCELLED"
        string first_name "plaignant, given at booking"
        string last_name
        string phone
        text motive
        datetime created_at
    }
    Notification {
        int id PK
        int recipient_id FK
        int appointment_id FK "nullable, SET_NULL"
        string kind "APPOINTMENT_BOOKED | UPDATED | CANCELLED"
        text message
        datetime created_at
        datetime read_at "nullable"
    }
    Candidature {
        int id PK
        string first_name
        string last_name
        string email
        string phone
        string department "indexed"
        text message
        bool consent
        bool handled "association has called back"
        datetime created_at
    }
```

`Appointment.slot` is unique among `BOOKED` rows only (a cancelled one frees the slot).

Inspect the real database:

```bash
sqlite3 db.sqlite3 .schema                          # actual tables
python manage.py sqlmigrate appointments 0001       # SQL of a migration
python manage.py showmigrations                     # applied / pending
```
