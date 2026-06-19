# Folio — AI Integration

All Anthropic API calls are made server-side in Django. The frontend never calls the Anthropic API directly. The API key is never exposed to the frontend.

Build a dedicated service class `AIService` in `folio/services/ai.py` that handles all Anthropic API interactions. Views call the service — logic is never inline in views.

Responses are streamed to the frontend via Django Channels WebSocket connections.

Model: `claude-sonnet-4-6`
Max tokens: `4096`

---

## Streaming Architecture

1. Frontend initiates an AI generation request via REST endpoint
2. Django creates a job record and returns a `job_id`
3. Frontend opens a WebSocket connection to the appropriate `/ws/ai/` endpoint, passing the `job_id`
4. Django Channels consumer calls `AIService` with streaming enabled
5. As tokens arrive from Anthropic, they are sent to the frontend via WebSocket
6. When generation is complete, Django parses the full response, creates the database records, and sends a final `complete` message with the created record ID
7. Frontend closes the WebSocket and navigates to the created record

### WebSocket Message Format

**Streaming (token by token):**
```json
{ "type": "token", "content": "string" }
```

**Complete:**
```json
{ "type": "complete", "record_id": 42 }
```

**Error:**
```json
{ "type": "error", "message": "string" }
```

---

## AI Function 1: Generate Topical Resume

**Trigger:** `POST /api/topical/generate/` followed by `WS /ws/ai/topical/generate/`

**Input:**
- Full CV data — all sections and all entries serialized to JSON
- `description` — user's plain-language description of the job type they are targeting

**System Prompt:**
```
You are a professional resume writer. You will be given a user's complete CV and a description of the types of jobs they want to apply for.

Your task is to select the most relevant sections and entries from the CV and organize them into a focused Topical Resume that is well-suited to the described job type.

Rules:
- Only include sections and entries that are relevant to the described job type
- Do not include sections or entries that have no relevance
- Do not invent, embellish, or add any content not present in the CV
- Prioritize recency and direct relevance
- You may rewrite bullets for clarity and conciseness but must not change factual content
- Return only valid JSON — no preamble, no explanation, no markdown fences

Return a JSON object matching this exact structure:
{
  "title": "string — suggested title for this topical resume",
  "sections": [
    {
      "section_type": "string — must match a valid SectionType value",
      "title": "string — display title for the section",
      "order": 1,
      "entries": [
        {
          "cv_entry_id": 12,
          "order": 1,
          "data": { } // the entry data, may be a subset or lightly edited version of the CV entry data
        }
      ]
    }
  ]
}
```

**Django behavior after stream completes:**
1. Parse the complete JSON response
2. Create `TopicalResume` record
3. For each section in response: create `TopicalResumeSection`
4. For each entry in section: create `TopicalResumeEntry` with `cv_entry` FK set to the referenced CV entry
5. Send `complete` message with the new `TopicalResume` ID
6. Frontend navigates to the Topical Resume editor

---

## AI Function 2: Generate Custom Resume

**Trigger:** `POST /api/topical/{id}/custom/generate/` followed by `WS /ws/ai/custom/generate/`

**Input:**
- Full Topical Resume data — all active sections and selected entries serialized to JSON
- `job_posting` — full text of the job posting
- `company_name`
- `position_title`

**System Prompt:**
```
You are a professional resume writer specializing in tailoring resumes to specific job postings.

You will be given a topical resume and a job posting. Your task is to rewrite and optimize the resume to best match the job posting.

You may:
- Reorder sections and entries to lead with the most relevant content
- Rewrite bullet points for keyword alignment and relevance to this specific role
- Adjust descriptions to emphasize transferable skills
- Rewrite or refine the summary/about section to speak directly to this role

You must not:
- Invent experience, credentials, skills, or achievements not present in the topical resume
- Remove entries entirely unless they are genuinely irrelevant to this role
- Change factual information such as dates, titles, or organizations

Return only valid JSON — no preamble, no explanation, no markdown fences.

Return a JSON object matching this exact structure:
{
  "sections": [
    {
      "section_type": "string",
      "title": "string",
      "order": 1,
      "entries": [
        {
          "topical_entry_id": 12,
          "order": 1,
          "data": { } // tailored version of the entry data
        }
      ]
    }
  ]
}
```

**Django behavior after stream completes:**
1. Parse the complete JSON response
2. Create `CustomResume` record with `generation_method = 'ai_generated'`
3. For each section: create `CustomResumeSection`
4. For each entry: create `CustomResumeEntry` with `topical_entry` FK set
5. Send `complete` message with the new `CustomResume` ID
6. Frontend navigates directly to the Custom Resume editor for review and editing

---

## AI Function 3: Copy Custom Resume

**Trigger:** `POST /api/topical/{id}/custom/{cid}/copy/`

**No AI involved.** This is a pure data operation.

**Django behavior:**
1. Deep copy the `CustomResume` record and all related `CustomResumeSection` and `CustomResumeEntry` records
2. Set `generation_method = 'copied'`
3. Set `copied_from` FK to the source `CustomResume`
4. Set `title` from the request body
5. All FKs to `topical_entry` are preserved in the copy
6. The copy is immediately independent — no link back to the original for data purposes
7. Return the new `CustomResume` record

---

## AI Function 4: Generate Cover Letter

**Trigger:** `POST /api/applications/{id}/cover-letter/generate/` followed by `WS /ws/ai/cover-letter/generate/`

**Input:**
- Full Custom Resume data serialized to JSON
- `job_posting` — full text of the job posting
- `company_name`
- `position_title`

**System Prompt:**
```
You are a professional cover letter writer.

You will be given a tailored resume and a job posting. Your task is to write a compelling, professional cover letter that:
- Opens with a strong, specific hook — not a generic opener
- Connects the candidate's experience directly to the role's requirements
- Highlights 2-3 specific achievements or experiences from the resume that are most relevant to this position
- Demonstrates knowledge of what the role requires
- Closes with a clear call to action
- Is written in first person, professional but not stiff
- Is 3-4 paragraphs in length
- Does not simply restate the resume — it tells a story that complements it

Do not invent experience or achievements not present in the resume.
Return the cover letter as clean HTML suitable for a TipTap editor — use <p> tags for paragraphs. No other formatting unless appropriate.
```

**Django behavior after stream completes:**
1. Save the generated cover letter HTML to `JobApplication.cover_letter`
2. Send `complete` message
3. Frontend opens the cover letter in TipTap editor for review and editing

---

## Error Handling

- Wrap all Anthropic API calls in try/except
- If the API call fails: send `error` WebSocket message with a human-readable explanation
- If the response JSON is malformed or does not match the expected structure: log the raw response, send `error` message, do not create any database records
- Never create partial records — if JSON parsing fails, roll back any partial DB writes
- Log all AI errors with full context for debugging
