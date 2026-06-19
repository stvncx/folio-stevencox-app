from typing import List, Optional

from django.db import transaction
from ninja import Router, Schema
from ninja.errors import HttpError

from resumes.models import (CustomResume, CustomResumeEntry, CustomResumeSection,
                            TopicalResume, TopicalResumeEntry, TopicalResumeSection)
from services.models import AIJob
from services.serializers import deep_copy_custom

topical_router = Router(tags=['topical'])
custom_router = Router(tags=['custom'])


# --- scoping helpers -------------------------------------------------------
def _topical(request, tid):
    o = TopicalResume.objects.filter(id=tid, user=request.user).first()
    if o is None:
        raise HttpError(404, 'Topical resume not found.')
    return o


def _t_section(request, tid, sid):
    s = TopicalResumeSection.objects.filter(
        id=sid, topical_resume_id=tid, topical_resume__user=request.user).first()
    if s is None:
        raise HttpError(404, 'Section not found.')
    return s


def _t_entry(request, sid, eid):
    e = TopicalResumeEntry.objects.filter(
        id=eid, section_id=sid, section__topical_resume__user=request.user).first()
    if e is None:
        raise HttpError(404, 'Entry not found.')
    return e


def _custom(request, cid):
    o = CustomResume.objects.filter(id=cid, topical_resume__user=request.user).first()
    if o is None:
        raise HttpError(404, 'Custom resume not found.')
    return o


def _c_section(request, cid, sid):
    s = CustomResumeSection.objects.filter(
        id=sid, custom_resume_id=cid, custom_resume__topical_resume__user=request.user).first()
    if s is None:
        raise HttpError(404, 'Section not found.')
    return s


def _c_entry(request, sid, eid):
    e = CustomResumeEntry.objects.filter(
        id=eid, section_id=sid, section__custom_resume__topical_resume__user=request.user).first()
    if e is None:
        raise HttpError(404, 'Entry not found.')
    return e


# --- dict builders ---------------------------------------------------------
def _t_entry_d(e):
    return {'id': e.id, 'cv_entry_id': e.cv_entry_id, 'order': e.order, 'data': e.data}


def _t_section_d(s):
    return {'id': s.id, 'section_type': s.section_type, 'title': s.title,
            'is_active': s.is_active, 'order': s.order,
            'entries': [_t_entry_d(e) for e in s.entries.all()]}


def _topical_d(t, full=False):
    d = {'id': t.id, 'title': t.title, 'description': t.description,
         'custom_count': t.custom_resumes.count(),
         'created_at': t.created_at.isoformat(), 'updated_at': t.updated_at.isoformat()}
    if full:
        d['sections'] = [_t_section_d(s) for s in t.sections.all()]
    return d


def _c_entry_d(e):
    return {'id': e.id, 'topical_entry_id': e.topical_entry_id, 'order': e.order, 'data': e.data}


def _c_section_d(s):
    return {'id': s.id, 'section_type': s.section_type, 'title': s.title,
            'order': s.order, 'entries': [_c_entry_d(e) for e in s.entries.all()]}


def _custom_d(c, full=False):
    d = {'id': c.id, 'topical_resume_id': c.topical_resume_id, 'title': c.title,
         'company_name': c.company_name, 'position_title': c.position_title,
         'job_posting': c.job_posting, 'generation_method': c.generation_method,
         'copied_from': c.copied_from_id,
         'created_at': c.created_at.isoformat(), 'updated_at': c.updated_at.isoformat()}
    if full:
        d['sections'] = [_c_section_d(s) for s in c.sections.all()]
    return d


# --- schemas ---------------------------------------------------------------
class TopicalIn(Schema):
    title: str
    description: str = ''


class TopicalPatch(Schema):
    title: Optional[str] = None
    description: Optional[str] = None


class TSectionIn(Schema):
    section_type: str
    title: str
    is_active: bool = True
    order: int = 0


class TSectionPatch(Schema):
    title: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


class TEntryIn(Schema):
    cv_entry_id: Optional[int] = None
    data: dict = {}
    order: int = 0


class TEntryPatch(Schema):
    data: Optional[dict] = None
    order: Optional[int] = None


class CustomGenIn(Schema):
    title: str
    job_posting: str
    company_name: str = ''
    position_title: str = ''


class CopyIn(Schema):
    title: str


class CustomPatch(Schema):
    title: Optional[str] = None
    company_name: Optional[str] = None
    position_title: Optional[str] = None
    job_posting: Optional[str] = None


class SectionIn(Schema):
    section_type: str
    title: str
    order: int = 0


class SectionPatch(Schema):
    title: Optional[str] = None
    order: Optional[int] = None


class EntryIn(Schema):
    data: dict = {}
    order: int = 0


class ReorderIn(Schema):
    ordered_ids: List[int]


# ===========================================================================
#  TOPICAL RESUMES
# ===========================================================================
@topical_router.get('/')
def list_topical(request):
    return [_topical_d(t) for t in TopicalResume.objects.filter(user=request.user)]


@topical_router.post('/')
def create_topical(request, data: TopicalIn):
    t = TopicalResume.objects.create(
        user=request.user, title=data.title, description=data.description)
    return _topical_d(t, full=True)


@topical_router.post('/generate/')
def generate_topical(request, data: TopicalIn):
    job = AIJob.objects.create(
        user=request.user, kind=AIJob.Kind.TOPICAL,
        params={'title': data.title, 'description': data.description})
    return {'job_id': job.id, 'ws': '/ws/ai/topical/generate/'}


@topical_router.get('/{tid}/')
def get_topical(request, tid: int):
    return _topical_d(_topical(request, tid), full=True)


@topical_router.patch('/{tid}/')
def update_topical(request, tid: int, data: TopicalPatch):
    t = _topical(request, tid)
    if data.title is not None:
        t.title = data.title
    if data.description is not None:
        t.description = data.description
    t.save()
    return _topical_d(t, full=True)


@topical_router.delete('/{tid}/', response={204: None})
def delete_topical(request, tid: int):
    _topical(request, tid).delete()
    return 204, None


@topical_router.get('/{tid}/sections/')
def t_list_sections(request, tid: int):
    return [_t_section_d(s) for s in _topical(request, tid).sections.all()]


@topical_router.post('/{tid}/sections/')
def t_create_section(request, tid: int, data: TSectionIn):
    t = _topical(request, tid)
    s = TopicalResumeSection.objects.create(
        topical_resume=t, section_type=data.section_type, title=data.title,
        is_active=data.is_active, order=data.order)
    return _t_section_d(s)


@topical_router.patch('/{tid}/sections/{sid}/')
def t_update_section(request, tid: int, sid: int, data: TSectionPatch):
    s = _t_section(request, tid, sid)
    for f in ('title', 'is_active', 'order'):
        v = getattr(data, f)
        if v is not None:
            setattr(s, f, v)
    s.save()
    return _t_section_d(s)


@topical_router.delete('/{tid}/sections/{sid}/', response={204: None})
def t_delete_section(request, tid: int, sid: int):
    _t_section(request, tid, sid).delete()
    return 204, None


@topical_router.post('/{tid}/sections/reorder/')
def t_reorder_sections(request, tid: int, data: ReorderIn):
    t = _topical(request, tid)
    for i, sid in enumerate(data.ordered_ids):
        t.sections.filter(id=sid).update(order=i)
    return [_t_section_d(s) for s in t.sections.all()]


@topical_router.get('/{tid}/sections/{sid}/entries/')
def t_list_entries(request, tid: int, sid: int):
    return [_t_entry_d(e) for e in _t_section(request, tid, sid).entries.all()]


@topical_router.post('/{tid}/sections/{sid}/entries/')
def t_create_entry(request, tid: int, sid: int, data: TEntryIn):
    s = _t_section(request, tid, sid)
    cv_entry_id = None
    if data.cv_entry_id is not None:
        from cv.models import CVEntry
        if CVEntry.objects.filter(id=data.cv_entry_id, section__cv__user=request.user).exists():
            cv_entry_id = data.cv_entry_id
    e = TopicalResumeEntry.objects.create(
        section=s, cv_entry_id=cv_entry_id, data=data.data, order=data.order)
    return _t_entry_d(e)


@topical_router.patch('/{tid}/sections/{sid}/entries/{eid}/')
def t_update_entry(request, tid: int, sid: int, eid: int, data: TEntryPatch):
    e = _t_entry(request, sid, eid)
    if data.data is not None:
        e.data = data.data
    if data.order is not None:
        e.order = data.order
    e.save()
    return _t_entry_d(e)


@topical_router.delete('/{tid}/sections/{sid}/entries/{eid}/', response={204: None})
def t_delete_entry(request, tid: int, sid: int, eid: int):
    _t_entry(request, sid, eid).delete()
    return 204, None


@topical_router.post('/{tid}/sections/{sid}/entries/reorder/')
def t_reorder_entries(request, tid: int, sid: int, data: ReorderIn):
    s = _t_section(request, tid, sid)
    for i, eid in enumerate(data.ordered_ids):
        s.entries.filter(id=eid).update(order=i)
    return [_t_entry_d(e) for e in s.entries.all()]


# --- custom under topical --------------------------------------------------
@topical_router.get('/{tid}/custom/')
def list_custom(request, tid: int):
    t = _topical(request, tid)
    return [_custom_d(c) for c in t.custom_resumes.all()]


@topical_router.post('/{tid}/custom/generate/')
def generate_custom(request, tid: int, data: CustomGenIn):
    _topical(request, tid)  # ownership check
    job = AIJob.objects.create(
        user=request.user, kind=AIJob.Kind.CUSTOM,
        params={'topical_id': tid, 'title': data.title, 'job_posting': data.job_posting,
                'company_name': data.company_name, 'position_title': data.position_title})
    return {'job_id': job.id, 'ws': '/ws/ai/custom/generate/'}


@topical_router.post('/{tid}/custom/{cid}/copy/')
def copy_custom(request, tid: int, cid: int, data: CopyIn):
    _topical(request, tid)
    source = _custom(request, cid)
    with transaction.atomic():
        copy = deep_copy_custom(source, data.title)
    return _custom_d(copy, full=True)


@topical_router.get('/{tid}/custom/{cid}/')
def get_custom_nested(request, tid: int, cid: int):
    return _custom_d(_custom(request, cid), full=True)


@topical_router.patch('/{tid}/custom/{cid}/')
def update_custom_nested(request, tid: int, cid: int, data: CustomPatch):
    c = _custom(request, cid)
    for f in ('title', 'company_name', 'position_title', 'job_posting'):
        v = getattr(data, f)
        if v is not None:
            setattr(c, f, v)
    c.save()
    return _custom_d(c, full=True)


@topical_router.delete('/{tid}/custom/{cid}/', response={204: None})
def delete_custom_nested(request, tid: int, cid: int):
    _custom(request, cid).delete()
    return 204, None


# ===========================================================================
#  CUSTOM RESUME sections/entries  (/api/custom/...)
# ===========================================================================
@custom_router.get('/{cid}/sections/')
def c_list_sections(request, cid: int):
    return [_c_section_d(s) for s in _custom(request, cid).sections.all()]


@custom_router.post('/{cid}/sections/')
def c_create_section(request, cid: int, data: SectionIn):
    c = _custom(request, cid)
    s = CustomResumeSection.objects.create(
        custom_resume=c, section_type=data.section_type, title=data.title, order=data.order)
    return _c_section_d(s)


@custom_router.patch('/{cid}/sections/{sid}/')
def c_update_section(request, cid: int, sid: int, data: SectionPatch):
    s = _c_section(request, cid, sid)
    if data.title is not None:
        s.title = data.title
    if data.order is not None:
        s.order = data.order
    s.save()
    return _c_section_d(s)


@custom_router.delete('/{cid}/sections/{sid}/', response={204: None})
def c_delete_section(request, cid: int, sid: int):
    _c_section(request, cid, sid).delete()
    return 204, None


@custom_router.post('/{cid}/sections/reorder/')
def c_reorder_sections(request, cid: int, data: ReorderIn):
    c = _custom(request, cid)
    for i, sid in enumerate(data.ordered_ids):
        c.sections.filter(id=sid).update(order=i)
    return [_c_section_d(s) for s in c.sections.all()]


@custom_router.get('/{cid}/sections/{sid}/entries/')
def c_list_entries(request, cid: int, sid: int):
    return [_c_entry_d(e) for e in _c_section(request, cid, sid).entries.all()]


@custom_router.post('/{cid}/sections/{sid}/entries/')
def c_create_entry(request, cid: int, sid: int, data: EntryIn):
    s = _c_section(request, cid, sid)
    e = CustomResumeEntry.objects.create(section=s, data=data.data, order=data.order)
    return _c_entry_d(e)


@custom_router.patch('/{cid}/sections/{sid}/entries/{eid}/')
def c_update_entry(request, cid: int, sid: int, eid: int, data: EntryIn):
    e = _c_entry(request, sid, eid)
    e.data = data.data
    e.order = data.order
    e.save()
    return _c_entry_d(e)


@custom_router.delete('/{cid}/sections/{sid}/entries/{eid}/', response={204: None})
def c_delete_entry(request, cid: int, sid: int, eid: int):
    _c_entry(request, sid, eid).delete()
    return 204, None


@custom_router.post('/{cid}/sections/{sid}/entries/reorder/')
def c_reorder_entries(request, cid: int, sid: int, data: ReorderIn):
    s = _c_section(request, cid, sid)
    for i, eid in enumerate(data.ordered_ids):
        s.entries.filter(id=eid).update(order=i)
    return [_c_entry_d(e) for e in s.entries.all()]
