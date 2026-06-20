from typing import List, Optional

from ninja import Router, Schema
from ninja.errors import HttpError

from cv.models import CV, REQUIRED_FIELDS, CVEntry, CVSection, SectionType

router = Router(tags=['cv'])

VALID_TYPES = set(SectionType.values)


# --- helpers ---------------------------------------------------------------
def _cv(request):
    cv = CV.objects.filter(user=request.user).first()
    if cv is None:
        raise HttpError(404, 'CV does not exist. Create it first.')
    return cv


def _section(request, sid):
    s = CVSection.objects.filter(id=sid, cv__user=request.user).first()
    if s is None:
        raise HttpError(404, 'Section not found.')
    return s


def _entry(request, sid, eid):
    e = CVEntry.objects.filter(id=eid, section_id=sid, section__cv__user=request.user).first()
    if e is None:
        raise HttpError(404, 'Entry not found.')
    return e


def _validate(section_type, data):
    missing = [f for f in REQUIRED_FIELDS.get(section_type, [])
               if data.get(f) in (None, '')]
    # booleans: required boolean present even if False
    missing = [f for f in missing if not (isinstance(data.get(f), bool))]
    if missing:
        raise HttpError(400, f'Missing required fields for {section_type}: {", ".join(missing)}')


def _entry_dict(e):
    return {'id': e.id, 'order': e.order, 'data': e.data}


def _section_dict(s):
    return {'id': s.id, 'section_type': s.section_type, 'title': s.title,
            'order': s.order, 'entries': [_entry_dict(e) for e in s.entries.all()]}


# --- schemas ---------------------------------------------------------------
class SectionIn(Schema):
    section_type: str
    title: str
    order: int = 0


class SectionPatch(Schema):
    title: Optional[str] = None
    order: Optional[int] = None


class EntryIn(Schema):
    data: dict
    order: int = 0


class ReorderIn(Schema):
    ordered_ids: List[int]


# --- reorder (declared FIRST so literal paths win over /sections/<sid>/) -----
@router.post('/sections/reorder/')
def reorder_sections(request, data: ReorderIn):
    cv = _cv(request)
    for i, sid in enumerate(data.ordered_ids):
        cv.sections.filter(id=sid).update(order=i)
    return [_section_dict(s) for s in cv.sections.all()]


@router.post('/sections/{sid}/entries/reorder/')
def reorder_entries(request, sid: int, data: ReorderIn):
    s = _section(request, sid)
    for i, eid in enumerate(data.ordered_ids):
        s.entries.filter(id=eid).update(order=i)
    return [_entry_dict(e) for e in s.entries.all()]


# --- CV --------------------------------------------------------------------
@router.get('/')
def get_cv(request):
    cv = CV.objects.filter(user=request.user).prefetch_related('sections__entries').first()
    if cv is None:
        return {'exists': False, 'sections': []}
    return {'exists': True, 'id': cv.id,
            'sections': [_section_dict(s) for s in cv.sections.all()]}


@router.post('/')
def create_cv(request):
    if CV.objects.filter(user=request.user).exists():
        raise HttpError(400, 'CV already exists.')
    cv = CV.objects.create(user=request.user)
    return {'exists': True, 'id': cv.id, 'sections': []}


# --- sections --------------------------------------------------------------
@router.get('/sections/')
def list_sections(request):
    cv = _cv(request)
    return [_section_dict(s) for s in cv.sections.all()]


@router.post('/sections/')
def create_section(request, data: SectionIn):
    cv = _cv(request)
    if data.section_type not in VALID_TYPES:
        raise HttpError(400, 'Invalid section_type.')
    if cv.sections.filter(section_type=data.section_type).exists():
        raise HttpError(400, 'That section type already exists in this CV.')
    s = CVSection.objects.create(cv=cv, section_type=data.section_type,
                                 title=data.title, order=data.order)
    return _section_dict(s)


@router.patch('/sections/{sid}/')
def update_section(request, sid: int, data: SectionPatch):
    s = _section(request, sid)
    if data.title is not None:
        s.title = data.title
    if data.order is not None:
        s.order = data.order
    s.save()
    return _section_dict(s)


@router.delete('/sections/{sid}/', response={204: None})
def delete_section(request, sid: int):
    _section(request, sid).delete()
    return 204, None


# --- entries ---------------------------------------------------------------
@router.get('/sections/{sid}/entries/')
def list_entries(request, sid: int):
    s = _section(request, sid)
    return [_entry_dict(e) for e in s.entries.all()]


@router.post('/sections/{sid}/entries/')
def create_entry(request, sid: int, data: EntryIn):
    s = _section(request, sid)
    _validate(s.section_type, data.data)
    e = CVEntry.objects.create(section=s, data=data.data, order=data.order)
    return _entry_dict(e)


@router.patch('/sections/{sid}/entries/{eid}/')
def update_entry(request, sid: int, eid: int, data: EntryIn):
    e = _entry(request, sid, eid)
    _validate(e.section.section_type, data.data)
    e.data = data.data
    e.order = data.order
    e.save()
    return _entry_dict(e)


@router.delete('/sections/{sid}/entries/{eid}/', response={204: None})
def delete_entry(request, sid: int, eid: int):
    _entry(request, sid, eid).delete()
    return 204, None
