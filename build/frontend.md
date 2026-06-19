# Folio — Frontend

Build the frontend as a React + TypeScript SPA using Vite. Style with Tailwind CSS v4. Use TipTap as the rich text editor throughout the application. Use React Query for all API state management.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React + TypeScript | SPA framework |
| Vite | Build tool |
| Tailwind CSS v4 | Styling |
| React Query | API state management and caching |
| TipTap | Rich text editor (all description fields, cover letters) |
| React Router | Client-side routing |
| WebSocket (native) | AI streaming connection |

---

## Theme System

The theme system must be implemented before building any other UI components, because all components consume theme values.

### Theme Variables

Theme values are loaded from the user's `UserProfile` and injected as CSS custom properties on the `<html>` element:

```css
--color-primary: #000000;
--color-accent: #0066cc;
--font-family-custom: 'UserUploadedFont', sans-serif;
```

### Theme Application

- All components use `var(--color-primary)` and `var(--color-accent)` for branded colors
- If the user has uploaded a font, load it via `@font-face` and apply it globally
- Theme changes on the Theme page preview in real time before saving
- Theme applies to both the app UI and resume export/print output

### Theme Page (`/settings/theme`)

- Color picker for primary color
- Color picker for accent color
- Font upload (accepts .ttf, .otf, .woff, .woff2)
- Live preview panel showing a sample resume with current theme applied
- Save button — calls `PATCH /api/profile/`

---

## TipTap Configuration

TipTap is used for all rich text fields. Configure with the following extensions:

```typescript
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Link from '@tiptap/extension-link'

const editor = useEditor({
  extensions: [
    StarterKit,
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    Link,
  ],
})
```

### TipTap Toolbar

Every TipTap instance must show a toolbar with:
- Bold, Italic, Underline
- Bullet list, Ordered list
- Insert table, Add row, Remove row, Add column, Remove column
- Link insert
- Clear formatting

---

## Routing

```
/                          — redirect to /cv if authenticated, /login if not
/login                     — login page
/cv                        — CV editor
/topical                   — list of topical resumes
/topical/new               — create topical resume
/topical/:id               — topical resume editor
/topical/:id/custom        — list of custom resumes under this topical resume
/topical/:id/custom/new    — create custom resume
/topical/:id/custom/:cid   — custom resume editor
/applications              — job application tracker list
/applications/new          — create application
/applications/:id          — application detail
/settings/theme            — theme customization
```

---

## Views & Components

### Login (`/login`)
- Email and password fields
- Submit button
- No registration link — accounts are created by admin only
- On success: redirect to `/cv`

---

### CV Editor (`/cv`)

The primary data entry view. This is where users build and maintain their master career record.

**Layout:**
- Left sidebar: list of all 16 section types, with toggle to show/hide sections that have been added
- Main area: active sections displayed as cards, drag-to-reorder sections
- Each section card: section title, drag handle, list of entries, "Add entry" button, drag-to-reorder entries

**Section behavior:**
- User clicks a section type in the sidebar to add it to the CV
- Each section type can only be added once
- Sections can be reordered by dragging

**Entry behavior:**
- Clicking "Add entry" opens a slide-over or modal with the correct form for that section type
- Each section type renders a different form — see `data-models.md` for field definitions
- All description fields use TipTap editor
- Date fields: month/year picker (not full date — LinkedIn style)
- "Is current" toggles hide the end date field
- Entries can be reordered by dragging within their section
- Entries can be edited and deleted inline

---

### Topical Resume List (`/topical`)

- Grid or list of topical resume cards
- Each card: title, description, count of custom resumes, created date, edit and delete actions
- "Create Topical Resume" button — opens creation flow

---

### Topical Resume Creation (`/topical/new`)

Two-path creation flow presented as a clear choice:

**Path A — Manual:**
- User enters title and description
- Proceeds to the Topical Resume editor to select sections and entries manually

**Path B — AI:**
- User enters title and a description of the job type they are targeting
- Submits — AI generation begins
- Show streaming progress: display tokens as they arrive in a preview panel
- On complete: navigate to the Topical Resume editor showing the AI-generated result

---

### Topical Resume Editor (`/topical/:id`)

**Layout:**
- Left panel: CV sections and entries available for selection
- Right panel: current topical resume — sections and entries selected so far

**Left panel behavior:**
- Shows all CV sections
- Section toggle (on/off) at the section level — toggling off greys out all entries in that section
- Within an active section, individual entries can be checked/unchecked for inclusion
- Checked entries appear in the right panel

**Right panel behavior:**
- Shows only active sections with selected entries
- Sections and entries can be reordered by dragging
- Individual entries can be edited (overrides copied from CV data)
- Changes save automatically or via explicit save button

---

### Custom Resume List (`/topical/:id/custom`)

- List of custom resumes under the current topical resume
- Each item: title, company, position, created date, generation method badge (AI / Copied), edit/copy/delete actions
- "Generate Custom Resume" button

---

### Custom Resume Creation (`/topical/:id/custom/new`)

Two-path creation flow:

**Path A — AI Generation:**
- Fields: title, company name, position title, job posting (large textarea)
- Submit — AI generation begins with streaming preview
- On complete: navigate directly to Custom Resume editor

**Path B — Copy Existing:**
- Dropdown to select an existing Custom Resume from this Topical Resume to copy
- Title field for the new copy
- Submit — instant, no AI — navigate to the new Custom Resume editor

---

### Custom Resume Editor (`/topical/:id/custom/:cid`)

Full editing interface for a generated or copied custom resume.

**Layout:**
- Toolbar at top: save, export to PDF, print
- Section list with drag-to-reorder
- Each section: entries with drag-to-reorder
- Each entry: all fields editable inline using the same section-type-specific forms as the CV editor
- Description fields use TipTap

**Export/Print:**
- When exporting or printing, apply user's theme (colors, font)
- Output must be clean and professional — not a screenshot of the app UI
- Use print CSS or a PDF generation library to produce a formatted single or two-page resume

---

### Job Application Tracker List (`/applications`)

- Table or card list of all applications
- Columns: company, position, status, applied date, last activity
- Status filter tabs (All, Applied, Interview, Offer, Rejected, etc.)
- "Add Application" button
- Click row to open application detail

---

### Application Detail (`/applications/:id`)

Tabbed layout:

**Tab 1 — Overview:**
- Company, position, status dropdown, dates (applied, follow-up, offer deadline)
- Linked Custom Resume (select from user's custom resumes)
- Notes field (TipTap)

**Tab 2 — Cover Letter:**
- If no cover letter exists: "Generate Cover Letter" button
  - Requires a Custom Resume to be linked
  - AI generates cover letter with streaming preview
  - On complete: opens in TipTap editor
- If cover letter exists: TipTap editor with full content, editable

**Tab 3 — Contacts:**
- List of contacts (recruiter, hiring manager, other)
- Add/edit/delete contacts
- Each contact: name, role, title, email, phone, LinkedIn URL, notes

**Tab 4 — Activity Log:**
- Chronological list of activities
- Log new activity: type, date, title, notes
- Edit and delete existing entries

---

## AI Streaming UI Pattern

Used in three places: Topical Resume generation, Custom Resume generation, Cover Letter generation.

1. User submits the generation form
2. A loading panel appears with the label "Generating..." and a progress indicator
3. As tokens stream in via WebSocket, display them in a read-only preview area
4. When the `complete` message arrives, hide the loading panel and navigate to the result
5. If an `error` message arrives, display it clearly and allow the user to try again

---

## General UI Requirements

- Fully responsive down to mobile
- All destructive actions (delete) require a confirmation dialog
- Drag-to-reorder uses a standard drag-and-drop library (e.g. `@dnd-kit/core`)
- Empty states are helpful — tell the user what to do next, not just "No items found"
- Form validation errors are shown inline at the field level
- Successful saves show a brief toast notification
- Navigation shows the user's current location clearly
- The app name "Folio" appears in the top navigation
