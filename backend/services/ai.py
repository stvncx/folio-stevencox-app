"""Anthropic integration. All calls are server-side. Streaming via AsyncAnthropic.

The consumer serializes DB data (sync) into the user text, then iterates the
async token stream here. System prompts are verbatim from the build spec.
"""
import logging

from django.conf import settings

logger = logging.getLogger('services.ai')


class AIConfigError(RuntimeError):
    pass


SYSTEMS = {
    'topical': (
        "You are a professional resume writer. You will be given a user's complete CV "
        "and a description of the types of jobs they want to apply for.\n\n"
        "Your task is to select the most relevant sections and entries from the CV and "
        "organize them into a focused Topical Resume that is well-suited to the described "
        "job type.\n\nRules:\n"
        "- Only include sections and entries that are relevant to the described job type\n"
        "- Do not include sections or entries that have no relevance\n"
        "- Do not invent, embellish, or add any content not present in the CV\n"
        "- Prioritize recency and direct relevance\n"
        "- You may rewrite bullets for clarity and conciseness but must not change factual content\n"
        "- Return only valid JSON — no preamble, no explanation, no markdown fences\n\n"
        "Return a JSON object matching this exact structure:\n"
        '{\n  "title": "string — suggested title for this topical resume",\n'
        '  "sections": [\n    {\n      "section_type": "string — must match a valid SectionType value",\n'
        '      "title": "string — display title for the section",\n      "order": 1,\n'
        '      "entries": [\n        {\n          "cv_entry_id": 12,\n          "order": 1,\n'
        '          "data": { }\n        }\n      ]\n    }\n  ]\n}'
    ),
    'custom': (
        "You are a professional resume writer specializing in tailoring resumes to specific "
        "job postings.\n\nYou will be given a topical resume and a job posting. Your task is to "
        "rewrite and optimize the resume to best match the job posting.\n\n"
        "You may:\n- Reorder sections and entries to lead with the most relevant content\n"
        "- Rewrite bullet points for keyword alignment and relevance to this specific role\n"
        "- Adjust descriptions to emphasize transferable skills\n"
        "- Rewrite or refine the summary/about section to speak directly to this role\n\n"
        "You must not:\n- Invent experience, credentials, skills, or achievements not present "
        "in the topical resume\n- Remove entries entirely unless they are genuinely irrelevant "
        "to this role\n- Change factual information such as dates, titles, or organizations\n\n"
        "Return only valid JSON — no preamble, no explanation, no markdown fences.\n\n"
        "Return a JSON object matching this exact structure:\n"
        '{\n  "sections": [\n    {\n      "section_type": "string",\n      "title": "string",\n'
        '      "order": 1,\n      "entries": [\n        {\n          "topical_entry_id": 12,\n'
        '          "order": 1,\n          "data": { }\n        }\n      ]\n    }\n  ]\n}'
    ),
    'cover_letter': (
        "You are a professional cover letter writer.\n\nYou will be given a tailored resume and "
        "a job posting. Your task is to write a compelling, professional cover letter that:\n"
        "- Opens with a strong, specific hook — not a generic opener\n"
        "- Connects the candidate's experience directly to the role's requirements\n"
        "- Highlights 2-3 specific achievements or experiences from the resume that are most "
        "relevant to this position\n- Demonstrates knowledge of what the role requires\n"
        "- Closes with a clear call to action\n- Is written in first person, professional but not stiff\n"
        "- Is 3-4 paragraphs in length\n- Does not simply restate the resume — it tells a story "
        "that complements it\n\nDo not invent experience or achievements not present in the resume.\n"
        "Return the cover letter as clean HTML suitable for a TipTap editor — use <p> tags for "
        "paragraphs. No other formatting unless appropriate."
    ),
}


def _client():
    if not settings.ANTHROPIC_API_KEY:
        raise AIConfigError(
            'ANTHROPIC_API_KEY is not set on the server. Add it to backend/.env and restart.')
    import anthropic
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def stream(kind: str, user_text: str):
    """Async-yield text chunks from the model for the given generation kind."""
    client = _client()
    system = SYSTEMS[kind]
    async with client.messages.stream(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=settings.ANTHROPIC_MAX_TOKENS,
        system=system,
        messages=[{'role': 'user', 'content': user_text}],
    ) as s:
        async for text in s.text_stream:
            yield text
