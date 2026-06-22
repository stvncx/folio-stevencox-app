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
    'company_analysis': (
        "You are a career advisor researching a company as a potential employer for a specific "
        "candidate. Use web search to find current, factual information about the company.\n\n"
        "Then write an assessment as clean HTML (use <h3>, <p>, <ul><li>; never markdown fences). "
        "Cover, in this order:\n"
        "- Overview: what the company does, industry, size, locations, products/services\n"
        "- Reputation & culture: themes from employee reviews and news\n"
        "- Recent news or notable developments\n"
        "- Pros and cons as an employer\n"
        "- Fit for the candidate: assess how well this company matches the candidate's stated "
        "preferences, the work they find fulfilling, and their personality answers. End this "
        "section with an explicit rating on its own line — <strong>Fit: Strong</strong>, "
        "<strong>Fit: Moderate</strong>, or <strong>Fit: Weak</strong> — followed by a one-sentence "
        "rationale.\n\n"
        "Be honest about unknowns and never fabricate facts. If web search yields little, say so "
        "and base the assessment on general knowledge."
    ),
    'personality_questions': (
        "Generate up to 10 concise, thoughtful questions whose answers would help determine "
        "whether a given job or company is a good personality and values fit for this person. "
        "Span work style, ideal environment, motivation, values, collaboration vs autonomy, "
        "pace/risk tolerance, and growth. Tailor to anything already known about the person.\n\n"
        "Return ONLY a JSON array of question strings — no preamble, no markdown, no object keys."
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


def _text_of(resp) -> str:
    return ''.join(b.text for b in resp.content if getattr(b, 'type', None) == 'text').strip()


async def analyze_company(company: str, url: str, profile_text: str, max_searches: int = 3) -> str:
    """Research a company (web search) and assess fit. Returns HTML.

    max_searches caps how many web searches the model may run — the main cost
    driver — so callers can offer cheaper/deeper tiers.
    """
    client = _client()
    n = max(1, min(int(max_searches), 12))
    user_text = (
        f"Company: {company}\n"
        f"Company website: {url or '(none provided)'}\n\n"
        f"Candidate profile (use this to assess fit):\n{profile_text or '(no profile provided yet)'}"
    )
    messages = [{'role': 'user', 'content': user_text}]
    last = None
    # Try with web search; if the tool is unavailable, fall back to no tools.
    for tools in ([{'type': 'web_search_20250305', 'name': 'web_search', 'max_uses': n}], None):
        try:
            kwargs = dict(model=settings.ANTHROPIC_MODEL, max_tokens=settings.ANTHROPIC_MAX_TOKENS,
                          system=SYSTEMS['company_analysis'], messages=messages)
            if tools:
                kwargs['tools'] = tools
            text = _text_of(await client.messages.create(**kwargs))
            if text:
                if not tools:
                    text = '<p><em>(Web search was unavailable; based on general knowledge.)</em></p>' + text
                return text
        except Exception as e:  # noqa: BLE001
            logger.warning('analyze_company attempt failed (web_search=%s): %s', bool(tools), e)
            last = e
    raise last or RuntimeError('Analysis produced no text.')


async def generate_personality_questions(profile_text: str) -> list:
    """Generate up to 10 personality/fit questions. Returns a list of strings."""
    import json
    client = _client()
    resp = await client.messages.create(
        model=settings.ANTHROPIC_MODEL, max_tokens=1024,
        system=SYSTEMS['personality_questions'],
        messages=[{'role': 'user',
                   'content': f"About the person:\n{profile_text or '(little known yet)'}\n\nGenerate the questions now."}],
    )
    text = _text_of(resp)
    text = text.removeprefix('```json').removeprefix('```').removesuffix('```').strip()
    try:
        qs = json.loads(text)
        return [str(q).strip() for q in qs if str(q).strip()][:10]
    except Exception:  # noqa: BLE001
        lines = [ln.strip(' -•\t0123456789.').strip() for ln in text.splitlines()]
        return [ln for ln in lines if len(ln) > 8][:10]
