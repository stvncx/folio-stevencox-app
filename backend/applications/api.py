from datetime import date, datetime
from typing import Optional

from ninja import Router, Schema
from ninja.errors import HttpError

from applications.models import (ApplicationActivity, ApplicationContact,
                                 JobApplication)
from resumes.models import CustomResume
from services.models import AIJob

router = Router(tags=['applications'])


def _app(request, aid):
    o = JobApplication.objects.filter(id=aid, user=request.user).first()
    if o is None:
        raise HttpError(404, 'Application not found.')
    return o


def _own_custom(request, cid):
    if cid is None:
        return None
    c = CustomResume.objects.filter(id=cid, topical_resume__user=request.user).first()
    if c is None:
        raise HttpError(400, 'Custom resume not found or not yours.')
    return c


def _contact_d(c):
    return {'id': c.id, 'name': c.name, 'role': c.role, 'title': c.title,
            'email': c.email, 'phone': c.phone, 'linkedin_url': c.linkedin_url, 'notes': c.notes}


def _activity_d(a):
    return {'id': a.id, 'activity_type': a.activity_type, 'date': a.date.isoformat(),
            'title': a.title, 'notes': a.notes}


def _app_d(a, full=False):
    d = {'id': a.id, 'company_name': a.company_name, 'position_title': a.position_title,
         'status': a.status, 'job_posting': a.job_posting,
         'custom_resume_id': a.custom_resume_id,
         'applied_date': a.applied_date.isoformat() if a.applied_date else None,
         'follow_up_date': a.follow_up_date.isoformat() if a.follow_up_date else None,
         'offer_deadline': a.offer_deadline.isoformat() if a.offer_deadline else None,
         'notes': a.notes, 'cover_letter': a.cover_letter,
         'created_at': a.created_at.isoformat(), 'updated_at': a.updated_at.isoformat()}
    if full:
        d['contacts'] = [_contact_d(c) for c in a.contacts.all()]
        d['activities'] = [_activity_d(x) for x in a.activities.all()]
    return d


# --- schemas ---------------------------------------------------------------
class AppIn(Schema):
    company_name: str
    position_title: str
    job_posting: str = ''
    status: str = 'saved'
    applied_date: Optional[date] = None
    follow_up_date: Optional[date] = None
    offer_deadline: Optional[date] = None
    notes: str = ''
    custom_resume_id: Optional[int] = None


class AppPatch(Schema):
    company_name: Optional[str] = None
    position_title: Optional[str] = None
    job_posting: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[date] = None
    follow_up_date: Optional[date] = None
    offer_deadline: Optional[date] = None
    notes: Optional[str] = None
    custom_resume_id: Optional[int] = None


class CoverGenIn(Schema):
    custom_resume_id: int


class CoverSaveIn(Schema):
    cover_letter: str


class ContactIn(Schema):
    name: str
    role: str = 'other'
    title: str = ''
    email: str = ''
    phone: str = ''
    linkedin_url: str = ''
    notes: str = ''


class ActivityIn(Schema):
    activity_type: str
    date: datetime
    title: str
    notes: str = ''


# --- applications ----------------------------------------------------------
@router.get('/')
def list_apps(request):
    return [_app_d(a) for a in JobApplication.objects.filter(user=request.user)]


@router.post('/')
def create_app(request, data: AppIn):
    c = _own_custom(request, data.custom_resume_id)
    a = JobApplication.objects.create(
        user=request.user, company_name=data.company_name, position_title=data.position_title,
        job_posting=data.job_posting, status=data.status, applied_date=data.applied_date,
        follow_up_date=data.follow_up_date, offer_deadline=data.offer_deadline,
        notes=data.notes, custom_resume=c)
    return _app_d(a, full=True)


@router.get('/{aid}/')
def get_app(request, aid: int):
    return _app_d(_app(request, aid), full=True)


@router.patch('/{aid}/')
def update_app(request, aid: int, data: AppPatch):
    a = _app(request, aid)
    payload = data.dict(exclude_unset=True)
    if 'custom_resume_id' in payload:
        a.custom_resume = _own_custom(request, payload.pop('custom_resume_id'))
    for f, v in payload.items():
        setattr(a, f, v)
    a.save()
    return _app_d(a, full=True)


@router.delete('/{aid}/', response={204: None})
def delete_app(request, aid: int):
    _app(request, aid).delete()
    return 204, None


# --- cover letter ----------------------------------------------------------
@router.post('/{aid}/cover-letter/generate/')
def gen_cover(request, aid: int, data: CoverGenIn):
    _app(request, aid)
    _own_custom(request, data.custom_resume_id)
    job = AIJob.objects.create(
        user=request.user, kind=AIJob.Kind.COVER_LETTER,
        params={'application_id': aid, 'custom_resume_id': data.custom_resume_id})
    return {'job_id': job.id, 'ws': '/ws/ai/cover-letter/generate/'}


@router.patch('/{aid}/cover-letter/')
def save_cover(request, aid: int, data: CoverSaveIn):
    a = _app(request, aid)
    a.cover_letter = data.cover_letter
    a.save(update_fields=['cover_letter', 'updated_at'])
    return {'cover_letter': a.cover_letter}


# --- contacts --------------------------------------------------------------
@router.get('/{aid}/contacts/')
def list_contacts(request, aid: int):
    return [_contact_d(c) for c in _app(request, aid).contacts.all()]


@router.post('/{aid}/contacts/')
def add_contact(request, aid: int, data: ContactIn):
    c = ApplicationContact.objects.create(application=_app(request, aid), **data.dict())
    return _contact_d(c)


@router.patch('/{aid}/contacts/{cid}/')
def update_contact(request, aid: int, cid: int, data: ContactIn):
    a = _app(request, aid)
    c = a.contacts.filter(id=cid).first()
    if c is None:
        raise HttpError(404, 'Contact not found.')
    for f, v in data.dict().items():
        setattr(c, f, v)
    c.save()
    return _contact_d(c)


@router.delete('/{aid}/contacts/{cid}/', response={204: None})
def delete_contact(request, aid: int, cid: int):
    _app(request, aid).contacts.filter(id=cid).delete()
    return 204, None


# --- activities ------------------------------------------------------------
@router.get('/{aid}/activities/')
def list_activities(request, aid: int):
    return [_activity_d(x) for x in _app(request, aid).activities.all()]


@router.post('/{aid}/activities/')
def add_activity(request, aid: int, data: ActivityIn):
    a = ApplicationActivity.objects.create(application=_app(request, aid), **data.dict())
    return _activity_d(a)


@router.patch('/{aid}/activities/{actid}/')
def update_activity(request, aid: int, actid: int, data: ActivityIn):
    a = _app(request, aid)
    act = a.activities.filter(id=actid).first()
    if act is None:
        raise HttpError(404, 'Activity not found.')
    for f, v in data.dict().items():
        setattr(act, f, v)
    act.save()
    return _activity_d(act)


@router.delete('/{aid}/activities/{actid}/', response={204: None})
def delete_activity(request, aid: int, actid: int):
    _app(request, aid).activities.filter(id=actid).delete()
    return 204, None
