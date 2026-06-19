# Folio — Architecture

## System Overview

Folio is a single-server application. Django serves the API. React serves the frontend as a SPA. PostgreSQL stores all data. Redis handles WebSocket connections and caching. Uvicorn runs the ASGI server. Django Channels handles real-time streaming of AI responses.

```
Browser (React SPA)
        │
        ▼
   Uvicorn (ASGI)
        │
   ┌────┴────┐
   │         │
Django    Django Channels
Ninja      (WebSocket)
   │         │
   └────┬────┘
        │
   Django ORM
        │
   PostgreSQL
        │
   Redis (Channels layer + cache)
        │
   Anthropic API (server-side only)
```

---

## Three-Tier Document Hierarchy

### Tier 1: CV

- One CV per user
- The master repository of a user's complete career history
- Contains all sections and all entries — nothing is filtered or hidden at this level
- Never sent to an employer
- Sections are fixed to LinkedIn's standard section list (see `data-models.md`)
- Each section type has its own field schema (see `data-models.md`)
- Data flows downward only — CV feeds Topical Resumes; nothing flows back up

### Tier 2: Topical Resume

- Many per user
- A curated subset of the CV organized around a career domain or job type
- Examples: "Technology", "Education", "Project Management"
- Selection is two-level:
  - **Section level** — user toggles entire sections on or off
  - **Entry level** — within an active section, user selects which entries to include
  - A section that is OFF excludes all its entries regardless of entry-level selection
- Two creation methods:
  - **Manual** — user selects sections and entries themselves
  - **AI** — user provides a description of the job type; AI curates from the CV automatically
- Stable — not tailored to a specific job posting
- Data flows downward only — Topical Resume feeds Custom Resumes; nothing flows back up

### Tier 3: Custom Resume

- Many per Topical Resume
- Tailored to a specific job posting
- Two creation methods:
  - **AI** — generated from a Topical Resume and a job posting
  - **Copy** — duplicated from an existing Custom Resume, then edited manually
- Fully editable by the user after generation or copy
- A copied Custom Resume is fully independent — editing it does not affect the original
- This is the document that goes to an employer
- Data flows downward only — nothing flows back up to the Topical Resume or CV

---

## Job Application Tracker

A fourth component that sits alongside the three-tier resume system. Each application record is linked to the Custom Resume that was sent.

Tracks:
- Application basics (company, position, status, dates)
- Documents (Custom Resume sent, Cover Letter)
- Contacts (recruiter, hiring manager, others)
- Activity log (interviews, follow-ups, notes)

Cover letters are AI-generated from the Custom Resume and job posting, then editable by the user.

---

## Data Flow Rules

These are absolute. No exceptions.

1. Data flows in one direction only: CV → Topical Resume → Custom Resume
2. Editing a Custom Resume never affects its Topical Resume or the CV
3. Editing a Topical Resume never affects the CV
4. CV entries are referenced by Topical Resume entries via FK — not copied. If a CV entry is deleted, the Topical Resume entry retains its own stored field values (SET_NULL on FK, not CASCADE)
5. The same rule applies from Topical Resume to Custom Resume
6. A copied Custom Resume is fully independent of the original immediately upon creation

---

## User Management

- No public registration
- Administrator creates accounts manually via Django admin panel
- Expected maximum user count: 6–8
- All data is strictly user-scoped — no user can access another user's data under any circumstance
- Every database query must filter by the authenticated user

---

## AI Architecture

- All Anthropic API calls are made server-side in Django
- The frontend never calls the Anthropic API directly
- The Anthropic API key is never exposed to the frontend
- AI responses are streamed to the frontend via Django Channels WebSocket
- A dedicated Django service class handles all Anthropic API calls — not inline in views
- Model: claude-sonnet-4-6

---

## Real-Time Streaming

AI generation (Topical Resume, Custom Resume, Cover Letter) streams responses to the frontend via WebSocket using Django Channels and Redis as the channel layer. This gives the user immediate feedback as AI generates content rather than waiting for a complete response.

---

## Theme System

Users can customize the visual appearance of Folio via a dedicated theme page. Theme settings apply to both the application UI and the exported resume output. Users can:
- Pick primary and accent colors via color picker
- Upload a custom font
- Preview changes in real time

Theme settings are stored per user in the database.
