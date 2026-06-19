# Folio — Build Instructions

## What You Are Reading

This is a complete set of build instructions for an application called **Folio**. These documents are intended to be handed directly to Claude Code running on the server. Every document in this set is an instruction to be executed, not a suggestion or a reference.

Read all documents in this folder before writing a single line of code. Build in the order specified in this README.

---

## What Folio Is

Folio is a private, invitation-only career document management application hosted at **folio.stevencox.org** on an Infomaniak VPS running Ubuntu.

Folio allows a small number of invited users to manage their career documents in a structured three-tier hierarchy:

1. **CV** — A master repository of everything a user has ever done professionally. Never sent to an employer.
2. **Topical Resume** — A curated subset of the CV, organized around a career domain or job type. A user can have many.
3. **Custom Resume** — Generated from a Topical Resume, tailored to a specific job posting. Many per Topical Resume. This is the document that goes to an employer.

In addition to the three-tier resume system, Folio includes a **Job Application Tracker** that manages the full lifecycle of a job application — cover letters, contacts, interviews, status, and activity log.

AI (Anthropic API) is used to:
- Generate Topical Resumes from the CV
- Generate Custom Resumes from a Topical Resume and job posting
- Generate Cover Letters from a Custom Resume and job posting

---

## Users

Folio is private. There is no public registration. The administrator (site owner) creates accounts manually via the Django admin panel. The expected user count is 6–8 people maximum.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Django 6 (ASGI) |
| API | Django Ninja |
| Database | PostgreSQL 18 |
| Server | Uvicorn |
| Real-time / Streaming | Django Channels + Redis |
| Frontend | React + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Rich Text Editor | TipTap |
| AI | Anthropic API — claude-sonnet-4-6 |
| Hosting | Infomaniak VPS (Ubuntu) — folio.stevencox.org |

---

## Build Order

Execute in this exact order:

1. Read all docs in this folder completely before starting
2. Set up the server environment (`environment.md`)
3. Initialize the Django project with ASGI, Django Ninja, Channels, and PostgreSQL
4. Build all Django models and run migrations (`data-models.md`)
5. Build all API endpoints (`api-endpoints.md`)
6. Build AI service layer (`ai-integration.md`)
7. Initialize React + TypeScript + Vite frontend
8. Build all frontend views and components (`frontend.md`)
9. Implement theme customization system (`frontend.md`)
10. Integrate TipTap editor (`frontend.md`)
11. Connect AI streaming to frontend (`ai-integration.md`)
12. Final environment configuration and deployment (`environment.md`)

---

## Documents in This Folder

| File | Contents |
|---|---|
| `README.md` | This file — project overview and build order |
| `architecture.md` | System design, three-tier model, data flow rules |
| `data-models.md` | All Django models, fields, relationships, CV section field definitions |
| `api-endpoints.md` | All Django Ninja API endpoints |
| `ai-integration.md` | All AI functions, prompts, streaming, expected responses |
| `business-rules.md` | All rules governing data flow, user management, selection model |
| `frontend.md` | All React views, components, TipTap, theme customization |
| `environment.md` | Environment variables, dependencies, server setup |
