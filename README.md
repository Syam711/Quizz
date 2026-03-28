# Prompt2Quiz — v3 Final

Full-stack AI quiz generator. Django DRF backend + React + Bootstrap 5 frontend.

---

## Quick Start

### Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in all 6 variables (see below)

# 4. Load environment variables
export $(grep -v '^#' .env | xargs)   # Linux/Mac
# Windows: set each variable manually or use python-dotenv

# 5. Run migrations
python manage.py migrate

# 6. (Optional) Create admin user
python manage.py createsuperuser

# 7. Configure Google OAuth in Django Admin
#    - Visit http://localhost:8000/admin/
#    - Sites → change "example.com" to "localhost:8000"
#    - Social Applications → Add → Provider: Google
#      Name: Google, Client ID: <your id>, Secret: <your secret>
#      Move "localhost:8000" to Chosen Sites → Save

# 8. Start server
python manage.py runserver
```

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set VITE_API_URL and VITE_GOOGLE_CLIENT_ID

# 3. Start dev server
npm run dev
# Opens at http://localhost:5173
```

---

## Environment Variables

### Backend (.env)

| Variable | Required | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | ✓ | Run: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `GEMINI_API_KEY` | ✓ | From https://aistudio.google.com/ |
| `GOOGLE_CLIENT_ID` | ✓ | From Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | ✓ | Same location |
| `DEBUG` | | `True` for dev, `False` for production |
| `ALLOWED_HOSTS` | | Comma-separated. Default: `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | | Default: `http://localhost:5173` |

### Frontend (.env)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✓ | Backend base URL, e.g. `http://localhost:8000/api` |
| `VITE_GOOGLE_CLIENT_ID` | ✓ | Same `GOOGLE_CLIENT_ID` as backend |

---

## Google Cloud Console Setup

1. Go to https://console.cloud.google.com
2. Create a project (or select existing)
3. Enable **Google+ API** and **Google Identity** 
4. APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorised JavaScript origins: `http://localhost:5173`
   - Authorised redirect URIs: `http://localhost:8000/accounts/google/callback/`
5. Copy Client ID and Client Secret to both `.env` files

---

## API Reference

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/quiz/generate/` | Optional | Generate quiz (batched, with fallback) |
| `GET`  | `/api/quiz/<id>/` | Optional | Get quiz + attempt state |
| `POST` | `/api/quiz/<id>/answer/` | Optional | Save one answer |
| `POST` | `/api/quiz/<id>/bookmark/` | Optional | Toggle bookmark |
| `POST` | `/api/quiz/<id>/flag/` | Optional | Flag question |
| `POST` | `/api/quiz/<id>/finish/` | Optional | Submit, get results |
| `POST` | `/api/quiz/<id>/share/` | Required | Make quiz public |
| `GET`  | `/api/quiz/shared/<token>/` | Public | View shared quiz |
| `GET`  | `/api/quiz/history/` | Required | Paginated history |
| `POST` | `/api/quiz/simplify/` | Optional | AI topic simplification |
| `GET`  | `/api/topics/` | Public | Topic suggestions |
| `POST` | `/api/auth/google/` | — | Google sign-in → JWT |
| `GET`  | `/api/auth/profile/` | Required | User profile + streak |
| `PATCH`| `/api/auth/profile/` | Required | Update preferences |

---

## Architecture

```
backend/
├── accounts/           Custom User model, Google OAuth, streak logic
│   ├── models.py       User (email-based, no username field)
│   ├── views.py        GoogleLoginView, UserProfileView, update_streak()
│   ├── serializers.py  UserProfileSerializer, UpdatePreferencesSerializer
│   └── urls.py
├── quiz/               Core quiz logic
│   ├── models.py       QuizSession, Question, QuestionFlag, QuizAttempt
│   ├── generator.py    Gemini batched generation + fallback cascade
│   ├── views.py        11 API views + throttle classes
│   ├── serializers.py  All request/response serializers
│   └── urls.py
└── quizproject/        Django project config
    ├── settings.py     All settings including JWT, allauth, throttle rates
    └── urls.py

frontend/
├── App.jsx             Complete SPA (all pages + components in one file)
│                       Bootstrap 5 loaded from CDN at runtime
│                       No additional CSS files needed
├── src/main.jsx        React entry point
└── index.html          Vite HTML template
```

## Key Design Decisions

**No CSS files** — Bootstrap 5 + Bootstrap Icons + Google Fonts load from CDN. Custom overrides injected via JS `<style>` tag once on mount. This means zero FOUC, no import order issues, and no build config for styles.

**Session-first quiz state** — Answers, bookmarks, and flags write to `sessionStorage` immediately. Backend sync is fire-and-forget during the quiz. `finish()` sends everything in one batch. Guest users compute results entirely client-side.

**Model fallback cascade** — If Gemini Flash fails, automatically retries with Lite then Pro. Each batch of 3 questions is retried independently so partial failures don't kill the whole quiz.

**Rate limiting** — Two throttle layers: burst (3/5min) and hourly (20/hour). Both return `retry_after` seconds so the frontend can show an accurate cooldown bar.
