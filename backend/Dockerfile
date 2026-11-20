FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install -r backend/requirements.txt && useradd --uid 10001 --create-home app
COPY --chown=app:app backend /app/backend
RUN python backend/manage.py collectstatic --noinput && chown -R app:app /app/backend/staticfiles
USER app
WORKDIR /app/backend
CMD ["gunicorn", "--config", "gunicorn.conf.py", "config.wsgi:application"]
