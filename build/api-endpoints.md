# Folio — API Endpoints

Build all endpoints using Django Ninja. All endpoints require authentication except `/api/auth/register/` and `/api/auth/login/`. All data queries must filter by `request.user`. No user can access another user's data.

---

## Authentication

```
POST   /api/auth/login/              — login, return token
POST   /api/auth/logout/             — logout, invalidate token
```

No public registration endpoint. Accounts are created by the administrator in the Django admin panel only.

---

## User Profile & Theme

```
GET    /api/profile/                 — get current user's profile and theme settings
PATCH  /api/profile/                 — update theme settings (colors)
POST   /api/profile/font/            — upload custom font file
DELETE /api/profile/font/            — remove custom font
```

---

## CV

```
GET    /api/cv/                      — get user's CV with all sections and entries
POST   /api/cv/                      — create CV (called once on first login if CV does not exist)

GET    /api/cv/sections/             — list all CV sections
POST   /api/cv/sections/             — create a section
                                       body: { section_type, title, order }
PATCH  /api/cv/sections/{id}/        — update section (title, order)
DELETE /api/cv/sections/{id}/        — delete section and all its entries

POST   /api/cv/sections/reorder/     — reorder sections
                                       body: { ordered_ids: [int] }

GET    /api/cv/sections/{id}/entries/       — list entries in a section
POST   /api/cv/sections/{id}/entries/       — create entry
                                              body: { data: {}, order }
PATCH  /api/cv/sections/{id}/entries/{eid}/ — update entry
                                              body: { data: {}, order }
DELETE /api/cv/sections/{id}/entries/{eid}/ — delete entry

POST   /api/cv/sections/{id}/entries/reorder/ — reorder entries
                                                body: { ordered_ids: [int] }
```

---

## Topical Resumes

```
GET    /api/topical/                        — list all user's topical resumes
POST   /api/topical/                        — create topical resume (manual)
                                              body: { title, description }
GET    /api/topical/{id}/                   — get topical resume with all sections and entries
PATCH  /api/topical/{id}/                   — update topical resume metadata
                                              body: { title, description }
DELETE /api/topical/{id}/                   — delete topical resume and all its custom resumes

POST   /api/topical/generate/               — AI: generate topical resume from CV
                                              body: { title, description }
                                              opens WebSocket stream — see ai-integration.md

GET    /api/topical/{id}/sections/                    — list sections
POST   /api/topical/{id}/sections/                    — add section
                                                        body: { section_type, title, is_active, order }
PATCH  /api/topical/{id}/sections/{sid}/              — update section (title, is_active, order)
DELETE /api/topical/{id}/sections/{sid}/              — delete section and its entries
POST   /api/topical/{id}/sections/reorder/            — reorder sections
                                                        body: { ordered_ids: [int] }

GET    /api/topical/{id}/sections/{sid}/entries/             — list entries
POST   /api/topical/{id}/sections/{sid}/entries/             — add entry (manual selection from CV)
                                                               body: { cv_entry_id, data, order }
PATCH  /api/topical/{id}/sections/{sid}/entries/{eid}/       — update entry
DELETE /api/topical/{id}/sections/{sid}/entries/{eid}/       — delete entry
POST   /api/topical/{id}/sections/{sid}/entries/reorder/     — reorder entries
                                                               body: { ordered_ids: [int] }
```

---

## Custom Resumes

```
GET    /api/topical/{id}/custom/                    — list all custom resumes under a topical resume
POST   /api/topical/{id}/custom/generate/           — AI: generate custom resume from topical resume + job posting
                                                      body: { title, job_posting, company_name, position_title }
                                                      opens WebSocket stream — see ai-integration.md
POST   /api/topical/{id}/custom/{cid}/copy/         — copy a custom resume
                                                      body: { title }

GET    /api/topical/{id}/custom/{cid}/              — get custom resume with all sections and entries
PATCH  /api/topical/{id}/custom/{cid}/              — update custom resume metadata
DELETE /api/topical/{id}/custom/{cid}/              — delete custom resume

GET    /api/custom/{cid}/sections/                          — list sections
POST   /api/custom/{cid}/sections/                          — add section
PATCH  /api/custom/{cid}/sections/{sid}/                    — update section
DELETE /api/custom/{cid}/sections/{sid}/                    — delete section
POST   /api/custom/{cid}/sections/reorder/                  — reorder sections

GET    /api/custom/{cid}/sections/{sid}/entries/             — list entries
POST   /api/custom/{cid}/sections/{sid}/entries/             — add entry
PATCH  /api/custom/{cid}/sections/{sid}/entries/{eid}/       — update entry
DELETE /api/custom/{cid}/sections/{sid}/entries/{eid}/       — delete entry
POST   /api/custom/{cid}/sections/{sid}/entries/reorder/     — reorder entries
```

---

## Job Application Tracker

```
GET    /api/applications/                   — list all user's applications
POST   /api/applications/                   — create application
                                              body: { company_name, position_title, job_posting, status, applied_date, custom_resume_id }
GET    /api/applications/{id}/              — get application detail with contacts and activities
PATCH  /api/applications/{id}/             — update application
DELETE /api/applications/{id}/             — delete application

POST   /api/applications/{id}/cover-letter/generate/   — AI: generate cover letter
                                                          body: { custom_resume_id }
                                                          opens WebSocket stream — see ai-integration.md
PATCH  /api/applications/{id}/cover-letter/            — save edited cover letter
                                                          body: { cover_letter: "TipTap HTML" }

GET    /api/applications/{id}/contacts/                — list contacts
POST   /api/applications/{id}/contacts/                — add contact
                                                         body: { name, role, title, email, phone, linkedin_url, notes }
PATCH  /api/applications/{id}/contacts/{cid}/          — update contact
DELETE /api/applications/{id}/contacts/{cid}/          — delete contact

GET    /api/applications/{id}/activities/              — list activities (chronological)
POST   /api/applications/{id}/activities/              — log activity
                                                         body: { activity_type, date, title, notes }
PATCH  /api/applications/{id}/activities/{aid}/        — update activity
DELETE /api/applications/{id}/activities/{aid}/        — delete activity
```

---

## WebSocket Endpoints

Handled by Django Channels. See `ai-integration.md` for full detail.

```
WS     /ws/ai/topical/generate/         — stream topical resume generation
WS     /ws/ai/custom/generate/          — stream custom resume generation
WS     /ws/ai/cover-letter/generate/    — stream cover letter generation
```

---

## Response Standards

- `200` — success with data
- `201` — created
- `204` — success, no content (deletes)
- `400` — validation error, return field-level errors
- `401` — not authenticated
- `403` — authenticated but not authorized (wrong user)
- `404` — not found
- `502` — AI generation failed, return human-readable message
