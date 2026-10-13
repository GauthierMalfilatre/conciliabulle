# Backend

Django REST Framework API, stateless (JWT), sqlite3.

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver                      # Swagger: http://localhost:8000/api/docs/
python manage.py runserver --authorize-all=yes  # testing: unverified conciliateurs are visible/bookable
python manage.py test
```

Conciliateurs have no public registration: create them with
`python manage.py create_conciliateur EMAIL --password ... --city Lyon --department 69` (verified by default, `--unverified` otherwise),
or from the Django admin (`createsuperuser`, then `/admin/`). The admin also lists the `Candidature`s (people who want to become conciliateurs).
Settings worth knowing (`config/settings.py`): `CANCELLATION_WINDOW_HOURS` (24), `AVAILABILITY_HORIZON_WEEKS` (8),
`LOCAL_TIME_ZONE` (Europe/Paris, used by recurring availabilities), `DEFAULT_APPOINTMENT_INSTRUCTIONS`, env var `CORS_ALLOWED_ORIGINS` (default: localhost:3000).

Alert e-mails (conciliateur notified on booking/change/cancellation) are printed in the console by default. For real SMTP set
`EMAIL_HOST`, `EMAIL_PORT` (587), `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` and `DEFAULT_FROM_EMAIL`.

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
