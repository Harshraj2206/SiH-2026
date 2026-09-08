# =============================================================================
# LANDSLIDEGUARD SIH26001 - BACKEND DOCKERFILE
# Python 3.10 Slim with FastAPI & Uvicorn
# =============================================================================

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY . .

# Create data directory for SQLite persistence
RUN mkdir -p data

EXPOSE 8000

ENV ENVIRONMENT=production
ENV PORT=8000
ENV HOST=0.0.0.0

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
