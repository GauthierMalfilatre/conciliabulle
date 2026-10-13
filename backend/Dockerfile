FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# SECRET_KEY is only needed to load the settings while collecting static files.
RUN SECRET_KEY=build-only python manage.py collectstatic --noinput \
    && useradd --create-home app && mkdir /data && chown app /data
USER app

# sqlite lives in a volume so it survives container restarts.
ENV DATABASE_PATH=/data/db.sqlite3
VOLUME /data
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
