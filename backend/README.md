# Backend

Django REST Framework API, stateless (JWT), sqlite3.

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver                      # Swagger: http://localhost:8000/api/docs/
python manage.py runserver --authorize-all=yes  # testing: unverified conciliateurs are visible/bookable
python manage.py test
```

Conciliateurs register unverified; validate them from the Django admin (`createsuperuser`, then `/admin/`).
Cancel/reschedule window: `CANCELLATION_WINDOW_HOURS` in `config/settings.py`.

## Database schema

Hand-written from the models: update it when a model changes.

```mermaid
erDiagram
    User ||--o| ConciliateurProfile : "has (role CONCILIATEUR)"
    User ||--o{ Appointment : books
    ConciliateurProfile ||--o{ Slot : publishes
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
        text bio
        bool is_verified "default false"
    }
    Slot {
        int id PK
        int conciliateur_id FK
        datetime start "UK with conciliateur"
        datetime end "CHECK end > start"
    }
    Appointment {
        int id PK
        int user_id FK
        int slot_id FK "on_delete PROTECT"
        string status "BOOKED | CANCELLED"
        text motive
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
