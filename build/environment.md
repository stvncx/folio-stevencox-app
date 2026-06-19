# Folio — Environment & Setup

These are the complete setup instructions for the Folio application on the Infomaniak VPS running Ubuntu. Execute these steps before building the application.

---

## Server

- **Host:** folio.stevencox.org
- **OS:** Ubuntu (Infomaniak VPS)
- **GitHub account:** stvncx

---

## Repository Structure

```
folio/                        — project root (git repo)
├── docs/                     — these build instruction documents
├── backend/                  — Django project
│   ├── folio/                — Django project settings package
│   ├── cv/                   — CV app
│   ├── resumes/              — Topical and Custom Resume apps
│   ├── applications/         — Job Application Tracker app
│   ├── users/                — User and UserProfile app
│   ├── services/             — AI service layer
│   │   └── ai.py             — AIService class
│   ├── manage.py
│   └── requirements.txt
└── frontend/                 — React app
    ├── src/
    ├── public/
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## Required Python Packages

Install all of the following:

```
django>=6.0
django-ninja
psycopg2-binary
channels
channels-redis
uvicorn[standard]
daphne
anthropic
python-decouple
django-cors-headers
Pillow
```

Install with:
```bash
pip install -r backend/requirements.txt
```

---

## Required Node Packages

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@tanstack/react-query": "^5",
    "@tiptap/react": "^2",
    "@tiptap/starter-kit": "^2",
    "@tiptap/extension-table": "^2",
    "@tiptap/extension-table-row": "^2",
    "@tiptap/extension-table-cell": "^2",
    "@tiptap/extension-table-header": "^2",
    "@tiptap/extension-link": "^2",
    "@dnd-kit/core": "^6",
    "@dnd-kit/sortable": "^8"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4"
  }
}
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory. This file must never be committed to git.

```env
SECRET_KEY=your-django-secret-key
DEBUG=False
DATABASE_URL=postgresql://folio_user:password@localhost:5432/folio_db
ANTHROPIC_API_KEY=your-anthropic-api-key
ALLOWED_HOSTS=folio.stevencox.org,localhost
CORS_ALLOWED_ORIGINS=https://folio.stevencox.org,http://localhost:5173
REDIS_URL=redis://localhost:6379/0
MEDIA_ROOT=/var/www/folio/media
MEDIA_URL=/media/
```

Add `.env` to `.gitignore` immediately.

---

## PostgreSQL Setup

```sql
CREATE DATABASE folio_db;
CREATE USER folio_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE folio_db TO folio_user;
```

---

## Redis Setup

Redis must be running as a system service. Install if not already present:

```bash
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## Django Settings

Key settings to configure:

```python
# ASGI
ASGI_APPLICATION = 'folio.asgi.application'

# Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [env('REDIS_URL')],
        },
    },
}

# Database
DATABASES = {
    'default': env.db('DATABASE_URL')
}

# CORS
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS')

# Media files (font uploads)
MEDIA_ROOT = env('MEDIA_ROOT')
MEDIA_URL = env('MEDIA_URL')

# Auth
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

---

## ASGI Configuration

```python
# folio/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from folio.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'folio.settings')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

---

## WebSocket URL Routing

```python
# folio/routing.py
from django.urls import path
from services.consumers import (
    TopicalResumeGenerationConsumer,
    CustomResumeGenerationConsumer,
    CoverLetterGenerationConsumer,
)

websocket_urlpatterns = [
    path('ws/ai/topical/generate/', TopicalResumeGenerationConsumer.as_asgi()),
    path('ws/ai/custom/generate/', CustomResumeGenerationConsumer.as_asgi()),
    path('ws/ai/cover-letter/generate/', CoverLetterGenerationConsumer.as_asgi()),
]
```

---

## Running the Application

**Development:**
```bash
# Backend
cd backend
uvicorn folio.asgi:application --reload --port 8000

# Frontend
cd frontend
npm run dev
```

**Production:**
```bash
# Backend — run with Daphne or Uvicorn behind Nginx
uvicorn folio.asgi:application --host 0.0.0.0 --port 8000 --workers 4

# Frontend — build and serve static files via Nginx
cd frontend
npm run build
# Nginx serves the dist/ folder
```

---

## Nginx Configuration (Production)

```nginx
server {
    server_name folio.stevencox.org;

    # Serve React SPA
    location / {
        root /var/www/folio/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Django
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy WebSocket to Django Channels
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Serve uploaded media files
    location /media/ {
        alias /var/www/folio/media/;
    }
}
```

---

## Git Setup

```bash
# Initialize repo
git init
git remote add origin git@github.com:stvncx/folio.git

# Add .gitignore entries
echo ".env" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo "media/" >> .gitignore

git add .
git commit -m "Initial project structure and build instructions"
git push -u origin main
```
