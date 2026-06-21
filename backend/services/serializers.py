"""Serialize DB documents → JSON for AI input, and build DB records from AI JSON.

All functions are synchronous (DB access) — call from a consumer via
database_sync_to_async. Record builders validate that any referenced source IDs
actually belong to the requesting user (the model can hallucinate IDs).
"""
from cv.models import CVEntry, SectionType
from resumes.models import (CustomResume, CustomResumeEntry, CustomResumeSection,
                            TopicalResume, TopicalResumeEntry, TopicalResumeSection)

VALID_SECTION_TYPES = set(SectionType.values)


def serialize_cv(cv) -> dict:
    sections = []
    for s in cv.sections.all().prefetch_related('entries'):
        sections.append({
            'section_type': s.section_type,
            'title': s.title,
            'order': s.order,
            'entries': [{'cv_entry_id': e.id, 'order': e.order, 'data': e.data}
                        for e in s.entries.all()],
        })
    return {'sections': sections}


def _resolve_entry_data(data: dict) -> dict:
    """Resolve a per-resume selection (chosen description + chosen bullets) into a
    flat description/bullets so downstream AI/output honours the user's choice."""
    d = dict(data or {})
    if 'descriptions' in d:
        descs = d.get('descriptions') or []
        sel = d.get('selected_description')
        d['description'] = (descs[sel] if isinstance(sel, int) and 0 <= sel < len(descs)
                            else (descs[0] if descs else ''))
        d.pop('descriptions', None)
        d.pop('selected_description', None)
    if 'selected_bullets' in d:
        bullets = d.get('bullets') or []
        sel = d.get('selected_bullets') or []
        d['bullets'] = [bullets[i] for i in sel if isinstance(i, int) and 0 <= i < len(bullets)]
        d.pop('selected_bullets', None)
    return d


def serialize_topical(topical) -> dict:
    """Only ACTIVE sections and their selected entries (business rule 12), with
    each entry's per-resume selection resolved."""
    sections = []
    for s in topical.sections.filter(is_active=True).prefetch_related('entries'):
        sections.append({
            'section_type': s.section_type,
            'title': s.title,
            'order': s.order,
            'entries': [{'topical_entry_id': e.id, 'order': e.order,
                         'data': _resolve_entry_data(e.data)}
                        for e in s.entries.all()],
        })
    return {'title': topical.title, 'description': topical.description, 'sections': sections}


def serialize_custom(custom) -> dict:
    sections = []
    for s in custom.sections.all().prefetch_related('entries'):
        sections.append({
            'section_type': s.section_type,
            'title': s.title,
            'order': s.order,
            'entries': [{'order': e.order, 'data': e.data} for e in s.entries.all()],
        })
    return {'title': custom.title, 'sections': sections}


def build_topical_from_ai(user, title, description, ai_json) -> TopicalResume:
    valid_cv_ids = set(
        CVEntry.objects.filter(section__cv__user=user).values_list('id', flat=True))
    topical = TopicalResume.objects.create(
        user=user, title=ai_json.get('title') or title or 'Untitled', description=description)
    for s in ai_json.get('sections', []):
        st = s.get('section_type')
        if st not in VALID_SECTION_TYPES:
            continue
        section = TopicalResumeSection.objects.create(
            topical_resume=topical, section_type=st,
            title=s.get('title') or st.title(), is_active=True, order=s.get('order', 0))
        for e in s.get('entries', []):
            cid = e.get('cv_entry_id')
            cv_entry_id = cid if cid in valid_cv_ids else None
            TopicalResumeEntry.objects.create(
                section=section, cv_entry_id=cv_entry_id,
                order=e.get('order', 0), data=e.get('data') or {})
    return topical


def build_custom_from_ai(topical, meta, ai_json) -> CustomResume:
    valid_topical_ids = set(
        TopicalResumeEntry.objects.filter(section__topical_resume=topical)
        .values_list('id', flat=True))
    custom = CustomResume.objects.create(
        topical_resume=topical, title=meta.get('title') or 'Untitled',
        job_posting=meta.get('job_posting', ''), company_name=meta.get('company_name', ''),
        position_title=meta.get('position_title', ''),
        generation_method=CustomResume.GenerationMethod.AI_GENERATED)
    for s in ai_json.get('sections', []):
        st = s.get('section_type')
        if st not in VALID_SECTION_TYPES:
            continue
        section = CustomResumeSection.objects.create(
            custom_resume=custom, section_type=st,
            title=s.get('title') or st.title(), order=s.get('order', 0))
        for e in s.get('entries', []):
            tid = e.get('topical_entry_id')
            topical_entry_id = tid if tid in valid_topical_ids else None
            CustomResumeEntry.objects.create(
                section=section, topical_entry_id=topical_entry_id,
                order=e.get('order', 0), data=e.get('data') or {})
    return custom


def deep_copy_custom(source: CustomResume, title: str) -> CustomResume:
    """Independent deep copy (business rule 18)."""
    copy = CustomResume.objects.create(
        topical_resume=source.topical_resume, title=title,
        job_posting=source.job_posting, company_name=source.company_name,
        position_title=source.position_title,
        generation_method=CustomResume.GenerationMethod.COPIED, copied_from=source)
    for s in source.sections.all().prefetch_related('entries'):
        ns = CustomResumeSection.objects.create(
            custom_resume=copy, section_type=s.section_type, title=s.title, order=s.order)
        for e in s.entries.all():
            CustomResumeEntry.objects.create(
                section=ns, topical_entry_id=e.topical_entry_id, order=e.order, data=e.data)
    return copy
