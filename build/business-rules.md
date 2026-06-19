# Folio — Business Rules

These rules are absolute. They must be enforced at the model, service, and API level. No exceptions.

---

## Data Flow Rules

1. Data flows in one direction only: **CV → Topical Resume → Custom Resume**
2. Editing a Custom Resume never affects its parent Topical Resume or the CV
3. Editing a Topical Resume never affects the CV
4. A copied Custom Resume is fully independent of the original the moment it is created
5. No endpoint, service method, or background task may write data upstream

---

## CV Rules

6. Each user has exactly one CV. Enforce with a `OneToOneField` and at the API level — `POST /api/cv/` must return an error if the user already has a CV.
7. CV sections are limited to the 16 predefined `SectionType` values. No other section types may be created.
8. Each section type may appear only once per CV. Enforce with `unique_together = ['cv', 'section_type']`.
9. CV entries are never deleted when used in a Topical Resume. Deleting a CV entry sets the `cv_entry` FK on related `TopicalResumeEntry` records to NULL using `SET_NULL`. The `TopicalResumeEntry` and its stored `data` are preserved.

---

## Topical Resume Rules

10. A user may have unlimited Topical Resumes.
11. Topical Resume sections are copies of CV sections — they reference the same `section_type` but are independent records.
12. Section-level toggle (`is_active`) is enforced server-side. When serializing a Topical Resume for AI input or frontend display, entries belonging to inactive sections must be excluded.
13. Entry-level selection is explicit — only entries with a `TopicalResumeEntry` record are included. The absence of a record means the entry was not selected.
14. A single CV entry may appear in multiple Topical Resumes simultaneously.
15. Deleting a Topical Resume deletes all its Custom Resumes. Enforce with `CASCADE`.

---

## Custom Resume Rules

16. A user may have unlimited Custom Resumes per Topical Resume.
17. Deleting a Custom Resume does not affect any Job Application records that reference it. Use `SET_NULL` on the `JobApplication.custom_resume` FK.
18. A copied Custom Resume sets `generation_method = 'copied'` and `copied_from` to the source record's ID. The copy is otherwise fully independent.
19. Custom Resume entries retain their `topical_entry` FK for traceability, but if the source `TopicalResumeEntry` is deleted, the FK is set to NULL and the entry data is preserved.

---

## Job Application Rules

20. A Job Application belongs to a user. All queries must filter by `request.user`.
21. A Job Application may reference a Custom Resume, but the Custom Resume is not required. A user may create an application without attaching a resume.
22. Cover letters are stored as TipTap HTML in `JobApplication.cover_letter`. They are editable after AI generation.
23. Activity log entries are append-only from a UX perspective, but the API allows update and delete for correction purposes.

---

## User & Access Rules

24. There is no public registration. Accounts are created only by the administrator in the Django admin panel.
25. Every API endpoint requires authentication. Return `401` for unauthenticated requests.
26. Every data query is scoped to `request.user`. A user may never read, write, or delete another user's data. Return `403` if a user attempts to access a record that belongs to another user.
27. Administrator access to the Django admin panel is for account management only — not for editing user resume data.

---

## AI Rules

28. All Anthropic API calls are made server-side only. The Anthropic API key must never appear in frontend code, responses, or logs.
29. AI may not invent content. Prompts must explicitly instruct the model not to fabricate experience, credentials, dates, organizations, or achievements.
30. If AI generation fails for any reason, no partial database records are created. Roll back any partial writes.
31. AI-generated content is always editable by the user after generation. No AI output is ever locked or read-only.

---

## Ordering Rules

32. All section and entry models have an explicit `order` integer field.
33. Order is controlled by the frontend via drag-to-reorder.
34. Reorder endpoints accept an ordered list of IDs and update the `order` field accordingly.
35. All list endpoints return records sorted by `order` ascending.

---

## Theme Rules

36. Theme settings (colors, font) are stored per user in `UserProfile`.
37. Theme settings apply to both the application UI and resume output/export.
38. Font files are uploaded by the user and stored server-side. The filename and path are stored in `UserProfile.font_file`.
39. If a user has not uploaded a font, the app uses its default system font stack.
